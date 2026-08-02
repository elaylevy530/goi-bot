import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  MessageSquare,
  MapPin,
  Building2,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Lock,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-assistant/guide")({
  head: () => ({ meta: [{ title: "מדריך לעוזר AI — Goi" }] }),
  component: AdminAssistantGuide,
});

function AdminAssistantGuide() {
  return (
    <AdminLayout
      title="מדריך לעוזר AI"
      subtitle="כל מה שצריך לדעת כדי לעבוד נכון עם ג'וי"
      actions={
        <Button asChild variant="outline">
          <Link to="/admin-assistant">
            <ArrowLeft className="size-4" />
            חזרה לעוזר
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 max-w-5xl mx-auto">
        <IntroCard />
        <CapabilitiesGrid />
        <ApprovalCard />
        <ExamplesCard />
        <TipsCard />
        <LimitationsCard />
      </div>
    </AdminLayout>
  );
}

function IntroCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground shadow-md shrink-0">
            <Bot className="size-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">ג'וי — העוזר האישי של המנהל</h2>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              ג'וי יכול לקרוא את כל המידע במערכת ולסייע בפעולות ניהוליות שוטפות.
              הוא מחובר ישירות למסד הנתונים, כך שהתשובות שלו מבוססות על המידע האמיתי — לא על הערכות.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const capabilities = [
  {
    icon: MapPin,
    title: "שליחים",
    read: "חיפוש, סינון, פרטים מלאים וסטטיסטיקה לפי עיר, אזור, סטטוס, רכב וסוג משלוח.",
    action: "שינוי סטטוס, הוספת הערה, יצירת קישורי וואטסאפ לשליחים מסוננים.",
  },
  {
    icon: Building2,
    title: "עסקים ולקוחות",
    read: "חיפוש עסקים/מזמינים לפי שם, טלפון ועיר.",
    action: null,
  },
  {
    icon: Briefcase,
    title: "משלוחים",
    read: "חיפוש משלוחים לפי סטטוס, שליח, עסק וטווח תאריכים.",
    action: "עדכון סטטוס משלוח ושיוך שליח למשלוח.",
  },
  {
    icon: ShieldCheck,
    title: "סקירה כללית",
    read: "מבט על — כמה שליחים פעילים, כמה משלוחים פתוחים, פילוחים ועוד.",
    action: null,
  },
];

function CapabilitiesGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {capabilities.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-5 text-primary" />
                {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Badge variant="secondary" className="mb-1.5">קריאה אוטומטית</Badge>
                <p className="text-muted-foreground leading-relaxed">{c.read}</p>
              </div>
              {c.action && (
                <>
                  <Separator />
                  <div>
                    <Badge variant="outline" className="mb-1.5 border-amber-500 text-amber-700">נדרש אישור</Badge>
                    <p className="text-muted-foreground leading-relaxed">{c.action}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ApprovalCard() {
  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-amber-100 grid place-items-center text-amber-700 shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-900">פעולות שדורשות אישור</h3>
            <p className="text-amber-900/80 mt-1 leading-relaxed">
              כדי להגן על הנתונים, כל שינוי במערכת (למשל שינוי סטטוס שליח, עדכון משלוח, או שליחת וואטסאפ)
              מופיע בתור בקשת אישור בחלק התחתון של הצ'אט. תמיד תוכל לבחור בין <strong>"אשר ובצע"</strong> לבין <strong>"דחה"</strong>.
              הפעולה לא תתבצע עד שתאשר אותה במפורש.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const examples = [
  { q: "כמה שליחים פעילים יש לי?" },
  { q: "תראה לי שליחים פעילים בחיפה שרוצים משלוחי אוכל" },
  { q: "תן לי סקירה כללית של המערכת" },
  { q: "מצא לי משלוחים פתוחים מיום ראשון" },
  { q: "תעדכן את יוסי לסטטוס פעיל" },
  { q: "שלח הודעת וואטסאפ לכל הממתינים לאישור בחיפה לבוא עם תעודת זהות" },
  { q: "שייך את המשלוח 12345 לשליח דוד כהן" },
];

function ExamplesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          דוגמאות לשאלות ולבקשות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {examples.map((e, i) => (
            <li
              key={i}
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-card text-sm"
            >
              <span className="text-primary font-mono shrink-0">{i + 1}.</span>
              <span className="leading-relaxed">{e.q}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const tips = [
  {
    icon: MapPin,
    title: "דייקו במיקום",
    text: "ציינו עיר בסיס או אזור עבודה. למשל: \"שליחים פעילים בתל אביב\" או \"שליחים שעובדים בשרון\".",
  },
  {
    icon: Smartphone,
    title: "וואטסאפ = קישורים מוכנים",
    text: "ג'וי לא שולח הודעות וואטסאפ בעצמו. הוא מכין רשימת קישורי wa.me — פותחים כל קישור ושולחים את ההודעה.",
  },
  {
    icon: CheckCircle2,
    title: "בקשו סיכומים",
    text: "בקשו \"ספר לי בקצרה\" או \"תציג בטבלה\" כדי לקבל תשובות מסודרות יותר.",
  },
  {
    icon: XCircle,
    title: "אם התשובה לא מדויקת",
    text: "שאלו שאלה ספציפית יותר, או בקשו מג'וי לחפש שוב עם סינון שונה.",
  },
];

function TipsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          טיפים לתוצאות טובות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4 sm:grid-cols-2">
          {tips.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.title} className="flex items-start gap-3 text-sm">
                <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{t.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function LimitationsCard() {
  return (
    <Card className="border-destructive/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-destructive/10 grid place-items-center text-destructive shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-bold">חשוב לזכור — מגבלות ובטיחות</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <Lock className="size-4 text-primary shrink-0 mt-0.5" />
                <span>גישה לעוזר זמינה רק למנהלים עם הרשאת admin. כל פעולת שינוי דורשת אישור מפורש.</span>
              </li>
              <li className="flex items-start gap-2">
                <Smartphone className="size-4 text-primary shrink-0 mt-0.5" />
                <span>שליחת וואטסאפ מתבצעת דרך הטלפון שלך — ג'וי יוצר קישורים מוכנים (wa.me), לא שולח הודעות ישירות מהמערכת.</span>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="size-4 text-primary shrink-0 mt-0.5" />
                <span>העוזר לא מחובר למערכות חיצוניות (GPS, חשבונות בנק, ספקי וואטסאפ פעילים). הוא עובר רק על הנתונים שבמערכת.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="size-4 text-primary shrink-0 mt-0.5" />
                <span>אל תשתמשו בעוזר לקבלת החלטות שדורשות שיקול דעת אנושי (למשל פיטורין, סכסוכים, או תשלומים מיוחדים).</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
