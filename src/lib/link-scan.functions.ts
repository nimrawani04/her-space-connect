import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const scanLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => {
    if (!input?.url || typeof input.url !== "string" || input.url.length > 2048) {
      throw new Error("A url is required");
    }
    return { url: input.url };
  })
  .handler(async ({ data }) => {
    const { scanUrl } = await import("./link-scan.server");
    return scanUrl(data.url);
  });
