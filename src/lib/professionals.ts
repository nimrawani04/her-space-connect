import { supabase } from "@/integrations/supabase/client";

export type Professional = {
  id: string;
  user_id?: string;
  name: string;
  headline: string;
  bio: string | null;
  expertise: string[];
  hourly_rate: number | null;
  location: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  category: string;
  created_at?: string;
};

export const PROFESSIONAL_CATEGORIES = [
  "All",
  "Health & Medicine",
  "Legal & Advocacy",
  "Tech & AI",
  "Therapy & Wellness",
  "Education & Tutoring",
  "Design & Creative",
  "Business & Finance",
] as const;

export function categorizeProfessional(headline: string, expertise: string[] = []): string {
  const text = `${headline} ${expertise.join(" ")}`.toLowerCase();
  if (
    text.includes("doctor") ||
    text.includes("md") ||
    text.includes("health") ||
    text.includes("hormone") ||
    text.includes("fertility") ||
    text.includes("medical") ||
    text.includes("obgyn") ||
    text.includes("clinic")
  ) {
    return "Health & Medicine";
  }
  if (
    text.includes("law") ||
    text.includes("attorney") ||
    text.includes("legal") ||
    text.includes("contract") ||
    text.includes("rights") ||
    text.includes("advocacy")
  ) {
    return "Legal & Advocacy";
  }
  if (
    text.includes("ai") ||
    text.includes("developer") ||
    text.includes("engineer") ||
    text.includes("machine learning") ||
    text.includes("code") ||
    text.includes("tech") ||
    text.includes("python") ||
    text.includes("data science")
  ) {
    return "Tech & AI";
  }
  if (
    text.includes("therap") ||
    text.includes("mental") ||
    text.includes("somatic") ||
    text.includes("psych") ||
    text.includes("counsel") ||
    text.includes("mindful") ||
    text.includes("burnout")
  ) {
    return "Therapy & Wellness";
  }
  if (
    text.includes("tutor") ||
    text.includes("teach") ||
    text.includes("educat") ||
    text.includes("academic") ||
    text.includes("professor") ||
    text.includes("curriculum") ||
    text.includes("intern") ||
    text.includes("student")
  ) {
    return "Education & Tutoring";
  }
  if (
    text.includes("design") ||
    text.includes("ux") ||
    text.includes("brand") ||
    text.includes("figma") ||
    text.includes("art") ||
    text.includes("writer") ||
    text.includes("content")
  ) {
    return "Design & Creative";
  }
  if (
    text.includes("finance") ||
    text.includes("founder") ||
    text.includes("product") ||
    text.includes("business") ||
    text.includes("invest") ||
    text.includes("market") ||
    text.includes("startup") ||
    text.includes("pm")
  ) {
    return "Business & Finance";
  }
  return "Tech & AI";
}

const LOCAL_STORAGE_KEY = "herspace_user_mentors";
const MY_LISTING_IDS_KEY = "herspace_my_mentor_ids";

function getLocalMentors(): Professional[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMentors(list: Professional[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("herspace_mentors_changed"));
  } catch {}
}

export function getMyListingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MY_LISTING_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addMyListingId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getMyListingIds();
    if (!current.includes(id)) {
      localStorage.setItem(MY_LISTING_IDS_KEY, JSON.stringify([...current, id]));
    }
  } catch {}
}

export function isMyProfessional(pro: Professional, currentUserId: string | null): boolean {
  if (currentUserId && pro.user_id === currentUserId) return true;
  const myIds = getMyListingIds();
  if (myIds.includes(pro.id)) return true;
  if (pro.user_id && myIds.includes(pro.user_id)) return true;
  return false;
}

export async function fetchAllProfessionals(): Promise<Professional[]> {
  const result: Professional[] = [];
  const seenUserIds = new Set<string>();
  const seenIds = new Set<string>();

  // 1. Fetch from Supabase mentors table (real-time data)
  try {
    const { data: mentorsData, error: mErr } = await supabase
      .from("mentors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!mErr && mentorsData && mentorsData.length > 0) {
      const userIds = mentorsData.map((m: any) => m.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, city, country, avatar_url, is_verified")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = Object.fromEntries(profilesData.map((p: any) => [p.id, p]));
        }
      }

      for (const m of mentorsData as any[]) {
        const prof = profilesMap[m.user_id];
        const name = prof?.display_name || "Sister Mentor";
        const location = prof?.city
          ? prof.country
            ? `${prof.city}, ${prof.country}`
            : prof.city
          : "Remote";
        const cat = categorizeProfessional(m.headline || "", m.expertise || []);

        result.push({
          id: m.id,
          user_id: m.user_id,
          name,
          headline: m.headline,
          bio: m.bio,
          expertise: Array.isArray(m.expertise) ? m.expertise : [],
          hourly_rate: m.hourly_rate ?? null,
          location,
          avatar_url: prof?.avatar_url ?? null,
          is_verified: Boolean(prof?.is_verified),
          category: cat,
          created_at: m.created_at,
        });
        seenIds.add(m.id);
        if (m.user_id) seenUserIds.add(m.user_id);
      }
    }
  } catch (err) {
    console.warn("Could not load remote mentors:", err);
  }

  // 2. Also incorporate service_listings (former marketplace) so existing real entries stay available
  try {
    const { data: svcData, error: sErr } = await supabase
      .from("service_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!sErr && svcData) {
      for (const s of svcData as any[]) {
        if (s.user_id && seenUserIds.has(s.user_id)) continue;
        if (seenIds.has(s.id)) continue;

        const numericRate = s.price ? parseInt(s.price.replace(/[^\d]/g, ""), 10) : null;
        const tags = Array.isArray(s.tags) ? s.tags : [];
        const locationTag =
          tags.find((t: string) => /remote|york|london|sf|berlin|paris|tokyo|toronto/i.test(t)) ||
          "Remote";
        const cat = categorizeProfessional(s.craft || "", tags);

        result.push({
          id: s.id,
          user_id: s.user_id,
          name: s.provider_name || "Sister Craft",
          headline: s.craft,
          bio: `Services offered: ${s.craft}. Price: ${s.price}.`,
          expertise: tags.filter((t: string) => t !== locationTag),
          hourly_rate: Number.isFinite(numericRate) ? numericRate : null,
          location: locationTag,
          category: cat,
          created_at: s.created_at,
        });
        seenIds.add(s.id);
        if (s.user_id) seenUserIds.add(s.user_id);
      }
    }
  } catch {}

  // 3. Merge locally created mentors (for offline or instantaneous display)
  const local = getLocalMentors();
  for (const l of local) {
    if (!seenIds.has(l.id) && (!l.user_id || !seenUserIds.has(l.user_id))) {
      result.unshift(l);
      seenIds.add(l.id);
      if (l.user_id) seenUserIds.add(l.user_id);
    }
  }

  // NOTE: Zero hardcoded seed data. Only real, user-created or database records!
  return result;
}

export async function saveMentorProfile(input: {
  name: string;
  headline: string;
  expertise: string;
  hourly_rate: string;
  location: string;
  bio: string;
}): Promise<Professional> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id || `demo-user-${Date.now()}`;
  const expertiseList = input.expertise
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const rateNum = input.hourly_rate.trim()
    ? Number(input.hourly_rate.replace(/[^\d]/g, ""))
    : null;
  const loc = input.location.trim() || "Remote";
  const cat = categorizeProfessional(input.headline, expertiseList);

  const newProf: Professional = {
    id: `mentor-${Date.now()}`,
    user_id: userId,
    name: input.name.trim(),
    headline: input.headline.trim(),
    bio: input.bio.trim() || null,
    expertise: expertiseList,
    hourly_rate: rateNum,
    location: loc,
    is_verified: true,
    category: cat,
    created_at: new Date().toISOString(),
  };

  // If authenticated user is present in Supabase, update database tables
  if (u.user) {
    try {
      // 1. Update profiles table with display name and location (city)
      await supabase.from("profiles").upsert(
        {
          id: u.user.id,
          display_name: input.name.trim(),
          city: loc,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {}

    try {
      // 2. Upsert mentors table
      const { data: insertedMentor } = await supabase
        .from("mentors")
        .upsert(
          {
            user_id: u.user.id,
            headline: input.headline.trim(),
            bio: input.bio.trim() || null,
            expertise: expertiseList,
            hourly_rate: rateNum,
            is_available: true,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (insertedMentor?.id) {
        newProf.id = insertedMentor.id;
      }
    } catch {}

    try {
      // 3. Upsert service_listings table to keep marketplace data unified
      await supabase.from("service_listings").insert({
        user_id: u.user.id,
        provider_name: input.name.trim(),
        craft: input.headline.trim(),
        price: rateNum ? `$${rateNum}/hr` : "Free intro",
        tags: [...expertiseList, loc],
      });
    } catch {}
  }

  // Record ownership ID so the user can delete it
  addMyListingId(newProf.id);
  if (newProf.user_id) addMyListingId(newProf.user_id);

  // Save to local storage for immediate visibility and persistence
  const current = getLocalMentors();
  saveLocalMentors([newProf, ...current.filter((c) => c.id !== newProf.id)]);

  return newProf;
}

export async function deleteMentorProfile(
  id: string,
  userId?: string
): Promise<void> {
  // 1. Delete from Supabase if authenticated
  try {
    if (userId) {
      await supabase.from("mentors").delete().eq("user_id", userId);
      await supabase.from("service_listings").delete().eq("user_id", userId);
    }
    await supabase.from("mentors").delete().eq("id", id);
    await supabase.from("service_listings").delete().eq("id", id);
  } catch (err) {
    console.warn("Error deleting remote mentor:", err);
  }

  // 2. Delete from local storage
  const current = getLocalMentors();
  const updated = current.filter((c) => c.id !== id && (!userId || c.user_id !== userId));
  saveLocalMentors(updated);

  // 3. Notify all listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("herspace_mentors_changed"));
  }
}

export function subscribeToProfessionals(onChange: () => void) {
  // 1. Subscribe to Supabase Realtime channel
  const channel = supabase
    .channel("realtime-mentors-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mentors" },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "service_listings" },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      () => {
        onChange();
      }
    )
    .subscribe();

  // 2. Local window event listener (for immediate cross-component sync)
  const localListener = () => onChange();
  if (typeof window !== "undefined") {
    window.addEventListener("herspace_mentors_changed", localListener);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== "undefined") {
      window.removeEventListener("herspace_mentors_changed", localListener);
    }
  };
}
