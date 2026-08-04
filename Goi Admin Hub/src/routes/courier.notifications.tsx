import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/courier/notifications")({
  head: () => ({ meta: [{ title: "התראות — Goi" }] }),
  component: NotificationsPage,
});

type Item = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
  audience: "single" | "all";
};

function NotificationsPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Item[]> => {
      const { data } = await supabase
        .from("courier_admin_notifications")
        .select("id, title, body, link_url, read_at, created_at, audience")
        .or(`courier_id.eq.${me!.id},audience.eq.all`)
        .order("created_at", { ascending: false })
        .limit(80);
      return (data ?? []) as Item[];
    },
  });

  // Realtime — refresh on insert/update
  useEffect(() => {
    if (!me?.id) return;
    const ch = supabase
      .channel(`courier-admin-notifs-${me.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courier_admin_notifications" },
        () => qc.invalidateQueries({ queryKey: ["admin-notifications", me.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me?.id, qc]);

  // Mark all unread as read on view
  useEffect(() => {
    if (!me?.id || items.length === 0) return;
    const unread = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    void supabase
      .from("courier_admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread);
  }, [me?.id, items]);

  return (
    <CourierShell title="התראות" subtitle="הודעות מההנהלה">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-14 text-center text-slate-500">
              <Bell className="size-10 mx-auto mb-2 opacity-50" /> אין הודעות חדשות מההנהלה
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <li
                    key={n.id}
                    className={`p-4 flex items-start gap-4 ${isUnread ? "bg-emerald-50/40" : ""}`}
                  >
                    <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${isUnread ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      <Bell className="size-5" />
                    </div>
                    <div className="flex-1 text-end min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{n.title}</div>
                      {n.body && <div className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{n.body}</div>}
                      {n.link_url && (
                        <a href={n.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-700 mt-1.5 underline">
                          <ExternalLink className="size-3.5" /> פתיחת קישור
                        </a>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-end gap-1">
                        <Clock className="size-3" />
                        {new Date(n.created_at).toLocaleString("he-IL")}
                        {n.audience === "all" && <span className="mr-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">לכלל השליחים</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </CourierShell>
  );
}
