import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NATIONWIDE_WORK_AREA,
  WORK_AREA_CARDS,
  WORK_AREA_OPTIONS,
  clearCitiesInWorkArea,
  extrasByWorkArea,
  filterCitiesToWorkAreas,
  isCitySelected,
  isListedWorkAreaCity,
  selectAllCitiesInWorkArea,
  toggleCity,
  toggleWorkArea,
  workAreaCityOptions,
  workAreasForCityPicker,
} from "@/lib/regions";
import { cn } from "@/lib/utils";
import { Check, Globe, MapPin, Plus, Search } from "lucide-react";

function regionLabel(area: string): string {
  return WORK_AREA_CARDS.find((card) => card.stored === area)?.label ?? area.replace(/^אזור\s+/, "");
}

export function WorkAreaCityPicker({
  regions,
  selected,
  onChange,
}: {
  regions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const groups = useMemo(() => workAreasForCityPicker(regions), [regions]);
  const inferredExtras = useMemo(() => extrasByWorkArea(regions, selected), [regions, selected]);
  const [addedByArea, setAddedByArea] = useState<Record<string, string[]>>({});
  const [openAreas, setOpenAreas] = useState<string[]>([]);
  const [queryByArea, setQueryByArea] = useState<Record<string, string>>({});
  const [draftByArea, setDraftByArea] = useState<Record<string, string>>({});
  const [addingArea, setAddingArea] = useState<string | null>(null);

  useEffect(() => {
    setAddedByArea((prev) => {
      const next: Record<string, string[]> = {};
      for (const area of groups) {
        const merged = [...(prev[area] ?? []), ...(inferredExtras[area] ?? [])];
        const seen = new Set<string>();
        next[area] = merged.filter((city) => {
          const key = city.trim();
          if (!key || seen.has(key) || isListedWorkAreaCity(city)) return false;
          seen.add(key);
          return true;
        });
      }
      return next;
    });
  }, [groups, inferredExtras]);

  useEffect(() => {
    setOpenAreas((prev) => {
      const added = groups.filter((area) => !prev.includes(area));
      if (added.length > 0) return [added[added.length - 1]];
      const still = prev.filter((area) => groups.includes(area));
      if (still.length > 0) return still;
      return groups[0] ? [groups[0]] : [];
    });
  }, [groups]);

  if (groups.length === 0) return null;

  const extrasFor = (area: string) => addedByArea[area] ?? inferredExtras[area] ?? [];

  const addCity = (area: string) => {
    const name = (draftByArea[area] ?? "").trim();
    if (name.length < 2) return;
    const options = workAreaCityOptions(area, extrasFor(area));
    const existing = options.find((city) => city === name || city.replace(/\s+/g, "") === name.replace(/\s+/g, ""));
    if (existing) {
      if (!isCitySelected(selected, existing)) onChange(toggleCity(selected, existing));
    } else {
      setAddedByArea((prev) => ({ ...prev, [area]: [...(prev[area] ?? []), name] }));
      if (!isCitySelected(selected, name)) onChange([...selected, name]);
    }
    setDraftByArea((prev) => ({ ...prev, [area]: "" }));
    setAddingArea(null);
  };

  return (
    <div className="space-y-3">
      <div className="text-right">
        <p className="text-sm font-extrabold text-text-strong">ערים לפי אזור</p>
        <p className="mt-0.5 text-xs text-text-muted">
          פתחו אזור, בחרו את הערים שבהן אתם עובדים, או סמנו את כולן בבת אחת
        </p>
      </div>

      <Accordion type="multiple" value={openAreas} onValueChange={setOpenAreas} className="space-y-2">
        {groups.map((area) => {
          const extras = extrasFor(area);
          const options = workAreaCityOptions(area, extras);
          const selectedCount = options.filter((city) => isCitySelected(selected, city)).length;
          const allOn = options.length > 0 && selectedCount === options.length;
          const query = (queryByArea[area] ?? "").trim();
          const visible = query
            ? options.filter((city) => city.includes(query))
            : options;
          const label = regionLabel(area);

          return (
            <AccordionItem
              key={area}
              value={area}
              className="overflow-hidden rounded-2xl border border-black/5 border-b-0 bg-white last:border-b-0"
            >
              <div className="flex items-center gap-2 px-2">
                <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-right">
                    <span className="text-sm font-extrabold text-text-strong">{label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                        selectedCount > 0 ? "bg-primary/10 text-[#1f7a1a]" : "bg-black/5 text-text-muted",
                      )}
                    >
                      {selectedCount}/{options.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      allOn
                        ? clearCitiesInWorkArea(selected, area, extras)
                        : selectAllCitiesInWorkArea(selected, area, extras),
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors",
                    allOn
                      ? "bg-primary-deep text-white"
                      : "bg-primary/10 text-[#1f7a1a] hover:bg-primary/15",
                  )}
                >
                  {allOn ? "נקה הכל" : "בחר הכל"}
                </button>
              </div>
              <AccordionContent className="px-3 pb-3">
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={queryByArea[area] ?? ""}
                    onChange={(e) => setQueryByArea((prev) => ({ ...prev, [area]: e.target.value }))}
                    placeholder={`חיפוש עיר ב${label}`}
                    className="h-10 rounded-xl border-black/10 bg-[#F7F8F7] pr-9 text-right"
                  />
                </div>
                <div className="flex max-h-44 flex-wrap justify-end gap-1.5 overflow-y-auto py-0.5">
                  {visible.length === 0 ? (
                    <p className="w-full py-3 text-center text-xs text-text-muted">לא נמצאו ערים</p>
                  ) : (
                    visible.map((city) => {
                      const on = isCitySelected(selected, city);
                      return (
                        <button
                          key={city}
                          type="button"
                          aria-pressed={on}
                          onClick={() => onChange(toggleCity(selected, city))}
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[13px] font-bold transition-colors",
                            on
                              ? "border-primary bg-primary-soft text-text-strong"
                              : "border-black/10 bg-[#F7F8F7] text-text-strong hover:border-primary/40",
                          )}
                        >
                          {on && <Check className="size-3.5 text-primary" strokeWidth={3} />}
                          {city}
                        </button>
                      );
                    })
                  )}
                </div>
                {addingArea === area ? (
                  <form
                    className="mt-2 flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addCity(area);
                    }}
                  >
                    <button
                      type="submit"
                      className="h-10 shrink-0 rounded-xl bg-primary-deep px-3 text-[12px] font-extrabold text-white"
                    >
                      הוסף
                    </button>
                    <Input
                      autoFocus
                      value={draftByArea[area] ?? ""}
                      onChange={(e) => setDraftByArea((prev) => ({ ...prev, [area]: e.target.value }))}
                      placeholder="שם העיר"
                      className="h-10 rounded-xl border-black/10 text-right"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingArea(area)}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#1f7a1a]"
                  >
                    <Plus className="size-3.5" strokeWidth={2.5} />
                    העיר שלי לא מופיעה
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export function WorkAreaPicker({
  selected,
  onChange,
  cities = [],
  onCitiesChange,
  error,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  cities?: string[];
  onCitiesChange?: (next: string[]) => void;
  error?: string | null;
}) {
  const setRegions = (next: string[]) => {
    onChange(next);
    onCitiesChange?.(filterCitiesToWorkAreas(cities, next));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {WORK_AREA_OPTIONS.map((label) => {
          const on = selected.includes(label);
          const Icon = label === NATIONWIDE_WORK_AREA ? Globe : MapPin;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setRegions(toggleWorkArea(selected, label))}
              className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 min-h-11 transition-all ${
                on ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
              }`}
            >
              <Checkbox checked={on} className="pointer-events-none self-start" />
              <Icon className={`size-7 ${on ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium text-center">{label}</span>
            </button>
          );
        })}
      </div>
      {onCitiesChange && selected.length > 0 && (
        <WorkAreaCityPicker regions={selected} selected={cities} onChange={onCitiesChange} />
      )}
      {error && <p className="text-xs text-destructive text-right">{error}</p>}
    </div>
  );
}
