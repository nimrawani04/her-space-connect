import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
const SafetyMap = lazy(() => import("@/components/safety/SafetyMap"));
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldAlert,
  MapPin,
  Search,
  Globe,
  ShieldCheck,
  Check,
  Send,
  Sparkles,
  X,
  ArrowRight,
  DollarSign,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  fetchAllProfessionals,
  deleteMentorProfile,
  subscribeToProfessionals,
  isMyProfessional,
  Professional,
  PROFESSIONAL_CATEGORIES,
} from "@/lib/professionals";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({ meta: [
    { title: "Safety Network · HerSpace" },
    { name: "description", content: "Community safety map built from women's anonymous reports, plus safe places and alerts." },
    { property: "og:title", content: "Safety Network · HerSpace" },
    { property: "og:description", content: "See community safety patterns, not individual accusations." },
  ] }),
  component: Safety,
});

type Place = { id: string; name: string; place_type: string; city: string; country: string; safety_score: number; women_friendly_score: number; review_count: number; notes: string | null };
type Alert = { id: string; alert_type: string; city: string; country: string; location: string | null; description: string; severity: string; is_verified: boolean; created_at: string };

function Safety() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Community Safety Network</p>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">Safety Network</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          Safe havens, reviews by women for women, and community alerts. Your peace of mind matters everywhere.
        </p>
      </header>

      <Tabs defaultValue="map" className="space-y-6">
        <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
          <TabsList className="flex h-auto p-1.5 gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-full w-max min-w-full sm:min-w-0">
            <TabsTrigger value="map" className="rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Community Safety Map</TabsTrigger>
            <TabsTrigger value="places" className="rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Safe Places</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Alerts &amp; Notices</TabsTrigger>
            <TabsTrigger value="pros" className="rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Female Professionals</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="map">
          <ClientOnly fallback={<div className="h-[520px] rounded-xl bg-muted animate-pulse" />}>
            <Suspense fallback={<div className="h-[520px] rounded-xl bg-muted animate-pulse" />}>
              <SafetyMap />
            </Suspense>
          </ClientOnly>
        </TabsContent>
        <TabsContent value="places"><SafePlaces /></TabsContent>
        <TabsContent value="alerts"><Alerts /></TabsContent>
        <TabsContent value="pros"><Pros /></TabsContent>
      </Tabs>
    </div>
  );
}

function SafePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [name, setName] = useState("");
  const [placeType, setPlaceType] = useState("cafe");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const { data } = await supabase.from("safe_places").select("*").order("created_at", { ascending: false }).limit(50);
    setPlaces((data as Place[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !city || !country) { toast.error("Name, city, and country required."); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("safe_places").insert({
      submitted_by: u.user.id, name, place_type: placeType, city, country, notes: notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Added.");
    setName(""); setNotes("");
    load();
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="self-start">
        <CardHeader><CardTitle className="font-serif italic">Submit a safe place</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={placeType} onValueChange={setPlaceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cafe", "hostel", "library", "gym", "clinic", "coworking"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="min-w-0"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="w-full min-w-0" /></div>
              <div className="min-w-0"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full min-w-0" /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button type="submit" className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">Submit</Button>
          </form>
        </CardContent>
      </Card>
      <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
        {places.length === 0 && <Card className="sm:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No places yet. Be the first to add one.</CardContent></Card>}
        {places.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-4 w-4 text-earth" />{p.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{p.place_type}</Badge><Badge variant="outline">{p.city}, {p.country}</Badge></div>
              {p.notes && <p className="text-muted-foreground">{p.notes}</p>}
              <p className="text-xs text-muted-foreground">{p.review_count} reviews</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertType, setAlertType] = useState("unsafe-area");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("moderate");

  async function load() {
    const { data } = await supabase.from("safety_alerts").select("*").order("created_at", { ascending: false }).limit(50);
    setAlerts((data as Alert[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!city || !country || description.length < 10) { toast.error("Add city, country and a clear description."); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("safety_alerts").insert({
      alert_type: alertType, city, country, description, severity,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Reported. A moderator will verify.");
    setDescription("");
    load();
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="font-serif italic">Share what you noticed</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Post a real-time safety alert or community notice</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Notice type</Label>
              <Select value={alertType} onValueChange={setAlertType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["unsafe-area","harassment","poorly-lit-street","scam","stalking","safe-haven-zone","other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="min-w-0"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="w-full min-w-0" /></div>
              <div className="min-w-0"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full min-w-0" /></div>
            </div>
            <div><Label>Urgency</Label>
              <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low","moderate","high","critical"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>What did you notice?</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Describe the location pattern or observation..." /></div>
            <Button type="submit" className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">Share notice</Button>
          </form>
        </CardContent>
      </Card>
      <div className="md:col-span-2 space-y-3">
        {alerts.length === 0 && <Card><CardContent className="p-6 text-muted-foreground text-center">No alerts or notices at the moment.</CardContent></Card>}
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldAlert className="h-4 w-4 text-earth" />
                <Badge variant="outline">{a.alert_type}</Badge>
                <Badge variant="outline">{a.severity}</Badge>
                <Badge variant="secondary">community notice</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{a.city}, {a.country}</span>
              </div>
              <p className="text-sm">{a.description}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Pros() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<"all" | "remote" | "local">("all");

  // Contact modal state
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [sent, setSent] = useState(false);

  // Delete modal state
  const [deletingPro, setDeletingPro] = useState<Professional | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    try {
      const data = await fetchAllProfessionals();
      setProfessionals(data);
    } catch {
      toast.error("Could not load female professionals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setCurrentUserId(data.user.id);
    });

    const unsubscribe = subscribeToProfessionals(() => {
      load();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function confirmDelete() {
    if (!deletingPro) return;
    setIsDeleting(true);
    try {
      await deleteMentorProfile(deletingPro.id, deletingPro.user_id);
      toast.success("Listing deleted.");
      setDeletingPro(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete listing.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    return professionals.filter((p) => {
      // Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }

      // Location filter
      if (locationFilter === "remote") {
        if (!p.location.toLowerCase().includes("remote")) return false;
      } else if (locationFilter === "local") {
        if (p.location.toLowerCase().includes("remote")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesHeadline = p.headline.toLowerCase().includes(q);
        const matchesExpertise = p.expertise.some((x) => x.toLowerCase().includes(q));
        const matchesBio = p.bio?.toLowerCase().includes(q) ?? false;
        const matchesLoc = p.location.toLowerCase().includes(q);
        if (!matchesName && !matchesHeadline && !matchesExpertise && !matchesBio && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [professionals, selectedCategory, locationFilter, searchQuery]);

  function handleConnect(pro: Professional) {
    setSelectedPro(pro);
    setContactMessage(
      `Hello ${pro.name}, I found your listing in the HerSpace Safety Network directory and would like to consult with you regarding ${pro.headline}.`
    );
    setSent(false);
  }

  function sendConsultRequest() {
    setSent(true);
    toast.success(`Consultation request sent to ${selectedPro?.name}!`);
    setTimeout(() => {
      setSelectedPro(null);
      setSent(false);
    }, 1500);
  }

  return (
    <div className="space-y-6">
      {/* Banner / Callout linking to Mentorship */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Trusted Female Professional Network
            </span>
          </div>
          <p className="text-sm text-foreground font-medium">
            Doctors, attorneys, therapists, tutors, and consultants available for women.
          </p>
          <p className="text-xs text-muted-foreground">
            All real-time listed profiles from the Mentorship circle are synchronized here for safe consultations.
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full shrink-0 gap-1.5 bg-primary text-primary-foreground">
          <Link to="/mentorship">
            <Sparkles className="w-3.5 h-3.5" /> List yourself as a professional <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search profession (doctor, lawyer, therapist, AI tutor, city)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-card/85 border-border/80 text-sm h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Toggle */}
          <div className="flex items-center gap-1 bg-card/85 border border-border/80 rounded-full p-1 shrink-0 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setLocationFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                locationFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter("remote")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                locationFilter === "remote"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Remote
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter("local")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                locationFilter === "local"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              In-Person
            </button>
          </div>
        </div>

        {/* Profession Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {PROFESSIONAL_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20 scale-[1.02]"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> female professionals
        </span>
        {(searchQuery || selectedCategory !== "All" || locationFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setLocationFilter("all");
            }}
            className="text-primary hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid of Professionals */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm bg-card/60 rounded-3xl border border-border/70">
          Loading real-time directory...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-border/80 p-10 text-center space-y-3 bg-card/60">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-serif italic text-lg text-foreground">No female professionals listed yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "All" || locationFilter !== "all"
              ? "No professionals match your current filters. Try resetting the filters."
              : "Profiles added under Mentorship appear here in real time. List yourself to be the first!"}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {(searchQuery || selectedCategory !== "All" || locationFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setLocationFilter("all");
                }}
                className="rounded-full text-xs"
              >
                Reset filters
              </Button>
            )}
            <Button asChild size="sm" className="rounded-full text-xs bg-primary text-primary-foreground">
              <Link to="/mentorship">List yourself in Mentorship</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const canDelete = isMyProfessional(p, currentUserId);
            return (
              <Card
                key={p.id}
                className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden group relative"
              >
                <CardHeader className="pb-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-serif italic font-medium text-lg text-foreground group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        {canDelete && (
                          <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0 font-normal">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/85 font-medium mt-0.5 line-clamp-1">
                        {p.headline}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/80 border border-border/60">
                        {p.location.toLowerCase().includes("remote") ? (
                          <Globe className="w-3 h-3 text-primary" />
                        ) : (
                          <MapPin className="w-3 h-3 text-primary" />
                        )}
                        <span className="truncate max-w-[11ch]">{p.location}</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm flex-1 flex flex-col justify-between pt-0">
                  {p.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {p.bio}
                    </p>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {p.expertise.slice(0, 3).map((x) => (
                        <Badge
                          key={x}
                          variant="outline"
                          className="text-[10px] rounded-full border-border/80 bg-background/50 font-normal"
                        >
                          {x}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-xs font-semibold text-foreground">
                        {p.hourly_rate ? `$${p.hourly_rate}/hr` : "Free intro"}
                      </span>
                      <div className="flex items-center gap-2">
                        {canDelete ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingPro(p)}
                            className="rounded-full text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(p)}
                            className="rounded-full text-xs bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                          >
                            Safe consult
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Safe Consultation Dialog */}
      <Dialog open={Boolean(selectedPro)} onOpenChange={(open) => !open && setSelectedPro(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-serif italic text-2xl">
              Safe consultation with {selectedPro?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedPro?.headline} · {selectedPro?.location}
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold">Inquiry sent safely!</p>
              <p className="text-xs text-muted-foreground">
                {selectedPro?.name} will receive your message and follow up through HerSpace.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-semibold text-foreground">
                    {selectedPro?.hourly_rate
                      ? `$${selectedPro?.hourly_rate}/hr`
                      : "Free consultation"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Specialty / Category:</span>
                  <span className="font-semibold text-foreground">{selectedPro?.category}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Your consultation inquiry</Label>
                <Textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Explain what guidance or assistance you are seeking..."
                  className="rounded-2xl text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPro(null)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendConsultRequest}
                  className="rounded-full text-xs bg-primary text-primary-foreground gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Inquiry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingPro)}
        onOpenChange={(open) => !open && setDeletingPro(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-xl">
              Remove your listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove your listing for <strong>{deletingPro?.headline}</strong>? This will permanently delete it from both Safety Network and Mentorship.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full text-xs">Keep listing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-full text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}