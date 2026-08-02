import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  nestListMyNotifications,
  nestMarkAllNotificationsRead,
  nestMarkNotificationRead,
} from "@/lib/nest-accounts";
import { Bell, Check, CheckCheck } from "lucide-react";
import { EmptyState } from "./business.dashboard";
import { PushEnableRowGeneric } from "@/components/PushEnableRow";


export const Route = createFileRoute("/business/notifications")({
  head: () => ({ meta: [{ title: "התראות — Goi" }] }),
  ssr: false,
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["notifications", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyNotifications(200),
  });

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      if (id) await nestMarkNotificationRead(id);
      else await nestMarkAllNotificationsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notif-recent"] });
    },
  });

  const unread = (items ?? []).filter((n: any) => !n.read_at).length;

  return (
    <BusinessShell title="התראות" subtitle={`${unread} לא נקראו`} headerExtra={
      unread > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => markRead.mutate(undefined)}><CheckCheck className="size-4" /> סמן הכל כנקרא</Button>
        </div>
      ) : null
    }>
      {me?.id && (
        <div className="mb-4">
          <PushEnableRowGeneric
            role="business"
            ownerId={me.id}
            copy={{
              title: "הפעל התראות Push",
              subtitle: "קבל התראה מיידית כשהשליח מאשר, יוצא לאיסוף, אוסף או מוסר",
              grantedTitle: "התראות Push פעילות",
              grantedSubtitle: "תקבל עדכונים על כל שלב במשלוח גם כשהאפליקציה סגורה",
            }}
          />
        </div>
      )}
      <Card className="rounded-2xl border-slate-200 shadow-sm">

        <CardContent className="p-0">
          {!items || items.length === 0 ? (
            <div className="p-6"><EmptyState icon={Bell} title="אין התראות" desc="פה יופיעו עדכוני סטטוס, הצעות מחיר, תזכורות ועוד." /></div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n: any) => (
                <li key={n.id} className={`p-4 flex items-start gap-3 ${!n.read_at ? "bg-emerald-50/30" : ""}`}>
                  <div className={`mt-1 size-2.5 rounded-full ${!n.read_at ? "bg-[#35AD29]" : "bg-slate-200"}`} />
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link to={n.link} className="block hover:underline">
                        <div className="font-bold text-slate-900 text-sm">{n.title}</div>
                      </Link>
                    ) : <div className="font-bold text-slate-900 text-sm">{n.title}</div>}
                    {n.body && <div className="text-sm text-slate-600 mt-0.5">{n.body}</div>}
                    <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString("he-IL")}</div>
                  </div>
                  {!n.read_at && (
                    <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} className="shrink-0">
                      <Check className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </BusinessShell>
  );
}
