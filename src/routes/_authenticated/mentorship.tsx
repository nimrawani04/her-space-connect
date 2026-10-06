import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Search,
  MapPin,
  Globe,
  DollarSign,
  ShieldCheck,
  User,
  Briefcase,
  Check,
  Send,
  X,
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
  saveMentorProfile,
  deleteMentorProfile,
  subscribeToProfessionals,
  isMyProfessional,
  Professional,
  PROFESSIONAL_CATEGORIES,
} from "@/lib/professionals";

export const Route = createFileRoute("/_authenticated/mentorship")({
  head: () => ({ meta: [{ title: "Mentorship & Female Professionals · HerSpace" }] }),
  component: Mentorship,
});

export function Mentorship() {
  const [mentors, setMentors] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [expertise, setExpertise] = useState("");
  const [rate, setRate] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<"all" | "remote" | "local">("all");

  // Contact Session Modal State
  const [selectedMentor, setSelectedMentor] = useState<Professional | null>(null);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionSent, setSessionSent] = useState(false);

  // Delete Confirmation State
  const [deletingMentor, setDeletingMentor] = useState<Professional | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    try {
      const data = await fetchAllProfessionals();
      setMentors(data);
    } catch {
      toast.error("Could not load directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1. Initial load & get current user
    load();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setCurrentUserId(data.user.id);
    });

    // 2. Real-time subscription to database changes & local events
    const unsubscribe = subscribeToProfessionals(() => {
      load();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function handleListMe(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide your name or alias.");
      return;
    }
    if (headline.trim().length < 4) {
      toast.error("Please provide a headline (e.g. Student intern, Tutor, Doctor).");
      return;
    }
    if (!expertise.trim()) {
      toast.error("Please specify at least one skill or area of expertise.");
      return;
    }
    if (!location.trim()) {
      toast.error("Please specify your location (e.g. Remote, London, NYC).");
      return;
    }

    setSubmitting(true);
    try {
      await saveMentorProfile({
        name,
        headline,
        expertise,
        hourly_rate: rate,
        location,
        bio,
      });
      toast.success("Listing created in real time!");
      setName("");
      setHeadline("");
      setExpertise("");
      setRate("");
      setLocation("");
      setBio("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save listing.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deletingMentor) return;
    setIsDeleting(true);
    try {
      await deleteMentorProfile(deletingMentor.id, deletingMentor.user_id);
      toast.success("Listing removed.");
      setDeletingMentor(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete listing.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      // Category filter
      if (selectedCategory !== "All" && m.category !== selectedCategory) {
        return false;
      }

      // Location filter
      if (locationFilter === "remote") {
        if (!m.location.toLowerCase().includes("remote")) return false;
      } else if (locationFilter === "local") {
        if (m.location.toLowerCase().includes("remote")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesHeadline = m.headline.toLowerCase().includes(q);
        const matchesExpertise = m.expertise.some((x) => x.toLowerCase().includes(q));
        const matchesBio = m.bio?.toLowerCase().includes(q) ?? false;
        const matchesLoc = m.location.toLowerCase().includes(q);
        if (!matchesName && !matchesHeadline && !matchesExpertise && !matchesBio && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [mentors, selectedCategory, locationFilter, searchQuery]);

  function handleRequestSession(mentor: Professional) {
    setSelectedMentor(mentor);
    setSessionMessage(
      `Hi ${mentor.name}, I would love to connect for a session regarding ${mentor.headline}.`
    );
    setSessionSent(false);
  }

  function sendSessionRequest() {
    setSessionSent(true);
    toast.success(`Session request sent to ${selectedMentor?.name}!`);
    setTimeout(() => {
      setSelectedMentor(null);
      setSessionSent(false);
    }, 1500);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Sanctuary Header Card */}
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            04 · Leadership, Craft &amp; Sisterhood Mentorship
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
              Mentorship &amp; Services
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
              Connect with trusted women leaders, tutors, doctors, lawyers, and specialists.
              Hire independent female professionals or book 1-on-1 mentorship sessions.
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0 font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/70">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Private Sanctuary
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/70">
              <Globe className="w-3.5 h-3.5 text-primary" /> Remote &amp; Worldwide
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: "List Me" Form + Directory List */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form to List Yourself */}
        <Card className="lg:col-span-5 rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="font-serif italic text-xl">List yourself</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Offer mentorship, tutoring, or professional services to the sisterhood.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleListMe} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Name or Alias
                </Label>
                <Input
                  placeholder="e.g. Nimra Wani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Headline / Profession
                </Label>
                <Input
                  placeholder="e.g. Tutor · AI & Health Specialist"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" /> Rate ($/hr or Free)
                  </Label>
                  <Input
                    placeholder="e.g. 50 (leave empty for free)"
                    type="number"
                    min={0}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Location
                  </Label>
                  <Input
                    placeholder="e.g. Remote, London, NYC"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Expertise &amp; Skills (comma separated)
                </Label>
                <Input
                  placeholder="e.g. AI, Healthcare, Python, Tutoring"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Bio &amp; Services Explained
                </Label>
                <Textarea
                  rows={4}
                  placeholder="Describe your background and the specific services, consultation, or tutoring you offer to sisters..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary text-primary-foreground hover:brightness-105 font-medium shadow-xs shadow-primary/20 py-2.5 transition-all"
              >
                {submitting ? "Listing you..." : "List me"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Search, Filters & Directory Cards */}
        <div className="lg:col-span-7 space-y-5">
          {/* Search & Location Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, expertise, tutoring, doctor, law..."
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

            {/* Location Switcher */}
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

          {/* Category Chips */}
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

          {/* Count summary */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filteredMentors.length}</strong> mentors &amp; female professionals
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
                Clear all filters
              </button>
            )}
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm bg-card/60 rounded-3xl border border-border/70">
              Loading real-time directory...
            </div>
          ) : filteredMentors.length === 0 ? (
            <Card className="rounded-3xl border border-dashed border-border/80 p-10 text-center space-y-3 bg-card/60">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif italic text-lg text-foreground">No listings yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery || selectedCategory !== "All" || locationFilter !== "all"
                  ? "No listings match your current filters. Try resetting the filters."
                  : "Be the first sister to offer your craft, tutoring, or professional services using the form on the left!"}
              </p>
              {(searchQuery || selectedCategory !== "All" || locationFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setLocationFilter("all");
                  }}
                  className="rounded-full"
                >
                  Reset filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredMentors.map((m) => {
                const canDelete = isMyProfessional(m, currentUserId);
                return (
                  <Card
                    key={m.id}
                    className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden group relative"
                  >
                    <CardHeader className="pb-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-serif italic font-medium text-lg text-foreground group-hover:text-primary transition-colors">
                              {m.name}
                            </h3>
                            {canDelete && (
                              <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0 font-normal">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground/85 font-medium mt-0.5 line-clamp-1">
                            {m.headline}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Location Badge */}
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/80 border border-border/60">
                            {m.location.toLowerCase().includes("remote") ? (
                              <Globe className="w-3 h-3 text-primary" />
                            ) : (
                              <MapPin className="w-3 h-3 text-primary" />
                            )}
                            <span className="truncate max-w-[12ch]">{m.location}</span>
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm flex-1 flex flex-col justify-between pt-0">
                      {m.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {m.bio}
                        </p>
                      )}

                      <div className="space-y-3 pt-2">
                        {/* Expertise Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {m.expertise.slice(0, 4).map((x) => (
                            <Badge
                              key={x}
                              variant="outline"
                              className="text-[10.5px] rounded-full border-border/80 bg-background/50 font-normal"
                            >
                              {x}
                            </Badge>
                          ))}
                        </div>

                        {/* Footer: Rate + Action Button */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/60">
                          <span className="text-xs font-semibold text-foreground">
                            {m.hourly_rate ? `$${m.hourly_rate}/hr` : "Free intro"}
                          </span>
                          <div className="flex items-center gap-2">
                            {canDelete ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingMentor(m)}
                                className="rounded-full text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleRequestSession(m)}
                                className="rounded-full text-xs bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                              >
                                Request session
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
        </div>
      </div>

      {/* Request Session Dialog */}
      <Dialog
        open={Boolean(selectedMentor)}
        onOpenChange={(open) => !open && setSelectedMentor(null)}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-serif italic text-2xl">
              Connect with {selectedMentor?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedMentor?.headline} · {selectedMentor?.location}
            </DialogDescription>
          </DialogHeader>

          {sessionSent ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold">Message delivered!</p>
              <p className="text-xs text-muted-foreground">
                {selectedMentor?.name} will be notified and can reach back to schedule your session.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-semibold text-foreground">
                    {selectedMentor?.hourly_rate
                      ? `$${selectedMentor?.hourly_rate}/hr`
                      : "Free introduction"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-semibold text-foreground">{selectedMentor?.category}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Your message &amp; goals for the session</Label>
                <Textarea
                  rows={4}
                  value={sessionMessage}
                  onChange={(e) => setSessionMessage(e.target.value)}
                  placeholder="Introduce yourself and specify what you'd like guidance or services on..."
                  className="rounded-2xl text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMentor(null)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendSessionRequest}
                  className="rounded-full text-xs bg-primary text-primary-foreground gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingMentor)}
        onOpenChange={(open) => !open && setDeletingMentor(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-xl">
              Remove your listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove your listing for <strong>{deletingMentor?.headline}</strong>? This will permanently delete it from both Mentorship and the Female Professionals directory.
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
export default Mentorship;