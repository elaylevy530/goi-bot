import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  nestListAreas,
  nestCreateArea,
  nestDeleteArea,
  nestListTags,
  nestCreateTag,
  nestDeleteTag,
  nestListClassificationRules,
  nestUpdateClassificationRule,
} from "@/lib/nest-domain";
import { Plus, X, MapPin, Tag, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/areas-tags")({
  head: () => ({ meta: [{ title: "אזורים וסיווגים — Goi" }] }),
  component: AreasTagsPage,
});

function AreasTagsPage() {
  const qc = useQueryClient();
  const [newArea, setNewArea] = useState("");
  const [newTag, setNewTag] = useState("");

  const { data: areas = [] } = useQuery({
    queryKey: ["areas-mgmt"],
    queryFn: nestListAreas,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: nestListTags,
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: nestListClassificationRules,
  });

  const addArea = useMutation({
    mutationFn: async () => { await nestCreateArea(newArea); },
    onSuccess: () => { setNewArea(""); qc.invalidateQueries({ queryKey: ["areas-mgmt"] }); toast.success("אזור נוסף"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeArea = useMutation({
    mutationFn: async (id: string) => { await nestDeleteArea(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areas-mgmt"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const addTag = useMutation({
    mutationFn: async () => { await nestCreateTag(newTag); },
    onSuccess: () => { setNewTag(""); qc.invalidateQueries({ queryKey: ["tags"] }); toast.success("תגית נוספה"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeTag = useMutation({
    mutationFn: async (id: string) => { await nestDeleteTag(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleRule = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      await nestUpdateClassificationRule(input.id, { enabled: input.enabled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout title="אזורים וסיווגים" subtitle="נהל אזורים, תגיות וכללי סיווג אוטומטי לשליחים">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> אזורים ({areas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="שם אזור חדש" />
              <Button onClick={() => addArea.mutate()} disabled={!newArea || addArea.isPending}>
                {addArea.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(areas as any[]).map((a) => (
                <Badge key={a.id} variant="outline" className="gap-1 ps-3 pe-1 py-1.5 text-sm">
                  {a.name}
                  <button onClick={() => removeArea.mutate(a.id)} className="size-5 grid place-items-center rounded hover:bg-muted"><X className="size-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag className="size-4 text-primary" /> תגיות שליחים ({tags.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="שם תגית חדשה" />
              <Button onClick={() => addTag.mutate()} disabled={!newTag || addTag.isPending}>
                {addTag.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((t) => (
                <Badge key={t.id} className="bg-primary/10 text-primary border-primary/20 gap-1 ps-3 pe-1 py-1.5 text-sm" variant="outline">
                  {t.name}
                  <button onClick={() => removeTag.mutate(t.id)} className="size-5 grid place-items-center rounded hover:bg-primary/20"><X className="size-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="size-4 text-primary" /> כללי סיווג אוטומטי ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(rules as any[]).length === 0 && (
              <li className="px-6 py-8 text-sm text-muted-foreground text-center">
                אין כללי סיווג עדיין — ניתן להוסיף תגיות ידנית בדף השליח.
              </li>
            )}
            {(rules as any[]).map((r) => (
              <li key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    אם <span className="bg-muted px-1.5 py-0.5 rounded">{r.field} {r.operator} {r.value}</span> →
                    הוסף תג <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{(r.tags as { name: string } | null)?.name}</Badge>
                  </div>
                </div>
                <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule.mutate({ id: r.id, enabled: v })} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
