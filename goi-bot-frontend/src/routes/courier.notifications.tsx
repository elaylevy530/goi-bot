import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CourierShell } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  nestListMyCourierNotifications,
  nestMarkCourierNotificationRead,
} from "@/lib/nest-domain";
import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/notifications")({
  head: () => ({ meta: [{ title: "הודעות ועדכונים — Goi" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["my-courier-notifications"],
    queryFn: nestListMyCourierNotifications,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => nestMarkCourierNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-courier-notifications"] });
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      toast.success("סומן כנקרא");
    },
    onError: () => toast.error("שגיאה בסימון ההודעה"),
  });

  const unreadCount = notifications.filter((n: any) => !n.read_at).length;

  return (
    <CourierShell
      title="הודעות ועדכונים"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} הודעות שלא נקראו`
          : "אין הודעות חדשות"
      }
    >
      <div className="space-y-4">
        {unreadCount > 0 && (
          <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
                <Bell className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-text-strong">
                  {unreadCount} הודעות חדשות
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  לחץ על הודעה כדי לסמן כנקרא
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-text-muted">טוען הודעות...</div>
        ) : notifications.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="size-16 rounded-full bg-muted grid place-items-center mx-auto mb-4">
                <Inbox className="size-8 text-text-muted" />
              </div>
              <div className="text-lg font-bold text-text-strong mb-2">
                אין הודעות עדיין
              </div>
              <div className="text-sm text-text-muted">
                הודעות ועדכונים מהמערכת יופיעו כאן
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification: any) => {
              const isUnread = !notification.read_at;
              return (
                <Card
                  key={notification.id}
                  className={`rounded-2xl shadow-sm transition-all ${
                    isUnread
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-10 rounded-full grid place-items-center shrink-0 ${
                          isUnread
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        <Bell
                          className={`size-5 ${
                            isUnread ? "text-primary" : "text-text-muted"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-bold text-text-strong">
                            {notification.title}
                          </div>
                          {isUnread && (
                            <Badge className="bg-primary text-primary-foreground shrink-0">
                              חדש
                            </Badge>
                          )}
                        </div>

                        {notification.body && (
                          <div className="text-sm text-text-subtle whitespace-pre-wrap mb-3">
                            {notification.body}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-xs text-text-muted">
                            {new Date(
                              notification.created_at
                            ).toLocaleString("he-IL", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>

                          <div className="flex items-center gap-2">
                            {notification.link_url && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <a
                                  href={notification.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="size-3 ml-1" />
                                  פתח קישור
                                </a>
                              </Button>
                            )}

                            {isUnread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => markRead.mutate(notification.id)}
                                disabled={markRead.isPending}
                              >
                                <CheckCheck className="size-3 ml-1" />
                                סמן כנקרא
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CourierShell>
  );
}
