import { Sun, Moon, Monitor, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTheme, ACCENT_PRESETS } from "./theme-provider";

export function ThemeSwitcher() {
  const { mode, setMode, accent, setAccent, resetAccent } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Customize theme" className="rounded-full">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Appearance</Label>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {([
              { v: "light", icon: Sun, label: "Light" },
              { v: "dark", icon: Moon, label: "Dark" },
              { v: "system", icon: Monitor, label: "Auto" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => setMode(o.v)}
                className={`flex flex-col items-center gap-1 rounded-md border py-2 text-xs transition-colors ${
                  mode === o.v ? "border-primary bg-accent" : "border-border hover:bg-accent"
                }`}
                aria-pressed={mode === o.v}
              >
                <o.icon className="h-3.5 w-3.5" />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Accent color</Label>
          <div className="mt-2 grid grid-cols-8 gap-1.5">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => setAccent(p.hex)}
                title={p.name}
                aria-label={p.name}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  accent.toLowerCase() === p.hex.toLowerCase() ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: p.hex }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-12 p-1 cursor-pointer"
              aria-label="Custom accent color"
            />
            <Input
              value={accent}
              onChange={(e) => /^#[a-f\d]{6}$/i.test(e.target.value) && setAccent(e.target.value)}
              className="h-9 flex-1 font-mono text-xs"
              maxLength={7}
            />
            <Button variant="ghost" size="icon" onClick={resetAccent} aria-label="Reset accent" className="h-9 w-9">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}