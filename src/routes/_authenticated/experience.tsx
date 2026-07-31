import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip, Send, Trash2, X, FileText, Download, Eye, ExternalLink, SmilePlus } from "lucide-react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2 } from "lucide-react";
import { scanAttachment } from "@/lib/attachment-scan.functions";

export const Route = createFileRoute("/_authenticated/experience")({
  head: () => ({ meta: [{ title: "Experience Match · HerSpace" }] }),
  component: Experience,
});

const PAGE_SIZE = 12;
const MAX_FILE_MB = 20;
const REACTIONS = ["❤️", "🫂", "🙏", "💪", "😢", "✨"] as const;
const BLOCKED_CLIENT_EXTENSIONS = new Set([
  "exe", "dll", "scr", "com", "bat", "cmd", "msi", "ps1", "vbs", "js", "mjs", "jar", "apk", "sh", "bin", "app",
]);
const URL_RE = /(https?:\/\/[^\s<>"')]+)/gi;

type Msg = {
  id: string;
  body: string | null;
  author_id: string;
  is_anonymous: boolean;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  scan_status: string;
  scan_detail: string | null;
};

function prettySize(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type ScanState = "pending" | "scanning" | "clean" | "quarantined" | "error";

function scanState(msg: Msg, scanning: boolean): ScanState {
  if (scanning) return "scanning";
  if (msg.scan_status === "pending") return "pending";
  if (msg.scan_status === "clean") return "clean";
  if (msg.scan_status === "infected") return "quarantined";
  return "error";
}

const SCAN_LABEL: Record<ScanState, string> = {
  pending: "Pending scan",
  scanning: "Scanning…",
  clean: "Cleared",
  quarantined: "Quarantined",
  error: "Not verified",
};

function ScanIndicator({ state, detail }: { state: ScanState; detail?: string | null }) {
  const tone =
    state === "clean"
      ? "border-earth/40 bg-earth/10 text-earth"
      : state === "quarantined"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted/50 text-muted-foreground";
  const Icon =
    state === "clean" ? ShieldCheck : state === "quarantined" ? ShieldAlert : state === "error" ? ShieldQuestion : Loader2;
  const spin = state === "scanning" || state === "pending";
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
      role="status"
      aria-live="polite"
      title={detail ?? SCAN_LABEL[state]}
    >
      <Icon className={`h-3 w-3 shrink-0 ${spin ? "animate-spin motion-reduce:animate-none" : ""}`} />
      {SCAN_LABEL[state]}
    </span>
  );
}

function ConfirmOpen({
  target,
  onCancel,
  onConfirm,
}: {
  target: { kind: "file" | "link"; label: string; sub?: string };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif italic text-xl">
            {target.kind === "file" ? "Download this file?" : "Open this link?"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {target.kind === "file"
            ? "Nothing downloads automatically. This file passed our scan, but open it only if you trust the sender."
            : "This link was shared by another member and leads outside HerSpace. Open it only if you trust the sender."}
        </p>
        <div className="rounded-lg border border-border px-3 py-2 text-sm break-all">
          <p className="font-medium">{target.label}</p>
          {target.sub && <p className="text-xs text-muted-foreground">{target.sub}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
          <Button className="rounded-full" onClick={onConfirm}>
            {target.kind === "file" ? "Download" : "Open link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageBody({ body }: { body: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const parts = body.split(URL_RE);
  return (
    <>
      <p className="text-sm whitespace-pre-wrap break-words">
        {parts.map((part, i) =>
          URL_RE.test(part) && /^https?:\/\//i.test(part) ? (
            <button
              key={i}
              type="button"
              onClick={() => setPending(part)}
              className="inline-flex items-center gap-1 underline underline-offset-2 text-earth hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring rounded break-all"
            >
              {part}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </button>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
      {pending && (
        <ConfirmOpen
          target={{ kind: "link", label: pending, sub: "External website" }}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            window.open(pending, "_blank", "noopener,noreferrer");
            setPending(null);
          }}
        />
      )}
    </>
  );
}

function Attachment({ msg, scanning }: { msg: Msg; scanning: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["circle-file", msg.attachment_path],
    enabled: !!msg.attachment_path && msg.scan_status === "clean",
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("circle-files")
        .createSignedUrl(msg.attachment_path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const isImage = (msg.attachment_type ?? "").startsWith("image/");
  if (!msg.attachment_path) return null;
  const state = scanState(msg, scanning);
  if (state === "pending" || state === "scanning") {
    return (
      <div className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
        <p className="truncate">“{msg.attachment_name}”</p>
        <ScanIndicator state={state} />
      </div>
    );
  }
  if (state !== "clean") {
    return (
      <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <span>{msg.scan_detail ?? "This file could not be verified and is hidden."}</span>
        <ScanIndicator state={state} detail={msg.scan_detail} />
      </div>
    );
  }
  return (
    <div className="mt-2">
      {isImage &&
        (url ? (
          <img
            src={url}
            alt={msg.attachment_name ?? "Shared image"}
            loading="lazy"
            className="max-h-64 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="h-24 w-40 rounded-lg bg-muted/60 animate-pulse motion-reduce:animate-none" />
        ))}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FileText className="h-4 w-4 shrink-0 text-earth" />
        <span className="truncate max-w-[14rem]">{msg.attachment_name}</span>
        <span className="text-xs text-muted-foreground">{prettySize(msg.attachment_size)}</span>
        <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
      </button>
      <ScanIndicator state="clean" />
      {confirming && (
        <ConfirmOpen
          target={{ kind: "file", label: msg.attachment_name ?? "file", sub: prettySize(msg.attachment_size) }}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            if (url) window.open(url, "_blank", "noopener,noreferrer");
            setConfirming(false);
          }}
        />
      )}
    </div>
  );
}

function CircleChat({ journey, userId, onClose }: { journey: { id: string; title: string }; userId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [anon, setAnon] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["journey-messages", journey.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_messages")
        .select("id,body,author_id,is_anonymous,created_at,attachment_path,attachment_name,attachment_type,attachment_size,scan_status,scan_detail")
        .eq("journey_id", journey.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`journey-${journey.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "journey_messages", filter: `journey_id=eq.${journey.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["journey-messages", journey.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [journey.id, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      const body = text.trim();
      if (!body && !file) throw new Error("Write something or attach a file");
      let attachment: Partial<Msg> = {};
      if (file) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Files must be under ${MAX_FILE_MB} MB`);
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${journey.id}/${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("circle-files").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) throw upErr;
        attachment = {
          attachment_path: path,
          attachment_name: file.name,
          attachment_type: file.type || "application/octet-stream",
          attachment_size: file.size,
        };
      }
      const { data: inserted, error } = await supabase
        .from("journey_messages")
        .insert({
          journey_id: journey.id,
          author_id: userId,
          body: body || null,
          is_anonymous: anon,
          scan_status: file ? "pending" : "clean",
          ...attachment,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (file && inserted) {
        const result = await scanAttachment({ data: { messageId: inserted.id } });
        if (result.status === "infected") {
          throw new Error(`Blocked and quarantined: ${result.reason}`);
        }
      }
    },
    onSuccess: () => {
      setText(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["journey-messages", journey.id] });
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["journey-messages", journey.id] });
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (m: Msg) => {
      if (m.attachment_path) await supabase.storage.from("circle-files").remove([m.attachment_path]);
      const { error } = await supabase.from("journey_messages").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey-messages", journey.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="font-serif italic text-xl">{journey.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">Anonymous by default · shared files stay inside this circle</p>
        </DialogHeader>
        <div className="h-[55vh] overflow-y-auto px-5 py-4 space-y-4" aria-live="polite" aria-busy={isLoading}>
          {isLoading && <p className="text-sm text-muted-foreground">Loading conversation…</p>}
          {!isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No one has spoken yet. Start the conversation.</p>
          )}
          {messages.map((m) => {
            const mine = m.author_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "bg-primary/10" : "bg-muted/50"}`}>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-earth mb-1">
                    {m.is_anonymous ? "Anonymous sister" : mine ? "You" : "A sister"}
                  </p>
                  {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                  <Attachment msg={m} />
                  {mine && (
                    <button
                      onClick={() => remove.mutate(m)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-border p-4 space-y-2">
          {file && (
            <div className="flex items-center gap-2 text-xs rounded-lg border border-border px-3 py-2">
              <FileText className="h-3.5 w-3.5 text-earth" />
              <span className="truncate">{file.name}</span>
              <span className="text-muted-foreground">{prettySize(file.size)}</span>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="ml-auto" aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            />
            <Button type="button" variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => fileRef.current?.click()} aria-label="Attach a file">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share a thought…"
              rows={1}
              className="min-h-10 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); }
              }}
            />
            <Button onClick={() => send.mutate()} disabled={send.isPending} className="rounded-full shrink-0" aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-primary" />
            Post anonymously
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Experience() {
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [openCircle, setOpenCircle] = useState<{ id: string; title: string } | null>(null);
  const qc = useQueryClient();

  const { data: userId } = useQuery({
    queryKey: ["uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["journeys", userId],
    initialPageParam: 0,
    enabled: userId !== undefined,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("journeys")
        .select("id,title,tags,journey_members(user_id)")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []).map((j: any) => ({
        id: j.id,
        title: j.title,
        tags: j.tags as string[],
        count: j.journey_members?.length ?? 0,
        joined: !!j.journey_members?.some((m: any) => m.user_id === userId),
      }));
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });
  const journeys = data?.pages.flat() ?? [];

  const toggleJoin = useMutation({
    mutationFn: async (j: { id: string; joined: boolean }) => {
      if (!userId) throw new Error("Sign in required");
      if (j.joined) {
        const { error } = await supabase.from("journey_members").delete().eq("journey_id", j.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journey_members").insert({ journey_id: j.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const addJourney = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      const t = title.trim();
      if (!t) throw new Error("Title required");
      const parsedTags = tags.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("journeys").insert({ title: t, tags: parsedTags, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setTags("");
      qc.invalidateQueries({ queryKey: ["journeys"] });
      toast.success("Journey added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = journeys.filter((j) => j.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">03 · Match</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Experience Match</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Find women who've lived what you're living. Request a conversation, or join the circle around a shared journey.</p>
      </header>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search a journey…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-lg">Start a new journey circle</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Journey title" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="max-w-xs" />
          <Button onClick={() => addJourney.mutate()} disabled={addJourney.isPending} className="rounded-full">Add</Button>
        </CardContent>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((j) => (
          <Card key={j.id}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{j.title}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">{j.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                <p className="text-xs text-muted-foreground">{j.count.toLocaleString()} sisters</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {j.joined && (
                  <Button variant="default" className="rounded-full" onClick={() => setOpenCircle({ id: j.id, title: j.title })}>
                    Open circle
                  </Button>
                )}
                <Button variant={j.joined ? "outline" : "default"} className="rounded-full" onClick={() => toggleJoin.mutate({ id: j.id, joined: j.joined })} disabled={toggleJoin.isPending}>
                  {j.joined ? "Leave" : "Join circle"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
      {openCircle && <CircleChat journey={openCircle} userId={userId ?? null} onClose={() => setOpenCircle(null)} />}
    </div>
  );
}