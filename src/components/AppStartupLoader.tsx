import { useEffect, useState } from "react";
import { Code2, HardHat, Palette, Sparkles, Stethoscope } from "lucide-react";

const PROFESSIONS = [
  { label: "Engineer", Icon: HardHat },
  { label: "Doctor", Icon: Stethoscope },
  { label: "Developer", Icon: Code2 },
  { label: "Designer", Icon: Palette },
] as const;

export function AppStartupLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("herspace-startup-seen");
    if (seen) {
      setVisible(false);
      return;
    }
    window.sessionStorage.setItem("herspace-startup-seen", "true");
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="startup-loader fixed inset-0 z-[100] grid place-items-center bg-background" role="status" aria-live="polite" aria-label="HerSpace is loading">
      <div className="flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative h-40 w-64" aria-hidden="true">
          {PROFESSIONS.map(({ label, Icon }) => (
            <div key={label} className="profession-mark absolute left-1/2 top-1/2 grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-primary shadow-sm">
              <Icon className="h-6 w-6" />
            </div>
          ))}
          <div className="woman-mark absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center opacity-0">
            <div className="h-12 w-12 rounded-full border-4 border-primary bg-accent" />
            <div className="-mt-1 h-16 w-24 rounded-t-full border-4 border-b-0 border-primary bg-primary/15" />
            <Sparkles className="absolute -right-5 top-3 h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="font-serif text-3xl italic text-foreground">HerSpace</p>
        <p className="mt-2 text-sm text-muted-foreground">Every profession. Every journey. Every woman.</p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="startup-progress h-full rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}