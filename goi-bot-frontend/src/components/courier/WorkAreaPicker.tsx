import { Checkbox } from "@/components/ui/checkbox";
import {
  NATIONWIDE_WORK_AREA,
  WORK_AREA_OPTIONS,
  toggleWorkArea,
} from "@/lib/regions";
import { Globe, MapPin } from "lucide-react";

export function WorkAreaPicker({
  selected,
  onChange,
  error,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {WORK_AREA_OPTIONS.map((label) => {
          const on = selected.includes(label);
          const Icon = label === NATIONWIDE_WORK_AREA ? Globe : MapPin;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(toggleWorkArea(selected, label))}
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
      {error && <p className="text-xs text-destructive text-right">{error}</p>}
    </div>
  );
}
