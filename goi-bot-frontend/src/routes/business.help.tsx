import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bike, CheckCheck, ChevronLeft, CreditCard, Headphones, MessageCircle, Package } from "lucide-react";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Panel } from "@/components/business/goi/GoiUi";

export const Route = createFileRoute("/business/help")({
  head: () => ({ meta: [{ title: "עזרה ותמיכה — Goi" }] }),
  ssr: false,
  component: HelpPage,
});

const FAQ = [
  { q: "איך פותחים משלוח חדש?", a: "בוחרים «הזמנה חדשה» בתפריט, ממלאים כתובת איסוף ומסירה, פרטי נמען, תכולה ותזמון, ואז מאשרים. המשלוח יופיע במעקב משלוחים פעילים או בהזמנות נכנסות לפי סוג התמחור." },
  { q: "איפה רואים את השליח?", a: "במסך «מעקב משלוחים פעילים» בוחרים משלוח. אם שובץ שליח אפשר לפתוח «עקוב במפה» או «צ׳אט עם השליח». בלי שליח הכפתור מושבת." },
  { q: "איפה נמצאות החשבוניות?", a: "בתפריט «חשבוניות וחיובים» מופיעות יתרת הארנק, פירוט העסקאות וחשבוניות חודשיות להורדה." },
  { q: "איך מבטלים משלוח?", a: "בפרטי המשלוח או בהזמנות נכנסות אפשר לבטל כל עוד השליח עדיין לא אסף. לאחר איסוף יש לפנות לתמיכה." },
  { q: "איפה מנהלים צוות?", a: "«צוות והרשאות» נמצא בתוך «העסק שלי», ולא בתפריט הראשי." },
];

const TOPICS = [
  { t: "עזרה בהזמנה חדשה", i: Package, to: "/business/new-delivery" },
  { t: "בעיה במשלוח פעיל", i: Bike, to: "/business/active" },
  { t: "המשלוח הגיע ונשמח לעזרה", i: CheckCheck, to: "/business/history" },
  { t: "חיובים ותשלומים", i: CreditCard, to: "/business/billing" },
];

function HelpPage() {
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const first = ((me as { name?: string } | null)?.name || "שלום").split(" ")[0];

  return (
    <BusinessShell>
      <div className="support-home extra-page extra-support">
        <div className="support-welcome">
          <div>
            <h1>
              היי {first},
              <br />
              <span>איך אפשר לעזור?</span>
            </h1>
            <p>
              אנחנו כאן בשבילך. בחר נושא או פתח פנייה
              <br />
              לצוות התמיכה.
            </p>
          </div>
          <span className="support-symbol">
            <MessageCircle size={65} />
          </span>
        </div>
        <button type="button" className="panel support-agent" onClick={() => navigate({ to: "/business/support" })}>
          <span className="round-icon">
            <Headphones />
          </span>
          <div>
            <h3>פנייה לתמיכה</h3>
            <p>
              פתח קריאה במערכת או דבר איתנו בוואטסאפ.
              <br />
              אין כאן בוט הדגמה — הפנייה מגיעה לצוות האמיתי.
            </p>
          </div>
          <ChevronLeft />
        </button>
        <div className="support-topics">
          {TOPICS.map((s) => (
            <Link key={s.t} to={s.to as never}>
              <s.i size={20} />
              {s.t}
              <ChevronLeft size={16} />
            </Link>
          ))}
        </div>
        <Panel title="שאלות נפוצות">
          <Accordion type="single" collapsible>
            {FAQ.map((s) => (
              <AccordionItem key={s.q} value={s.q}>
                <AccordionTrigger>{s.q}</AccordionTrigger>
                <AccordionContent>{s.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Panel>
      </div>
    </BusinessShell>
  );
}
