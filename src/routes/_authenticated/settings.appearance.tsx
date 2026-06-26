import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, Monitor, RotateCcw, Upload, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTheme, ACCENT_PRESETS, type Background } from "@/components/theme-provider";
import { getAvatarSignedUrl, initials } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/settings/appearance")({
  head: () => ({ meta: [{ title: "Theme & Appearance · HerSpace" }] }),
  component: AppearancePage,
});

const BACKGROUNDS: { id: Background; name: string; desc: string }[] = [
  { id: "plain", name: "Plain", desc: "Calm warm off-white" },
  { id: "warm", name: "Warm glow", desc: "Soft earth wash" },
  { id: "sage", name: "Sage haze", desc: "Cool green ambience" },
  { id: "dusk", name: "Dusk", desc: "Top-down sunset fade" },
  { id: "gradient", name: "Editorial", desc: "Diagonal earth → sage" },
  { id: "grain", name: "Grain", desc: "Subtle dotted texture" },
];

function AppearancePage() {
  const { mode, setMode, accent, setAccent, resetAccent, background, setBackground } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", u.user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setDisplayName(data.display_name ?? "");
      setAvatarPath(data.avatar_url ?? null);
      setAvatarUrl(await getAvatarSignedUrl(data.avatar_url));
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error("Sign in required"); return; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${u.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      // remove the previous file
      if (avatarPath && avatarPath !== path) {
        await supabase.storage.from("avatars").remove([avatarPath]);
      }
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", u.user.id);
      if (profErr) throw profErr;
      setAvatarPath(path);
      setAvatarUrl(await getAvatarSignedUrl(path));
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!avatarPath) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.storage.from("avatars").remove([avatarPath]);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", u.user.id);
    setAvatarPath(null); setAvatarUrl(null);
    toast.success("Picture removed.");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">Settings</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Theme &amp; Appearance</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Tune HerSpace to feel like yours. Everything saves to your profile and follows you across devices.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile + avatar */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="font-serif italic">You</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-2 ring-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Your profile picture" />}
                <AvatarFallback className="bg-sand text-earth font-serif italic text-xl">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button size="sm" variant="outline" className="rounded-full gap-2 w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : avatarPath ? "Replace photo" : "Upload photo"}
                </Button>
                {avatarPath && (
                  <Button size="sm" variant="ghost" className="rounded-full gap-2 w-full text-muted-foreground" onClick={removeAvatar}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your photo appears in the header and across HerSpace.
            </p>
          </CardContent>
        </Card>

        {/* Appearance controls */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-serif italic">Theme</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <section>
              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Appearance</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 max-w-md">
                {([
                  { v: "light", icon: Sun, label: "Light" },
                  { v: "dark", icon: Moon, label: "Dark" },
                  { v: "system", icon: Monitor, label: "Auto" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setMode(o.v)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition-colors ${
                      mode === o.v ? "border-primary bg-accent" : "border-border hover:bg-accent"
                    }`}
                    aria-pressed={mode === o.v}
                  >
                    <o.icon className="h-4 w-4" />
                    {o.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Accent color</Label>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={resetAccent}>
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
              <div className="grid grid-cols-8 gap-2 max-w-md">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    onClick={() => setAccent(p.hex)}
                    title={p.name}
                    aria-label={p.name}
                    className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                      accent.toLowerCase() === p.hex.toLowerCase() ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: p.hex }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 max-w-md">
                <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-14 p-1 cursor-pointer" aria-label="Custom accent color" />
                <Input
                  value={accent}
                  onChange={(e) => /^#[a-f\d]{6}$/i.test(e.target.value) && setAccent(e.target.value)}
                  className="h-10 flex-1 font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Background</Label>
              <div className="mt-2 grid sm:grid-cols-3 gap-3">
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBackground(b.id)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      background === b.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-accent"
                    }`}
                    aria-pressed={background === b.id}
                  >
                    <BackgroundSwatch variant={b.id} />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-medium">{b.name}</p>
                      {background === b.id && <Badge variant="outline" className="text-[10px]">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-serif italic flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-earth" /> Live preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="p-6 md:p-8 space-y-4" style={{ backgroundColor: "var(--background)" }}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="bg-sand text-earth">{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-serif italic text-xl leading-none">Hello, {displayName || "Sister"}.</p>
                    <p className="text-xs text-muted-foreground mt-1">This is how your space feels.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-full bg-earth text-earth-foreground hover:brightness-110">Primary action</Button>
                  <Button variant="outline" className="rounded-full">Secondary</Button>
                  <Badge>Tag</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                <Card>
                  <CardContent className="p-4 text-sm">
                    Cards, inputs, and links all pick up your accent color automatically.
                    Try a <Link to="/dashboard" className="text-earth underline underline-offset-4">link to your dashboard</Link>.
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BackgroundSwatch({ variant }: { variant: Background }) {
  const styles: Record<Background, React.CSSProperties> = {
    plain: { background: "var(--background)" },
    warm: { backgroundImage: "radial-gradient(at 20% 0%, color-mix(in oklab, var(--earth) 30%, transparent), transparent 60%), radial-gradient(at 100% 100%, color-mix(in oklab, var(--sand) 80%, transparent), transparent 60%)", backgroundColor: "var(--background)" },
    sage: { backgroundImage: "radial-gradient(at 80% 10%, color-mix(in oklab, var(--sage) 35%, transparent), transparent 60%), radial-gradient(at 0% 100%, color-mix(in oklab, var(--sand) 80%, transparent), transparent 60%)", backgroundColor: "var(--background)" },
    dusk: { backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--earth) 18%, var(--background)) 0%, var(--background) 80%)" },
    gradient: { backgroundImage: "linear-gradient(135deg, color-mix(in oklab, var(--earth) 25%, var(--background)) 0%, var(--background) 50%, color-mix(in oklab, var(--sage) 30%, var(--background)) 100%)" },
    grain: { backgroundColor: "var(--background)", backgroundImage: "radial-gradient(color-mix(in oklab, var(--foreground) 25%, transparent) 1px, transparent 1px)", backgroundSize: "5px 5px" },
  };
  return <div className="h-16 w-full rounded-lg border border-border" style={styles[variant]} />;
}