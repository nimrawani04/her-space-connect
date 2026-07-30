import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_SCAN_BYTES = 25 * 1024 * 1024;

export const scanAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string }) => {
    if (!input?.messageId || typeof input.messageId !== "string") {
      throw new Error("messageId is required");
    }
    return { messageId: input.messageId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: msg, error } = await supabase
      .from("journey_messages")
      .select("id,journey_id,author_id,attachment_path,attachment_name,attachment_type,attachment_size")
      .eq("id", data.messageId)
      .maybeSingle();
    if (error) throw error;
    if (!msg) throw new Error("Message not found");
    if (msg.author_id !== userId) throw new Error("Forbidden");
    if (!msg.attachment_path) return { status: "clean" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scanBytes } = await import("./malware-scan.server");

    const download = await supabaseAdmin.storage.from("circle-files").download(msg.attachment_path);
    if (download.error || !download.data) {
      await supabaseAdmin
        .from("journey_messages")
        .update({ scan_status: "error", scan_detail: "Could not read the file for scanning", scanned_at: new Date().toISOString() })
        .eq("id", msg.id);
      return { status: "error" as const, reason: "Could not read the file for scanning" };
    }

    const buf = new Uint8Array(await download.data.arrayBuffer());
    if (buf.byteLength > MAX_SCAN_BYTES) {
      await supabaseAdmin
        .from("journey_messages")
        .update({ scan_status: "error", scan_detail: "File too large to scan", scanned_at: new Date().toISOString() })
        .eq("id", msg.id);
      return { status: "error" as const, reason: "File too large to scan" };
    }

    const verdict = scanBytes(buf, msg.attachment_name ?? "file", msg.attachment_type ?? null);

    if (verdict.status === "infected") {
      // Quarantine: remove the object, log it, and drop the message from the circle.
      await supabaseAdmin.storage.from("circle-files").remove([msg.attachment_path]);
      await supabaseAdmin.from("quarantined_files").insert({
        journey_id: msg.journey_id,
        uploader_id: msg.author_id,
        file_name: msg.attachment_name ?? "file",
        file_type: msg.attachment_type,
        file_size: msg.attachment_size,
        reason: verdict.reason,
      });
      await supabaseAdmin.from("journey_messages").delete().eq("id", msg.id);
      return { status: "infected" as const, reason: verdict.reason };
    }

    await supabaseAdmin
      .from("journey_messages")
      .update({ scan_status: "clean", scan_detail: null, scanned_at: new Date().toISOString() })
      .eq("id", msg.id);
    return { status: "clean" as const };
  });