import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · HerSpace" }] }),
  component: Library,
});

const articles = [
  { title: "Understanding PCOS: a beginner's guide", topic: "PCOS", read: "8 min" },
  { title: "Endometriosis is not 'just a bad period'", topic: "Endometriosis", read: "11 min" },
  { title: "What perimenopause actually feels like", topic: "Menopause", read: "9 min" },
  { title: "Strength training across the cycle", topic: "Fitness", read: "7 min" },
  { title: "Breast self-exam, step by step", topic: "Breast health", read: "5 min" },
  { title: "Iron, ferritin, and why women run low", topic: "Nutrition", read: "6 min" },
];

function Library() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">10 · Library</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Library & Stories</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Expert-reviewed health articles, women's research, and lived-experience stories — written by us, for us.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a) => (
          <Card key={a.title} className="hover:ring-2 hover:ring-earth/40 transition-all cursor-pointer">
            <CardHeader>
              <Badge variant="outline" className="w-fit">{a.topic}</Badge>
              <CardTitle className="font-serif italic text-xl mt-2">{a.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{a.read}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}