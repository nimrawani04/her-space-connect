import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingBag, Sparkles, Tag, DollarSign, User, Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace · HerSpace" }] }),
  component: Marketplace,
});

const PAGE_SIZE = 12;

function Marketplace() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ provider_name: "", craft: "", price: "", tags: "" });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["service_listings"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("service_listings")
        .select("id,provider_name,craft,price,tags")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });
  const services = data?.pages.flat() ?? [];

  const addListing = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Sign in required");
      if (!form.craft.trim() || !form.provider_name.trim() || !form.price.trim()) {
        throw new Error("Name, craft and price required");
      }
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("service_listings").insert({
        user_id: uid,
        provider_name: form.provider_name.trim(),
        craft: form.craft.trim(),
        price: form.price.trim(),
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ provider_name: "", craft: "", price: "", tags: "" });
      qc.invalidateQueries({ queryKey: ["service_listings"] });
      toast.success("Your craft listing is now live");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Frosted Sanctuary Header Card */}
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            06 · Sisterhood Trade & Services
          </p>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
          Women&apos;s Marketplace
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          Hire women — designers, developers, tutors, bakers, consultants, and writers.
          Verified profiles, fair independent rates, and sisterhood reviews you can trust.
        </p>
      </header>

      {/* List Your Service Card */}
      <Card className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="font-serif italic text-xl text-foreground">
                Offer your craft to the community
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share what you offer with women looking to hire independently.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Your name or alias
              </Label>
              <Input
                placeholder="e.g. Maya Lin"
                value={form.provider_name}
                onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> What you do
              </Label>
              <Input
                placeholder="e.g. Brand Designer"
                value={form.craft}
                onChange={(e) => setForm({ ...form, craft: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" /> Price / Rate
              </Label>
              <Input
                placeholder="e.g. $60/hr or $250 flat"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" /> Tags (comma-separated)
              </Label>
              <Input
                placeholder="e.g. Figma, Branding, Remote"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => addListing.mutate()}
              disabled={addListing.isPending}
              className="rounded-full px-6 bg-primary text-primary-foreground hover:brightness-105 font-medium transition-all shadow-sm w-full sm:w-auto"
            >
              {addListing.isPending ? "Publishing…" : "List my craft"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif italic text-2xl text-foreground">Available Services</h2>
          <span className="text-xs text-muted-foreground font-mono">
            {services.length} listing{services.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl bg-card/60 border border-border/60 animate-pulse p-6"
              />
            ))}
          </div>
        )}

        {!isLoading && services.length === 0 && (
          <div className="rounded-3xl bg-card/85 border border-border/80 p-10 text-center backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif italic text-xl text-foreground">No listings yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Be the first woman to offer your services here. Your sisters are waiting to hire and support you.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <Card
              key={s.id}
              className="rounded-3xl bg-card/90 border border-border/80 hover:border-primary/40 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-serif italic text-xl text-foreground leading-snug">
                      {s.craft}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">by {s.provider_name}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary shrink-0">
                    {s.price}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                  {(s.tags as string[])?.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="rounded-full text-[11px] bg-secondary/50 text-foreground border-border/70"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Verified Sister
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-xs"
                    onClick={() => toast.info(`Connecting you with ${s.provider_name}...`)}
                  >
                    Connect <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              className="rounded-full px-8 hover:bg-primary/10 hover:text-primary"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading more…" : "Load more listings"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}