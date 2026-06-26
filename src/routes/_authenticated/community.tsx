import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Safe Space · HerSpace" }] }),
  component: Community,
});

const CATEGORIES = ["Health", "Relationships", "Career", "Family", "Mental Health", "Education", "Marriage", "Sexual Health"] as const;
type Post = { id: string; category: string; title: string; body: string; is_anonymous: boolean; author_id: string; created_at: string; like_count: number };

function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("Health");
  const [anon, setAnon] = useState(true);
  const [loading, setLoading] = useState(false);

  async function load() {
    let q = supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("category", filter);
    const { data } = await q;
    setPosts((data as Post[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) { toast.error("Add a title and a fuller post."); return; }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setLoading(false); return; }
    const { error } = await supabase.from("community_posts").insert({
      author_id: u.user.id, category, title: title.trim(), body: body.trim(), is_anonymous: anon,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setBody(""); toast.success("Shared.");
    load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">02 · Sisterhood</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Safe Space</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">A women-only space for honest conversation. Posts can be anonymous or under your name. Be kind. We moderate for harassment and toxicity.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 self-start">
          <CardHeader><CardTitle className="font-serif italic">Share something</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
              <div><Label>Your post</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} /></div>
              <div className="flex items-center justify-between">
                <Label htmlFor="anon" className="text-sm">Post anonymously</Label>
                <Switch id="anon" checked={anon} onCheckedChange={setAnon} />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">Share</Button>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="rounded-full" onClick={() => setFilter("all")}>All</Button>
            {CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(c)}>{c}</Button>
            ))}
          </div>
          {posts.length === 0 && <Card><CardContent className="p-8 text-muted-foreground text-center">No posts yet. Be the first to share.</CardContent></Card>}
          {posts.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{p.category}</Badge>
                  <span>{p.is_anonymous ? "Anonymous sister" : "Member"}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <CardTitle className="font-serif italic text-xl mt-2">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}