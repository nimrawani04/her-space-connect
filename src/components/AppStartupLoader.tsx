import { useEffect, useState } from "react";
import { Code2, HardHat, Palette, Stethoscope } from "lucide-react";

const PROFESSIONS = [
  { label: "Engineer", Icon: HardHat, delay: "0ms" },
  { label: "Doctor", Icon: Stethoscope, delay: "650ms" },
  { label: "Developer", Icon: Code2, delay: "1300ms" },
  { label: "Designer", Icon: Palette, delay: "1950ms" },
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
    const timer = window.setTimeout(() => setVisible(false), 3400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="startup-loader fixed inset-0 z-[100] grid place-items-center bg-background" role="status" aria-live="polite" aria-label="HerSpace is loading">
      <div className="relative h-32 w-32" aria-hidden="true">
          {PROFESSIONS.map(({ label, Icon, delay }) => (
            <div
              key={label}
              className="profession-transition absolute inset-0 grid place-items-center text-primary"
              style={{ "--profession-delay": delay } as React.CSSProperties}
            >
              <Icon className="h-14 w-14" strokeWidth={1.5} />
            </div>
          ))}
          <div className="woman-reveal absolute inset-0 grid place-items-center opacity-0">
            <div className="relative h-24 w-20">
              <div className="absolute left-1/2 top-1 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-primary bg-accent" />
              <div className="absolute left-1/2 top-9 h-14 w-16 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-primary bg-primary/15" />
              <div className="absolute left-3 top-2 h-10 w-7 -rotate-12 rounded-full border-l-2 border-primary" />
            </div>
          </div>
      </div>
    </div>
  );
}