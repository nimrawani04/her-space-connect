import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Stage = "planning" | "trying" | "pregnant" | "not_pregnant" | "postpartum";

export type PregnancyProfile = {
  id?: string;
  stage: Stage;
  lmp_date: string | null;
  conception_date: string | null;
  due_date: string | null;
  test_result: string | null;
  test_date: string | null;
  next_appointment: string | null;
  birth_plan: string | null;
  notes: string | null;
};

const EMPTY: PregnancyProfile = {
  stage: "planning",
  lmp_date: null,
  conception_date: null,
  due_date: null,
  test_result: null,
  test_date: null,
  next_appointment: null,
  birth_plan: null,
  notes: null,
};

export function usePregnancyProfile() {
  const [profile, setProfile] = useState<PregnancyProfile>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("pregnancy_profiles").select("*").maybeSingle();
    if (data) setProfile({ ...EMPTY, ...(data as unknown as PregnancyProfile) });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: Partial<PregnancyProfile>) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sign in required");
    const next = { ...profile, ...patch };
    const { error } = await supabase
      .from("pregnancy_profiles")
      .upsert({ ...next, user_id: u.user.id }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    setProfile(next);
    return next;
  }, [profile]);

  return { profile, loading, save, reload: load };
}