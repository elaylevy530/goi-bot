import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Server, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ApiClientError, fetchBackendHealth } from "@/lib/api-client";
import {
  clearNestAccessToken,
  getNestAccessToken,
  nestAdminPing,
  nestLogin,
  nestMe,
  nestRegister,
  type NestAdminPing,
  type NestAuthUser,
} from "@/lib/nest-auth";
import { toast } from "sonner";

type AdminPingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: NestAdminPing }
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

/**
 * Nest health + JWT diagnostics (Settings).
 * Product auth is Nest JWT — this card is a convenience smoke panel.
 */
export function NestBackendStatusCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nestUser, setNestUser] = useState<NestAuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminPing, setAdminPing] = useState<AdminPingState>({ status: "idle" });

  const health = useQuery({
    queryKey: ["nest-backend-health"],
    queryFn: fetchBackendHealth,
    retry: 1,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const token = getNestAccessToken();
    if (!token) {
      setNestUser(null);
      return;
    }
    let cancelled = false;
    nestMe(token)
      .then((user) => {
        if (!cancelled) {
          setNestUser(user);
          setAuthError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearNestAccessToken();
        setNestUser(null);
        setAdminPing({ status: "idle" });
        setAuthError(err instanceof ApiClientError ? err.message : "פג תוקף סשן Nest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runAuth(mode: "login" | "register") {
    setAuthBusy(true);
    setAuthError(null);
    setAdminPing({ status: "idle" });
    try {
      const session =
        mode === "login"
          ? await nestLogin(email.trim(), password)
          : await nestRegister(email.trim(), password);
      const user = await nestMe(session.accessToken);
      setNestUser(user);
      toast.success(mode === "login" ? "Nest JWT login OK" : "Nest JWT register OK");
    } catch (err: unknown) {
      const message = err instanceof ApiClientError ? err.message : "Nest auth failed";
      setAuthError(message);
      toast.error(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function runAdminPing() {
    setAdminPing({ status: "loading" });
    try {
      const data = await nestAdminPing();
      setAdminPing({ status: "ok", data });
      toast.success("Admin-ping OK");
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 403) {
        setAdminPing({
          status: "denied",
          message: err.message || "אין הרשאת admin/manager",
        });
        return;
      }
      const message = err instanceof ApiClientError ? err.message : "Admin-ping failed";
      setAdminPing({ status: "error", message });
      toast.error(message);
    }
  }

  function logoutNest() {
    clearNestAccessToken();
    setNestUser(null);
    setAuthError(null);
    setAdminPing({ status: "idle" });
    toast.success("Nest JWT cleared");
  }

  const healthOk = health.data?.ok === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Server className="size-4 text-primary" /> Nest API (Phase 1)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
          >
            <RefreshCw className={`size-4 ${health.isFetching ? "animate-spin" : ""}`} /> רענן
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          מוצר מחובר ל-Nest JWT. כרטיס זה לבדיקת health / me / admin-ping.
        </div>

        <div className="flex items-center justify-between gap-3 p-3 border rounded-md">
          <div className="text-end space-y-1">
            <div className="text-sm font-semibold">Health</div>
            {health.isLoading ? (
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <Loader2 className="size-3 animate-spin" /> בודק...
              </div>
            ) : health.isError ? (
              <div className="text-xs text-rose-600">
                {health.error instanceof ApiClientError
                  ? health.error.message
                  : "Nest unreachable"}
              </div>
            ) : health.data ? (
              <div className="text-xs text-muted-foreground text-left" dir="ltr">
                {health.data.service} · db {health.data.database} · {health.data.env}
              </div>
            ) : null}
          </div>
          {health.isLoading ? (
            <Badge variant="outline">…</Badge>
          ) : healthOk ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
              UP
            </Badge>
          ) : (
            <Badge className="bg-rose-100 text-rose-800 border-rose-200" variant="outline">
              DOWN
            </Badge>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="text-sm font-semibold text-end">Nest JWT</div>
          {nestUser ? (
            <div className="space-y-3">
              <div className="space-y-2 p-3 border rounded-md">
                <div className="text-sm text-end" dir="ltr">
                  {nestUser.email}
                </div>
                <div className="text-xs text-muted-foreground text-end" dir="ltr">
                  {nestUser.userId}
                  {nestUser.roles.length > 0 ? ` · ${nestUser.roles.join(", ")}` : ""}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={logoutNest}>
                  נקה Nest JWT
                </Button>
              </div>

              <div className="space-y-2 p-3 border rounded-md">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={adminPing.status === "loading"}
                    onClick={() => void runAdminPing()}
                  >
                    {adminPing.status === "loading" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Admin-ping
                  </Button>
                  <div className="text-sm font-semibold text-end">Admin-ping</div>
                </div>
                <div className="text-xs text-muted-foreground text-end">
                  דורש תפקיד admin או manager ב-Nest user_roles.
                </div>
                {adminPing.status === "ok" ? (
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      className="bg-emerald-100 text-emerald-800 border-emerald-200"
                      variant="outline"
                    >
                      OK
                    </Badge>
                    <div className="text-xs text-muted-foreground text-left" dir="ltr">
                      {adminPing.data.roles.join(", ") || "no roles"}
                    </div>
                  </div>
                ) : null}
                {adminPing.status === "denied" ? (
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      className="bg-amber-100 text-amber-900 border-amber-200"
                      variant="outline"
                    >
                      403
                    </Badge>
                    <div className="text-xs text-amber-800 text-end">{adminPing.message}</div>
                  </div>
                ) : null}
                {adminPing.status === "error" ? (
                  <div className="text-xs text-rose-600 text-end">{adminPing.message}</div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>אימייל Nest</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  type="email"
                  autoComplete="off"
                  placeholder="dev@example.com"
                />
              </div>
              <div>
                <Label>סיסמה Nest</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  type="password"
                  autoComplete="new-password"
                  placeholder="min 8 chars for register"
                />
              </div>
              {authError ? (
                <div className="text-xs text-rose-600 text-end">{authError}</div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={authBusy || !email.trim() || !password}
                  onClick={() => void runAuth("login")}
                >
                  {authBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Login
                </Button>
                <Button
                  disabled={authBusy || !email.trim() || password.length < 8}
                  onClick={() => void runAuth("register")}
                >
                  {authBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Register
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
