import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { KNOWLEDGE_HUB, MEDICAL_DISCLAIMER } from "@/lib/pregnancy";

export function KnowledgeHub() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const term = q.trim().toLowerCase();

  const sections = KNOWLEDGE_HUB
    .filter((s) => !cat || s.category === cat)
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !term || i.title.toLowerCase().includes(term) || i.body.toLowerCase().includes(term)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif italic text-2xl">Knowledge hub</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Input placeholder="Search topics — iron, preeclampsia, breastfeeding…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Badge variant={cat === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setCat(null)}>All</Badge>
          {KNOWLEDGE_HUB.map((s) => (
            <Badge key={s.category} variant={cat === s.category ? "default" : "outline"} className="cursor-pointer" onClick={() => setCat(s.category)}>
              {s.emoji} {s.category}
            </Badge>
          ))}
        </div>
        {sections.length === 0 && <p className="text-sm text-muted-foreground">No topics match "{q}".</p>}
        {sections.map((s) => (
          <div key={s.category}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{s.emoji} {s.category}</p>
            <Accordion type="single" collapsible>
              {s.items.map((i) => (
                <AccordionItem key={i.title} value={`${s.category}-${i.title}`}>
                  <AccordionTrigger className="text-left">{i.title}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{i.body}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}