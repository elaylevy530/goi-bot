import { createFileRoute, Link } from "@tanstack/react-router";
import { BusinessShell } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageSquare, Package, Wallet, Star, MapPin } from "lucide-react";

export const Route = createFileRoute("/business/help")({
  head: () => ({ meta: [{ title: "עזרה — Goi" }] }),
  ssr: false,
  component: HelpPage,
});

const FAQ = [
  { q: "איך מזמינים שליח ראשון?", a: "לחצו על 'משלוח חדש' בתפריט, מלאו כתובת איסוף, מסירה ופרטי הנמען. תוך שניות שליחים פנויים יקבלו את ההזמנה." },
  { q: "מה ההבדל בין מצב פרטי לעסקי?", a: "במצב פרטי תפריט מקוצר — רק משלוחים והיסטוריה. עסקי כולל חשבונית חודשית, סניפים, קווי חלוקה והזמנות קבועות. ניתן לשנות בכל רגע ב'הגדרות'." },
  { q: "איך עוקבים אחרי שליח בזמן אמת?", a: "במסך 'המשלוחים שלי' לחצו על המשלוח, ואז 'מעקב חי'. תופיע מפה עם מיקום השליח. ניתן גם לשתף קישור עם הנמען." },
  { q: "איך מבטלים משלוח?", a: "בכניסה לפרטי המשלוח יש כפתור 'בטל'. ניתן לבטל רק אם השליח עדיין לא אסף את החבילה." },
  { q: "איך טוענים את הארנק?", a: "בתפריט יש 'ארנק'. בחרו סכום (החל מ-10 ש״ח) ולחצו טען. בטעינה של 100₪+ מקבלים 10% מתנה." },
  { q: "איך שומרים נמענים חוזרים?", a: "מתוך משלוח קיים — 'שמור נמען'. כל הנמענים מופיעים ב'אנשי קשר' ויופיעו כהשלמה אוטומטית בטופס משלוח." },
  { q: "מה זה תבנית משלוח?", a: "אם אתם שולחים שוב ושוב אותם פרטים, שמרו אותם פעם אחת כתבנית. בפעם הבאה — לחיצה אחת ויש משלוח מוכן." },
  { q: "איך מקבלים חשבונית?", a: "כל משלוח שהושלם נכנס ל'חיובים ותשלומים'. שם ניתן להוריד חשבונית מס לטווח תאריכים." },
];

const GUIDES = [
  { icon: Package, title: "המדריך המלא להזמנה ראשונה", desc: "צעד אחר צעד — מהרגע שנכנסתם ועד שהחבילה נמסרת." },
  { icon: MapPin, title: "מעקב חי וקישור לנמען", desc: "איך לשתף את הנמען בקישור מעקב מבלי שיצטרך להתחבר." },
  { icon: Wallet, title: "ארנק, קופונים וחיובים", desc: "כל מה שצריך לדעת על תשלומים, זיכויים והנחות." },
  { icon: Star, title: "שליחים מועדפים ודירוגים", desc: "איך בונים רשימת שליחים שאתם אוהבים לעבוד איתם." },
];

function HelpPage() {
  return (
    <BusinessShell title="מרכז עזרה" subtitle="שאלות נפוצות, מדריכים ויצירת קשר">
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.title} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="size-10 grid place-items-center rounded-xl bg-emerald-50 text-[#35AD29] shrink-0"><Icon className="size-5" /></span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{g.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{g.desc}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><HelpCircle className="size-4 text-[#35AD29]" /> שאלות נפוצות</div>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-right text-sm font-bold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-slate-600">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm bg-emerald-50/50">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-extrabold text-slate-900">לא מצאת תשובה?</div>
              <div className="text-sm text-slate-600 mt-0.5">צוות התמיכה זמין בצ׳אט וביצירת פניות.</div>
            </div>
            <Link to="/business/support" className="px-4 py-2 rounded-xl bg-[#35AD29] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#2d9623]">
              <MessageSquare className="size-4" /> פתח פנייה לתמיכה
            </Link>
          </CardContent>
        </Card>
      </div>
    </BusinessShell>
  );
}
