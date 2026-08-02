import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listPilotCities, upsertPilotCity, deletePilotCity } from "@/lib/pilot-area.functions";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pilot-cities")({
  head: () => ({ meta: [{ title: "אזורי פעילות — Goi" }] }),
  component: PilotCitiesPage,
});

function PilotCitiesPage() {
  const list = useServerFn(listPilotCities);
  const upsert = useServerFn(upsertPilotCity);
  const del = useServerFn(deletePilotCity);
  const qc = useQueryClient();
  const [newCity, setNewCity] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["pilot-cities"], queryFn: () => list() });

  const add = useMutation({
    mutationFn: () => upsert({ data: { city_name: newCity.trim(), is_active: true } }),
    onSuccess: () => {
      setNewCity("");
      qc.invalidateQueries({ queryKey: ["pilot-cities"] });
      toast.success("נוסף");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (row: { id: string; city_name: string; is_active: boolean }) =>
      upsert({ data: { id: row.id, city_name: row.city_name, is_active: !row.is_active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pilot-cities"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pilot-cities"] });
      toast.success("נמחק");
    },
  });

  return (
    <AdminLayout title="אזורי פעילות" subtitle="רשימת עזר פנימית בלבד — לא מגבילה פתיחת משלוחים חדשים">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            ✅ חסימת אזורי הפיילוט בוטלה. הרשימה כאן משמשת לתפעול/מעקב פנימי בלבד, וכל עסק יכול להזמין מכל אזור.
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="הוסף אזור/עיר לרשימת העזר..."
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="text-end"
              onKeyDown={(e) => e.key === "Enter" && newCity.trim() && add.mutate()}
            />
            <Button onClick={() => add.mutate()} disabled={!newCity.trim() || add.isPending}>
              <Plus className="size-4" /> הוסף
            </Button>
          </div>

          {isLoading ? (
            <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <div className="divide-y">
              {(data ?? []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
                    <Trash2 className="size-4 text-rose-600" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <Switch checked={c.is_active} onCheckedChange={() => toggle.mutate(c)} />
                    <span className={c.is_active ? "" : "text-muted-foreground line-through"}>{c.city_name}</span>
                  </div>
                </div>
              ))}
              {(data ?? []).length === 0 && (
                <div className="text-center py-10 text-muted-foreground">אין אזורים ברשימת העזר. זה לא חוסם הזמנות.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
