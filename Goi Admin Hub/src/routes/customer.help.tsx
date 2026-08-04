import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, Phone, Mail, Package } from "lucide-react";

export const Route = createFileRoute("/customer/help")({
  head: () => ({ meta: [{ title: "עזרה — Goi" }] }),
  component: HelpPage,
});

const WA_NUMBER = "972500000000"; // TODO: replace with real support WhatsApp

function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="size-6" />
        <h1 className="text-2xl font-extrabold">עזרה ותמיכה</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="size-5 text-emerald-600" /> וואטסאפ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              הדרך המהירה ביותר לקבל תשובה. הבוט שלנו מזהה אותך אוטומטית לפי הטלפון.
            </p>
            <Button asChild className="w-full">
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> פתיחת שיחה
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="size-5 text-primary" /> טלפון</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">שירות לקוחות בימי חול 08:00-20:00.</p>
            <Button asChild variant="outline" className="w-full">
              <a href={`tel:+${WA_NUMBER}`}>
                <Phone className="size-4" /> {`+${WA_NUMBER.slice(0,3)}-${WA_NUMBER.slice(3,5)}-${WA_NUMBER.slice(5)}`}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>שאלות נפוצות</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Faq q="איך אני מזמין משלוח?"
               a="מהמסך 'בית' — בחר סוג שירות (מהיום להיום / מתוזמן / הובלה קטנה / הובלה גדולה), מלא כתובות ופרטים ואשר תשלום." />
          <Faq q="איפה רואים את ההזמנות שלי?"
               a="בלשונית 'ההזמנות שלי' תמצא את כל הפעילות, כולל מעקב חי אחרי מוביל שאושר." />
          <Faq q="האם אפשר לבטל הזמנה?"
               a="ניתן לבטל כל עוד לא שובץ מוביל. אחרי שיבוץ — יש לפנות לתמיכה." />
          <Faq q="אני יכול לנהל הזמנות גם דרך וואטסאפ?"
               a="כן. הבוט מזהה אותך לפי הטלפון וניתן לפתוח, לעקוב ולבטל הזמנות בשיחה." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="size-5" /> טיפ</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Mail className="size-4 mt-0.5 shrink-0" />
            <span>ההזמנות שלך מסונכרנות בין הפאנל, וואטסאפ והמעקב החי — לא משנה איפה תעדכן, כולם רואים את אותו הסטטוס.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="border rounded-lg p-3 open:bg-muted/30">
      <summary className="font-semibold cursor-pointer">{q}</summary>
      <p className="text-muted-foreground mt-2">{a}</p>
    </details>
  );
}
