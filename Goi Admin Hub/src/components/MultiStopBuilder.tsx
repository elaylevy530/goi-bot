import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Package, MapPin, ArrowUp, ArrowDown } from "lucide-react";

export type MultiStop = {
  tempId: string;
  stop_type: "pickup" | "dropoff";
  linked_pickup_tempId?: string | null;
  address: string;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  package_description?: string | null;
  package_size?: string | null;
  number_of_packages?: number | null;
  fragile?: boolean | null;
};

let _id = 0;
const nextId = () => `s${++_id}_${Date.now().toString(36)}`;

export function emptyPickup(): MultiStop {
  return {
    tempId: nextId(),
    stop_type: "pickup",
    address: "",
    area: "",
    contact_name: "",
    contact_phone: "",
    package_description: "",
    number_of_packages: 1,
  };
}

export function emptyDropoff(linkedPickupId?: string): MultiStop {
  return {
    tempId: nextId(),
    stop_type: "dropoff",
    linked_pickup_tempId: linkedPickupId ?? null,
    address: "",
    area: "",
    contact_name: "",
    contact_phone: "",
  };
}

export function MultiStopBuilder({
  stops,
  onChange,
}: {
  stops: MultiStop[];
  onChange: (next: MultiStop[]) => void;
}) {
  const pickups = useMemo(
    () => stops.filter((s) => s.stop_type === "pickup"),
    [stops],
  );

  const update = (tempId: string, patch: Partial<MultiStop>) => {
    onChange(stops.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
  };
  const remove = (tempId: string) => {
    onChange(
      stops
        .filter((s) => s.tempId !== tempId)
        .map((s) =>
          s.linked_pickup_tempId === tempId
            ? { ...s, linked_pickup_tempId: null }
            : s,
        ),
    );
  };
  const move = (tempId: string, dir: -1 | 1) => {
    const idx = stops.findIndex((s) => s.tempId === tempId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= stops.length) return;
    const next = stops.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const addPickup = () => onChange([...stops, emptyPickup()]);
  const addDropoff = () => {
    const lastPickup = [...pickups].pop();
    onChange([...stops, emptyDropoff(lastPickup?.tempId)]);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addPickup} variant="outline" className="gap-2">
          <Plus className="size-4" />
          <Package className="size-4" />
          הוסף נקודת איסוף
        </Button>
        <Button type="button" onClick={addDropoff} variant="outline" className="gap-2">
          <Plus className="size-4" />
          <MapPin className="size-4" />
          הוסף נקודת מסירה
        </Button>
      </div>

      <div className="space-y-3">
        {stops.map((s, idx) => (
          <Card
            key={s.tempId}
            className={`rounded-2xl border-2 ${
              s.stop_type === "pickup"
                ? "border-amber-200 bg-amber-50/40"
                : "border-emerald-200 bg-emerald-50/40"
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-7 rounded-full grid place-items-center text-xs font-extrabold text-white ${
                      s.stop_type === "pickup" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="font-bold text-slate-900">
                    {s.stop_type === "pickup" ? "📦 איסוף" : "🎯 מסירה"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => move(s.tempId, -1)}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => move(s.tempId, 1)}
                    disabled={idx === stops.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => remove(s.tempId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">כתובת *</Label>
                  <Input
                    value={s.address}
                    onChange={(e) => update(s.tempId, { address: e.target.value })}
                    placeholder="רחוב + מספר"
                  />
                </div>
                <div>
                  <Label className="text-xs">עיר / אזור</Label>
                  <Input
                    value={s.area ?? ""}
                    onChange={(e) => update(s.tempId, { area: e.target.value })}
                    placeholder="תל אביב"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {s.stop_type === "pickup" ? "שם השולח" : "שם הלקוח"}
                  </Label>
                  <Input
                    value={s.contact_name ?? ""}
                    onChange={(e) => update(s.tempId, { contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">טלפון</Label>
                  <Input
                    value={s.contact_phone ?? ""}
                    onChange={(e) => update(s.tempId, { contact_phone: e.target.value })}
                    placeholder="0501234567"
                    inputMode="tel"
                  />
                </div>

                {s.stop_type === "pickup" && (
                  <>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">תיאור החבילה</Label>
                      <Textarea
                        rows={2}
                        value={s.package_description ?? ""}
                        onChange={(e) =>
                          update(s.tempId, { package_description: e.target.value })
                        }
                        placeholder="מה אורזים? למשל: 2 שקיות אוכל"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">כמות חבילות</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={s.number_of_packages ?? 1}
                        onChange={(e) =>
                          update(s.tempId, {
                            number_of_packages: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">גודל</Label>
                      <Select
                        value={s.package_size ?? ""}
                        onValueChange={(v) => update(s.tempId, { package_size: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="קטן">קטן</SelectItem>
                          <SelectItem value="בינוני">בינוני</SelectItem>
                          <SelectItem value="גדול">גדול</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {s.stop_type === "dropoff" && pickups.length > 0 && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">איזו חבילה נמסרת כאן?</Label>
                    <Select
                      value={s.linked_pickup_tempId ?? ""}
                      onValueChange={(v) =>
                        update(s.tempId, { linked_pickup_tempId: v || null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר נקודת איסוף…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickups.map((p, i) => (
                          <SelectItem key={p.tempId} value={p.tempId}>
                            איסוף #{i + 1} — {p.address || "ללא כתובת"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {stops.length === 0 && (
          <Card className="rounded-2xl border-dashed border-2 border-slate-300">
            <CardContent className="p-8 text-center text-slate-500">
              עוד אין נקודות. התחילו בהוספת איסוף ראשון.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
