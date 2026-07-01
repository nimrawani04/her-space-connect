import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · HerSpace" }] }),
  component: Library,
});

function Library() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["library_articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_articles")
        .select("id,title,topic,read_minutes,summary")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">10 · Library</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Library & Stories</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Expert-reviewed health articles, women's research, and lived-experience stories — written by us, for us.</p>
      </header>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && articles.length === 0 && <p className="text-sm text-muted-foreground">No articles yet.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a) => (
          <Card key={a.id} className="hover:ring-2 hover:ring-earth/40 transition-all cursor-pointer">
            <CardHeader>
              <Badge variant="outline" className="w-fit">{a.topic}</Badge>
              <CardTitle className="font-serif italic text-xl mt-2">{a.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {a.summary && <p className="text-sm text-muted-foreground line-clamp-3">{a.summary}</p>}
              <p className="text-xs text-muted-foreground">{a.read_minutes} min read</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}