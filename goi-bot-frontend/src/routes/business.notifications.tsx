import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bike, Check, CheckCheck, Package, Wallet } from "lucide-react";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { FilterTabs, Panel, Toggle } from "@/components/business/goi/GoiUi";
import {
  nestListMyNotifications,
  nestMarkAllNotificationsRead,
  nestMarkNotificationRead,
  nestUpdateMyCustomer,
} from "@/lib/nest-accounts";
import { PushEnableRowGeneric } from "@/components/PushEnableRow";
import { toast } from "sonner";

export const Route = createFileRoute("/business/notifications")({
  head: () => ({ meta: [{ title: "הודעות ועדכונים — Goi" }] }),
  ssr: false,
  component: NotificationsPage,
});

function bucketOf(n: { title?: string; body?: string }) {
  const t = `${n.title || ""} ${n.body || ""}`;
  if (/חיוב|תשלום|ארנק|חשבונ/.test(t)) return "billing";
  if (/שליח|שיחה|צ׳אט|צ'אט/.test(t)) return "couriers";
  return "orders";
}

function NotificationsPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const m = me as { notify_wa?: boolean; notify_email?: boolean } | null;
  const [pushOn, setPushOn] = useState(m?.notify_wa !== false);
  const [emailOn, setEmailOn] = useState(m?.notify_email !== false);

  const { data: items = [] } = useQuery({
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
  const savePrefs = useMutation({
    mutationFn: (body: Record<string, unknown>) => nestUpdateMyCustomer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-me"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = items.filter((n: { read_at?: string | null }) => !n.read_at).length;
  const shown = useMemo(
    () => items.filter((n: { title?: string; body?: string }) => tab === "all" || bucketOf(n) === tab),
    [items, tab],
  );

  return (
    <BusinessShell
      title="הודעות ועדכונים"
      subtitle={`${unread} לא נקראו`}
      headerExtra={
        unread > 0 ? (
          <button type="button" className="btn outline" onClick={() => markRead.mutate(undefined)}>
            <CheckCheck size={16} /> סמן הכל כנקרא
          </button>
        ) : null
      }
    >
      <div className="notifications-layout extra-page extra-notifications">
        <Panel>
          <FilterTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "הכל", count: items.length },
              { value: "orders", label: "הזמנות" },
              { value: "couriers", label: "שליחים" },
              { value: "billing", label: "תשלומים" },
            ]}
          />
          {me?.id && (
            <div style={{ margin: "12px 0 18px" }}>
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
          <div className="notification-events">
            {shown.length === 0 && <div className="empty-state">אין עדכונים בקטגוריה זו</div>}
            {shown.map((n: any, i: number) => {
              const tone = ["green", "amber", "blue", "purple"][i % 4];
              const Icon = bucketOf(n) === "billing" ? Wallet : bucketOf(n) === "couriers" ? Bike : Package;
              const inner = (
                <>
                  <span className={"event-icon " + tone}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{n.title}</strong>
                    {n.body && <p>{n.body}</p>}
                  </div>
                  <small>{n.created_at ? new Date(n.created_at).toLocaleString("he-IL") : ""}</small>
                  {!n.read_at && <i />}
                </>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link as never}
                  className={n.read_at ? "read" : ""}
                  onClick={() => {
                    if (!n.read_at) markRead.mutate(n.id);
                  }}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  className={n.read_at ? "read" : ""}
                  onClick={() => {
                    if (!n.read_at) markRead.mutate(n.id);
                  }}
                >
                  {inner}
                  {!n.read_at && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="העדפות התראות">
          <Toggle
            label="עדכונים בוואטסאפ"
            description="ההעדפה נשמרת בחשבון העסק"
            checked={pushOn}
            onChange={(v) => {
              setPushOn(v);
              savePrefs.mutate({ notify_wa: v });
            }}
          />
          <Toggle
            label="עדכונים באימייל"
            checked={emailOn}
            onChange={(v) => {
              setEmailOn(v);
              savePrefs.mutate({ notify_email: v });
            }}
          />
          <p className="hint">שליחת ההודעות בפועל תלויה בהגדרות המערכת הקיימות. אין כאן ערוץ SMS נפרד.</p>
        </Panel>
      </div>
    </BusinessShell>
  );
}
