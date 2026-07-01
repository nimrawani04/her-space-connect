import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Check, Eye, ExternalLink, Inbox, MapPin, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/travel/inbox")({
  head: () => ({ meta: [{ title: "Travel Inbox · HerSpace" }] }),
  component: TravelInbox,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-destructive">Could not load your inbox: {error.message}</p>
        <Button onClick={() => { reset(); router.invalidate(); }}>Try again</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6 text-center">No inbox found.</div>,
});

type Conn = {
  id: string;
  request_id: string;
  from_user: string;
  to_user: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  created_at: string;
  contact_type: string | null;
  contact_handle: string | null;
};

function TravelInbox() {
  const qc = useQueryClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ conn: Conn; action: "accepted" | "declined" } | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [revealConn, setRevealConn] = useState<Conn | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["travel_inbox", meId],
    enabled: !!meId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_connections")
        .select("id,request_id,from_user,to_user,status,message,created_at,contact_type,contact_handle")
        .eq("to_user", meId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conn[];
    },
  });

  const requesterIds = useMemo(
    () => Array.from(new Set((connections ?? []).map((c) => c.from_user))),
    [connections],
  );
  const requestIds = useMemo(
    () => Array.from(new Set((connections ?? []).map((c) => c.request_id))),
    [connections],
  );

  const { data: requesters } = useQuery({
    queryKey: ["profiles_by_ids", requesterIds],
    enabled: requesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,city,country")
        .in("id", requesterIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["travel_requests_by_ids", requestIds],
    enabled: requestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_requests")
        .select("id,city,country,need,contact,created_at")
        .in("id", requestIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    (requesters ?? []).forEach((p: any) => m.set(p.id, p));
    return m;
  }, [requesters]);
  const requestMap = useMemo(() => {
    const m = new Map<string, any>();
    (requests ?? []).forEach((r: any) => m.set(r.id, r));
    return m;
  }, [requests]);

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("travel_connections").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "accepted" ? "Contact shared — talk safe." : "Declined.");
      qc.invalidateQueries({ queryKey: ["travel_inbox", meId] });
      qc.invalidateQueries({ queryKey: ["travel_connections", meId] });
      setConfirming(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const all = connections ?? [];
  const pending = all.filter((c) => c.status === "pending");
  const accepted = all.filter((c) => c.status === "accepted");
  const declined = all.filter((c) => c.status === "declined");

  function initials(name?: string | null) {
    if (!name) return "S";
    return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function vettingLink(type: string | null, handle: string | null): string | null {
    if (!type || !handle) return null;
    const h = handle.trim();
    if (type === "instagram") return `https://instagram.com/${h.replace(/^@/, "")}`;
    if (type === "whatsapp" || type === "phone") return `https://wa.me/${h.replace(/[^\d+]/g, "").replace(/^\+/, "")}`;
    if (type === "telegram") return `https://t.me/${h.replace(/^@/, "")}`;
    if (type === "email") return `mailto:${h}`;
    if (/^https?:\/\//i.test(h)) return h;
    return null;
  }

  function VetBlock({ c }: { c: Conn }) {
    if (!c.contact_handle) return null;
    const link = vettingLink(c.contact_type, c.contact_handle);
    const label = (c.contact_type ?? "contact").replace(/^./, (s) => s.toUpperCase());
    return (
      <div className="rounded-md border border-dashed p-3 text-sm space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vet her before accepting</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="rounded-full">{label}</Badge>
          <span className="font-medium break-all">{c.contact_handle}</span>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-earth underline underline-offset-2">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Check that the profile looks real — actual name, photos, mutuals, posts. If it feels off, decline.</p>
      </div>
    );
  }

  function Row({ c }: { c: Conn }) {
    const who = profileMap.get(c.from_user);
    const post = requestMap.get(c.request_id);
    return (
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {who?.avatar_url && <AvatarImage src={who.avatar_url} alt="" />}
            <AvatarFallback>{initials(who?.display_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{who?.display_name ?? "A sister"}</p>
              {(who?.city || who?.country) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {[who.city, who.country].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            {post && (
              <p className="text-xs text-muted-foreground mt-1">
                On your post · {post.city}, {post.country} — <span className="italic">{post.need.length > 80 ? `${post.need.slice(0, 80)}…` : post.need}</span>
              </p>
            )}
          </div>
        </div>
        {c.message && (
          <blockquote className="text-sm border-l-2 border-earth pl-3 whitespace-pre-wrap">"{c.message}"</blockquote>
        )}
        {(c.status === "pending" || c.status === "accepted") && <VetBlock c={c} />}
        {c.status === "pending" && (
          <>
            <p className="text-xs text-muted-foreground">
              Accepting shares her contact with you and yours with her. Start on a voice or video call before meeting. Never share your home address.
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" onClick={() => setConfirming({ conn: c, action: "accepted" })} disabled={respond.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirming({ conn: c, action: "declined" })} disabled={respond.isPending}>
                <X className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
            </div>
          </>
        )}
        {c.status === "accepted" && post && (
          revealed[c.id] ? (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Contact you shared with her</p>
              <p className="font-medium break-words">{post.contact}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Talk on a call first. Never share your home address.</p>
            </div>
          ) : (
            <div className="rounded-md bg-muted/40 border border-dashed p-3 flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">Contact hidden. Reveal it only when you're ready to reach out.</p>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRevealConn(c)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Reveal contact
                </Button>
              </div>
            </div>
          )
        )}
        {c.status === "declined" && <Badge variant="outline">Declined</Badge>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">Travel Sisterhood</p>
          <h1 className="text-3xl md:text-4xl font-serif italic flex items-center gap-3">
            <Inbox className="h-7 w-7" /> Inbox
          </h1>
        </div>
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/travel"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>You're in control</AlertTitle>
        <AlertDescription>
          Every sister who wants to reach you shows up here. Accept only the ones you trust — your contact stays hidden until you do.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending {pending.length > 0 && <Badge className="ml-2" variant="secondary">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="accepted">Accepted {accepted.length > 0 && <Badge className="ml-2" variant="secondary">{accepted.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="declined">Declined {declined.length > 0 && <Badge className="ml-2" variant="secondary">{declined.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && pending.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No pending requests. When a sister asks to connect, she'll appear here.</CardContent></Card>
          )}
          {pending.map((c) => <Row key={c.id} c={c} />)}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-3 mt-4">
          {accepted.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No accepted connections yet.</CardContent></Card>
          ) : accepted.map((c) => <Row key={c.id} c={c} />)}
        </TabsContent>

        <TabsContent value="declined" className="space-y-3 mt-4">
          {declined.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No declined requests.</CardContent></Card>
          ) : declined.map((c) => <Row key={c.id} c={c} />)}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirming} onOpenChange={(o) => { if (!o) setConfirming(null); }}>
        <AlertDialogContent>
          {confirming && (() => {
            const who = profileMap.get(confirming.conn.from_user);
            const post = requestMap.get(confirming.conn.request_id);
            const isAccept = confirming.action === "accepted";
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif italic">
                    {isAccept ? "Accept this sister?" : "Decline this request?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-left">
                      <div className="flex items-start gap-3 pt-2">
                        <Avatar className="h-10 w-10">
                          {who?.avatar_url && <AvatarImage src={who.avatar_url} alt="" />}
                          <AvatarFallback>{initials(who?.display_name)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{who?.display_name ?? "A sister"}</p>
                          {(who?.city || who?.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {[who.city, who.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Sent {new Date(confirming.conn.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      {post && (
                        <div className="rounded-md bg-muted/40 p-3 text-xs">
                          <p className="uppercase tracking-wider text-muted-foreground mb-1">On your post</p>
                          <p className="font-medium text-foreground">{post.city}, {post.country}</p>
                          <p className="italic mt-1 whitespace-pre-wrap">{post.need}</p>
                        </div>
                      )}
                      {confirming.conn.message && (
                        <div className="rounded-md border-l-2 border-earth pl-3 text-sm">
                          <p className="uppercase text-xs tracking-wider text-muted-foreground mb-1">Her note</p>
                          <p className="whitespace-pre-wrap">"{confirming.conn.message}"</p>
                        </div>
                      )}
                      <VetBlock c={confirming.conn} />
                      <p className="text-xs text-muted-foreground">
                        {isAccept
                          ? "Open her handle above and check it looks like a real person before accepting. Accepting shares her full contact and yours — meet on a call first, never share your home address."
                          : "She won't be notified with a reason. You can't undo this."}
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={respond.isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      respond.mutate({ id: confirming.conn.id, status: confirming.action });
                    }}
                    disabled={respond.isPending}
                    className={isAccept ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                  >
                    {respond.isPending ? "Saving…" : isAccept ? "Yes, accept & share contact" : "Yes, decline"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revealConn} onOpenChange={(o) => { if (!o) setRevealConn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic">Reveal contact?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm">You accepted this sister. Before reaching out, remember:</p>
                <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                  <li>Start on a voice or video call — never before you've heard her voice.</li>
                  <li>Meet in a public place first. Tell a trusted person your plan.</li>
                  <li>Never share your home address, ID, or financial details.</li>
                  <li>If anything feels off, block and report immediately.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep hidden</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (revealConn) setRevealed((s) => ({ ...s, [revealConn.id]: true }));
                setRevealConn(null);
              }}
            >
              I understand — reveal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}