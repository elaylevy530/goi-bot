import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNestSession,
  nestUpdateCustomerProfile,
} from "@/lib/nest-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User as UserIcon, Phone, Save } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({ meta: [{ title: "הפרופיל שלי — Goi" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const session = await fetchNestSession();
      if (!session) return;
      setName(session.profile?.name ?? "");
      setPhone(session.profile?.phone ?? session.email?.split("@")[0] ?? "");
      setEmail(session.email ?? "");
    })();
  }, []);

  const save = useMutation({
    mutationFn: () => nestUpdateCustomerProfile(name.trim()),
    onSuccess: async () => {
      toast.success("הפרופיל עודכן");
      qc.invalidateQueries();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiClientError ? e.message : "שמירה נכשלה"),
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
