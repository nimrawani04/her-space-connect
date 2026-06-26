import { supabase } from "@/integrations/supabase/client";

export async function getAvatarSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export function initials(name: string | null | undefined) {
  if (!name) return "🌸";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}