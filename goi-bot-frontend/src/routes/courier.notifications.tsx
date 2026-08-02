import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
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

  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Item[]> => {
      throw new Error("TODO Nest: courier notification inbox endpoint is not available");
    },
  });

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
