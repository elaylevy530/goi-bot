import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nestListCustomers } from "@/lib/nest-accounts";
import { ViewPanelButton } from "@/components/ViewPanelButton";
import { MessageCircle, CheckCircle2, Clock, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/businesses")({
  head: () => ({ meta: [{ title: "ניהול עסקים — Goi" }] }),
  component: BusinessesPage,
});

const NICHE_LABELS: Record<string, string> = {
  restaurant: "מסעדה / אוכל / בית קפה",
  local_business: "עסק מקומי",
  manual_dispatch: "שליחויות ידניות",
  online_store: "חנות אונליין",
  pharmacy_clinic: "בית מרקחת / מרפאה",
};

function BusinessesPage() {
  const [tab, setTab] = useState<"all" | "pending" | "signed" | "no_payment">("all");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: () => nestListCustomers({ limit: 1000 }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (tab === "pending" && r.signed_agreement_at) return false;
      if (tab === "signed" && !r.signed_agreement_at) return false;
      if (tab === "no_payment" && r.payment_method_on_file) return false;
      if (!q) return true;
      return [r.name, r.business_name, r.phone, r.email, r.city].some((v) =>
        (v ?? "").toString().toLowerCase().includes(q),
      );
    });
  }, [rows, tab, search]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r: any) => !r.signed_agreement_at).length,
    signed: rows.filter((r: any) => r.signed_agreement_at).length,
    no_payment: rows.filter((r: any) => !r.payment_method_on_file).length,
  }), [rows]);

  return (
    <AdminLayout title="ניהול עסקים" subtitle={`${rows.length} עסקים רשומים`}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">הכל ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">ממתינים לחתימה ({counts.pending})</TabsTrigger>
              <TabsTrigger value="signed">חתומים ({counts.signed})</TabsTrigger>
              <TabsTrigger value="no_payment">ללא אמצעי תשלום ({counts.no_payment})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="חיפוש שם / טלפון / עיר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם העסק</TableHead>
                  <TableHead>איש קשר</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>נישה</TableHead>
                  <TableHead>עיר</TableHead>
                  <TableHead>הסכם</TableHead>
                  <TableHead>תשלום</TableHead>
                  <TableHead>נרשם</TableHead>
                  <TableHead className="text-end">פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">אין עסקים בקטגוריה זו.</TableCell></TableRow>
                )}
                {filtered.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">
                      {r.business_name || "—"}
                      {r.business_niche_details && (
                        <div className="text-xs text-muted-foreground">{r.business_niche_details}</div>
                      )}
                    </TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                    <TableCell><Badge variant="secondary">{NICHE_LABELS[r.business_niche] ?? r.business_niche ?? "—"}</Badge></TableCell>
                    <TableCell>{r.city ?? "—"}</TableCell>
                    <TableCell>
                      {r.signed_agreement_at ? (
                        <Badge variant="outline" className="bg-success-bg text-success-text border-primary/20">
                          <CheckCircle2 className="size-3 me-1" />
                          חתום
                          {r.signed_agreement_version && <span className="ms-1 text-[10px] opacity-70">v{r.signed_agreement_version}</span>}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="size-3 me-1" /> ממתין
                        </Badge>
                      )}
                      {r.signed_agreement_at && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {r.signed_agreement_name} · {new Date(r.signed_agreement_at).toLocaleDateString("he-IL")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.payment_method_on_file ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <CreditCard className="size-3 me-1" /> קיים
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">חסר</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <ViewPanelButton
                          panel="business"
                          entityId={r.id}
                          label="פאנל"
                          variant="outline"
                          size="sm"
                        />
                        <Link to="/businesses/$id" params={{ id: r.id }}>
                          <Button size="icon" variant="ghost"><ExternalLink className="size-4" /></Button>
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => {
                          const phone = (r.phone ?? "").replace(/\D/g, "").replace(/^0/, "972");
                          if (phone) window.open(`https://wa.me/${phone}`, "_blank");
                        }}>
                          <MessageCircle className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
