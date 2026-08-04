import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, Banknote, ExternalLink, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/couriers/bank-details")({
  component: BankDetailsPage,
});

type Row = {
  id: string;
  full_name: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  bank_account_owner: string | null;
  bank_details_verified: boolean | null;
  bank_details_verified_at: string | null;
};

function BankDetailsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "missing">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["couriers-bank-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couriers")
        .select("id, full_name, phone:whatsapp_phone, bank_name, bank_branch, bank_account, bank_account_owner, bank_details_verified, bank_details_verified_at")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const setVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("couriers")
        .update({
          bank_details_verified: verified,
          bank_details_verified_at: verified ? new Date().toISOString() : null,
          bank_details_verified_by: verified ? u.user?.id ?? null : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers-bank-details"] });
    },
    onError: (e: any) => toast.error(e?.message || "שגיאה בעדכון"),
  });

  const rows = useMemo(() => {
    const s = search.trim();
    return (data ?? []).filter((r) => {
      const has = !!(r.bank_name && r.bank_account);
      if (filter === "verified" && !r.bank_details_verified) return false;
      if (filter === "unverified" && (!has || r.bank_details_verified)) return false;
      if (filter === "missing" && has) return false;
      if (!s) return true;
      const hay = `${r.full_name ?? ""} ${r.phone ?? ""} ${r.bank_name ?? ""} ${r.bank_account ?? ""} ${r.bank_account_owner ?? ""}`;
      return hay.toLowerCase().includes(s.toLowerCase());
    });
  }, [data, search, filter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const has = list.filter((r) => r.bank_name && r.bank_account);
    return {
      total: list.length,
      withBank: has.length,
      verified: has.filter((r) => r.bank_details_verified).length,
      missing: list.length - has.length,
    };
  }, [data]);

  return (
    <AdminLayout title="פרטי בנק של שליחים">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="סה״כ שליחים" value={stats.total} icon={<Banknote className="size-4" />} />
          <StatCard label="עם פרטי בנק" value={stats.withBank} icon={<Banknote className="size-4 text-blue-600" />} />
          <StatCard label="מאומתים" value={stats.verified} icon={<ShieldCheck className="size-4 text-emerald-600" />} />
          <StatCard label="ללא פרטים" value={stats.missing} icon={<ShieldAlert className="size-4 text-amber-600" />} />
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש שם / טלפון / חשבון..."
                className="pr-9"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "verified", "unverified", "missing"] as const).map((k) => (
                <Button
                  key={k}
                  variant={filter === k ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(k)}
                >
                  {k === "all" && "הכל"}
                  {k === "verified" && "מאומתים"}
                  {k === "unverified" && "ממתינים לאימות"}
                  {k === "missing" && "ללא פרטים"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> טוען...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">לא נמצאו תוצאות</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שליח</TableHead>
                    <TableHead>בנק</TableHead>
                    <TableHead>סניף</TableHead>
                    <TableHead>חשבון</TableHead>
                    <TableHead>בעל החשבון</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const has = !!(r.bank_name && r.bank_account);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.phone || ""}</div>
                        </TableCell>
                        <TableCell>{r.bank_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{r.bank_branch || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="font-mono">{r.bank_account || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{r.bank_account_owner || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {!has ? (
                            <Badge variant="outline" className="gap-1">
                              <ShieldAlert className="size-3" /> חסרים פרטים
                            </Badge>
                          ) : r.bank_details_verified ? (
                            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                              <CheckCircle2 className="size-3" /> מאומת
                              {r.bank_details_verified_at && (
                                <span className="text-[10px] opacity-80 mr-1">
                                  {new Date(r.bank_details_verified_at).toLocaleDateString("he-IL")}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldAlert className="size-3" /> ממתין לאימות
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 justify-end">
                            {has && !r.bank_details_verified && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setVerified.mutate({ id: r.id, verified: true })}
                                disabled={setVerified.isPending}
                              >
                                <CheckCircle2 className="size-3.5 ml-1" /> אמת
                              </Button>
                            )}
                            {has && r.bank_details_verified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVerified.mutate({ id: r.id, verified: false })}
                                disabled={setVerified.isPending}
                              >
                                <XCircle className="size-3.5 ml-1" /> בטל אימות
                              </Button>
                            )}
                            <Link to="/couriers/$id" params={{ id: r.id }}>
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="size-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          {icon}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
