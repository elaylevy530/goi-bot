import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateCustomerProfileFn } from "@/lib/customer-account.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User as UserIcon, Phone, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({ meta: [{ title: "הפרופיל שלי — Goi" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const update = useServerFn(updateCustomerProfileFn);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as { full_name?: string; phone?: string };
      setName(meta.full_name ?? "");
      setPhone(meta.phone ?? u.email?.split("@")[0] ?? "");
      setEmail(u.email ?? "");
    })();
  }, []);

  const save = useMutation({
    mutationFn: () => update({ data: { full_name: name.trim() } }),
    onSuccess: async () => {
      toast.success("הפרופיל עודכן");
      // refresh session so metadata is fresh
      await supabase.auth.refreshSession();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e?.message ?? "שמירה נכשלה"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("שם קצר מדי");
    save.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <UserIcon className="size-6" />
        <h1 className="text-2xl font-extrabold">הפרופיל שלי</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>פרטים אישיים</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>שם מלא</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Phone className="size-3.5" /> טלפון</Label>
              <Input value={phone} disabled dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">
                הטלפון משמש לזיהוי ההזמנות. לשינוי — פנה לתמיכה.
              </p>
            </div>
            <div>
              <Label>מזהה משתמש</Label>
              <Input value={email} disabled dir="ltr" />
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              שמירה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
