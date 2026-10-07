import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LifeStagePreferences {
  teen_period: boolean;
  perimenopause: boolean;
  pregnancy: boolean;
}

export const DEFAULT_LIFE_STAGES: LifeStagePreferences = {
  teen_period: false,
  perimenopause: false,
  pregnancy: false,
};

const STORAGE_KEY = "herspace_life_stages";
const EVENT_KEY = "herspace:lifestages-changed";

function getStoredPreferences(): LifeStagePreferences {
  if (typeof window === "undefined") return DEFAULT_LIFE_STAGES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        teen_period: Boolean(parsed.teen_period),
        perimenopause: Boolean(parsed.perimenopause),
        pregnancy: Boolean(parsed.pregnancy),
      };
    }
  } catch (e) {
    console.warn("Failed to parse stored life stage preferences:", e);
  }
  return DEFAULT_LIFE_STAGES;
}

function persistPreferences(next: LifeStagePreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: next }));
  } catch (e) {
    console.warn("Failed to write life stage preferences to localStorage:", e);
  }
}

export function useLifeStagePreferences() {
  const [preferences, setPreferences] = useState<LifeStagePreferences>(getStoredPreferences);
  const [loading, setLoading] = useState(true);

  // Sync with Supabase user metadata if available
  useEffect(() => {
    let mounted = true;

    async function syncFromCloud() {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user || !mounted) return;

        const cloudStages = u.user.user_metadata?.life_stages;
        if (cloudStages && typeof cloudStages === "object") {
          const merged: LifeStagePreferences = {
            teen_period: Boolean(cloudStages.teen_period),
            perimenopause: Boolean(cloudStages.perimenopause),
            pregnancy: Boolean(cloudStages.pregnancy),
          };
          setPreferences(merged);
          persistPreferences(merged);
        }
      } catch (err) {
        console.warn("Error syncing life stages from cloud:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    syncFromCloud();

    // Listen for local changes across components and browser tabs
    const handleLocalChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        setPreferences(e.detail);
      } else {
        setPreferences(getStoredPreferences());
      }
    };

    window.addEventListener(EVENT_KEY, handleLocalChange);
    window.addEventListener("storage", handleLocalChange);

    return () => {
      mounted = false;
      window.removeEventListener(EVENT_KEY, handleLocalChange);
      window.removeEventListener("storage", handleLocalChange);
    };
  }, []);

  const updatePreferences = useCallback(
    async (patch: Partial<LifeStagePreferences>) => {
      const current = getStoredPreferences();
      const next: LifeStagePreferences = { ...current, ...patch };

      setPreferences(next);
      persistPreferences(next);

      // Persist to user metadata asynchronously if logged in
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user) {
          await supabase.auth.updateUser({
            data: {
              ...u.user.user_metadata,
              life_stages: next,
            },
          });
        }
      } catch (err) {
        console.warn("Error updating cloud life stage preferences:", err);
      }

      return next;
    },
    [],
  );

  const setPreference = useCallback(
    (key: keyof LifeStagePreferences, value: boolean) => {
      return updatePreferences({ [key]: value });
    },
    [updatePreferences],
  );

  return {
    preferences,
    updatePreferences,
    setPreference,
    loading,
  };
}
