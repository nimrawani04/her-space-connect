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
import { ArrowLeft, Check, Inbox, MapPin, ShieldCheck, X } from "lucide-react";
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
};

function TravelInbox() {
  const qc = useQueryClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ conn: Conn; action: "accepted" | "declined" } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["travel_inbox", meId],
    enabled: !!meId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_connections")
        .select("id,request_id,from_user,to_user,status,message,created_at")
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
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Her contact</p>
            <p className="font-medium break-words">{post.contact}</p>
          </div>
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
                      <p className="text-xs text-muted-foreground">
                        {isAccept
                          ? "Accepting will share her contact with you and yours with her. Start on a voice or video call before meeting — never share your home address."
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
    </div>
  );
}