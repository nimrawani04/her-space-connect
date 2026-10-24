import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, Building, ShieldCheck, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type LocationSuggestion = {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  isSafeHaven?: boolean;
  type?: string;
};

type LocationAutocompleteInputProps = {
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
  contextCountry?: string;
  contextState?: string;
  countryCode?: string;
  stateLat?: number;
  stateLng?: number;
  stateLandmarks?: Array<{
    name: string;
    subtitle: string;
    lat: number;
    lng: number;
    type?: string;
  }>;
  safePlaces?: Array<{ name: string; lat: number; lng: number; place_type: string }>;
  accentColor?: "pink" | "purple" | "default";
};

export default function LocationAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search street, college, landmark…",
  className = "",
  contextCountry = "",
  contextState = "",
  countryCode = "in",
  stateLat,
  stateLng,
  stateLandmarks = [],
  safePlaces = [],
  accentColor = "default",
}: LocationAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debouncing & instant local matching
  const fetchSuggestions = useCallback(
    async (query: string) => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        setLoading(false);
        setSelectedIndex(-1);
        return;
      }

      // Split query terms to support partial/half-words (e.g. "centr univ" or "sanat nagar")
      const queryWords = q.split(/\s+/).filter(Boolean);

      // 1. Instant match in stateLandmarks (Curated regional universities, post offices, hubs)
      const matchedLandmarks: LocationSuggestion[] = stateLandmarks
        .filter((lm) => {
          const target = `${lm.name} ${lm.subtitle}`.toLowerCase();
          return queryWords.every((w) => target.includes(w));
        })
        .map((lm, idx) => ({
          id: `lm-${idx}-${lm.name}`,
          name: lm.name,
          subtitle: lm.subtitle,
          lat: lm.lat,
          lng: lm.lng,
          type: lm.type || "landmark",
        }));

      // 2. Instant match in verified Safe Havens
      const matchedSafePlaces: LocationSuggestion[] = safePlaces
        .filter((sp) => {
          const target = sp.name.toLowerCase();
          return queryWords.every((w) => target.includes(w));
        })
        .map((sp, idx) => ({
          id: `safe-${idx}-${sp.name}`,
          name: sp.name,
          subtitle: `Verified Safe Haven · ${sp.place_type.replace(/_/g, " ")}`,
          lat: sp.lat,
          lng: sp.lng,
          isSafeHaven: true,
          type: "safe_haven",
        }));

      const initialMatches = [...matchedLandmarks, ...matchedSafePlaces];
      if (initialMatches.length > 0) {
        setSuggestions(initialMatches);
        setIsOpen(true);
      }

      setLoading(true);

      try {
        // Prepare Nominatim search:
        // Clean query: strip stopwords like "of", "the", "in" which cause Nominatim exact failures
        const cleanQuery = query
          .replace(/\b(of|the|in|at|near|and)\b/gi, " ")
          .replace(/[,.-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const params = new URLSearchParams({
          format: "json",
          addressdetails: "1",
          limit: "8",
          q: cleanQuery,
        });

        if (countryCode) {
          params.set("countrycodes", countryCode.toLowerCase());
        }

        // Add viewbox priority around current state coordinates if available
        if (stateLat && stateLng) {
          const box = `${stateLng - 0.75},${stateLat + 0.6},${stateLng + 0.75},${stateLat - 0.6}`;
          params.set("viewbox", box);
          params.set("bounded", "0"); // prioritizes viewbox without hiding outside hits
        }

        let res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: AbortSignal.timeout(3500),
        });
        let data = await res.json();

        // If cleaned query returned nothing, try with contextState appended
        if ((!data || data.length === 0) && contextState) {
          const contextParams = new URLSearchParams({
            format: "json",
            addressdetails: "1",
            limit: "6",
            q: `${cleanQuery}, ${contextState}`,
          });
          if (countryCode) contextParams.set("countrycodes", countryCode.toLowerCase());
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?${contextParams.toString()}`,
            { signal: AbortSignal.timeout(3500) }
          );
          data = await fallbackRes.json();
        }

        // Map Nominatim hits
        const nominatimHits: LocationSuggestion[] = (data || []).map((hit: any) => {
          const parts = (hit.display_name || "").split(",");
          const mainName = hit.name || parts[0]?.trim() || query;
          const secondary = parts.slice(1, 4).join(",").trim();

          return {
            id: String(hit.place_id || Math.random()),
            name: mainName,
            subtitle: secondary || hit.display_name,
            lat: Number(hit.lat),
            lng: Number(hit.lon),
            type: hit.type || hit.class || "place",
          };
        });

        // Deduplicate between local matches and Nominatim results
        const seenNames = new Set<string>();
        const combined: LocationSuggestion[] = [];

        for (const item of [...initialMatches, ...nominatimHits]) {
          const norm = item.name.toLowerCase().trim();
          if (!seenNames.has(norm)) {
            seenNames.add(norm);
            combined.push(item);
          }
        }

        setSuggestions(combined);
        setIsOpen(combined.length > 0);
      } catch {
        // Fallback to initial local matches
        if (initialMatches.length > 0) {
          setSuggestions(initialMatches);
          setIsOpen(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [countryCode, contextCountry, contextState, stateLat, stateLng, stateLandmarks, safePlaces]
  );

  // Debounced input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 280);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectItem(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }

  function handleSelectItem(item: LocationSuggestion) {
    onChange(item.name);
    onSelect(item);
    setIsOpen(false);
    setSelectedIndex(-1);
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Input
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim().length >= 2 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="text-xs h-9 rounded-xl pr-8 bg-background"
        />
        <div className="absolute right-2.5 flex items-center pointer-events-none text-muted-foreground">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-xl overflow-hidden max-h-[260px] overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="p-1.5 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Matching Locations</span>
              <span className="text-[9px] font-normal lowercase">tap or press Enter to select</span>
            </div>

            {suggestions.map((item, idx) => {
              const isHighlighted = selectedIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                    isHighlighted
                      ? "bg-pink-500/15 border border-pink-500/40 text-foreground ring-1 ring-pink-500/30"
                      : item.isSafeHaven
                        ? "bg-pink-500/10 border border-pink-500/30 text-pink-900 dark:text-pink-100 hover:bg-pink-500/20"
                        : "text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.isSafeHaven ? (
                      <ShieldCheck className="w-4 h-4 text-pink-600" />
                    ) : item.type === "university" || item.type === "college" ? (
                      <Building className="w-4 h-4 text-purple-600" />
                    ) : (
                      <MapPin
                        className={`w-4 h-4 ${
                          accentColor === "pink"
                            ? "text-pink-600"
                            : accentColor === "purple"
                              ? "text-purple-600"
                              : "text-primary"
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold truncate leading-tight">{item.name}</p>
                      {item.isSafeHaven ? (
                        <Badge className="bg-pink-600 text-white text-[9px] px-1.5 py-0 h-4">
                          Safe Haven
                        </Badge>
                      ) : (
                        item.type && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-3.5 capitalize font-normal opacity-80"
                          >
                            {item.type.replace(/_/g, " ")}
                          </Badge>
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate leading-snug mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
