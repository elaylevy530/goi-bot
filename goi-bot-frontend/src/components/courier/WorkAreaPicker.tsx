import { Checkbox } from "@/components/ui/checkbox";
import {
  NATIONWIDE_WORK_AREA,
  WORK_AREA_CARDS,
  WORK_AREA_OPTIONS,
  citiesForWorkArea,
  filterCitiesToWorkAreas,
  isCitySelected,
  toggleCity,
  toggleWorkArea,
  workAreasForCityPicker,
} from "@/lib/regions";
import { cn } from "@/lib/utils";
import { Globe, MapPin } from "lucide-react";

export function WorkAreaCityPicker({
  regions,
  selected,
  onChange,
}: {
  regions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const groups = workAreasForCityPicker(regions);
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-right">
        <p className="text-sm font-extrabold text-text-strong">ערים באזורים שנבחרו</p>
        <p className="mt-0.5 text-xs text-text-muted">בחר לפחות עיר אחת שבה תרצה לקבל משלוחים</p>
      </div>
      {groups.map((area) => {
        const options = citiesForWorkArea(area);
        if (options.length === 0) return null;
        const label = WORK_AREA_CARDS.find((card) => card.stored === area)?.label ?? area;
        return (
          <div key={area} className="space-y-2">
            <p className="text-xs font-bold text-text-muted text-right">{label}</p>
            <div className="flex flex-wrap justify-end gap-2">
              {options.map((city) => {
                const on = isCitySelected(selected, city);
                return (
                  <button
                    key={city}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(toggleCity(selected, city))}
                    className={cn(
                      "min-h-11 rounded-card border-2 px-3 py-2 text-sm font-extrabold transition-colors",
                      on
                        ? "border-primary bg-primary-soft text-text-strong"
                        : "border-border bg-surface text-text-strong hover:border-primary/50",
                    )}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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
