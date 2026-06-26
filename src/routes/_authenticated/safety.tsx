import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ShieldAlert, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({ meta: [{ title: "Safety Network · HerSpace" }] }),
  component: Safety,
});

type Place = { id: string; name: string; place_type: string; city: string; country: string; safety_score: number; women_friendly_score: number; review_count: number; notes: string | null };
type Alert = { id: string; alert_type: string; city: string; country: string; location: string | null; description: string; severity: string; is_verified: boolean; created_at: string };

function Safety() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">07 · Safety</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Safety Network</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Verified safe places, reviews by women for women, and real-time alerts. For active danger, call your local emergency number first.</p>
      </header>

      <Tabs defaultValue="places" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="places">Safe Places</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="pros">Female Professionals</TabsTrigger>
        </TabsList>
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
            <div className="grid grid-cols-2 gap-2">
              <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
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
      reporter_id: u.user.id, alert_type: alertType, city, country, description, severity,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Reported. A moderator will verify.");
    setDescription("");
    load();
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="self-start">
        <CardHeader><CardTitle className="font-serif italic">Report</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Type</Label>
              <Select value={alertType} onValueChange={setAlertType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["unsafe-area","harassment","scam","stalking","other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            </div>
            <div><Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low","moderate","high","critical"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>What happened</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></div>
            <Button type="submit" className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">Submit report</Button>
          </form>
        </CardContent>
      </Card>
      <div className="md:col-span-2 space-y-3">
        {alerts.length === 0 && <Card><CardContent className="p-6 text-muted-foreground text-center">No alerts at the moment.</CardContent></Card>}
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldAlert className="h-4 w-4 text-earth" />
                <Badge variant="outline">{a.alert_type}</Badge>
                <Badge variant="outline">{a.severity}</Badge>
                <Badge variant={a.is_verified ? "default" : "outline"}>{a.is_verified ? "verified" : "unverified"}</Badge>
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
  return (
    <Card><CardContent className="p-8 text-muted-foreground text-center">
      Female-professional finder (doctors, lawyers, therapists, trainers) launches next. Add a mentor profile under Mentorship — those will populate this directory.
    </CardContent></Card>
  );
}