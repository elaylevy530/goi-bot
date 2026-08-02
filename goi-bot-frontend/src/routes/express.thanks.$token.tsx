import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/express/thanks/$token")({
  head: () => ({
    meta: [
      { title: "ההזמנה נשלחה — Goi Express" },
      { name: "description", content: "ההזמנה נשלחה לרשת השליחים. עקוב אחריה בקישור המעקב." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThanksPage,
});

const serif = { fontFamily: "'Instrument Serif', 'David Libre', serif" };

function ThanksPage() {
  const { token } = Route.useParams();
  const trackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/track/${token}`
    : `/track/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      toast.success("הקישור הועתק");
    } catch { toast.error("לא הצליח להעתיק"); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f3ee] text-[#0d0d0d] grid place-items-center px-5 py-10">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-[#0d0d0d]/5 text-center space-y-6">
        <div className="size-20 rounded-full bg-[#35AD29]/15 grid place-items-center mx-auto">
          <CheckCircle2 className="size-10 text-[#35AD29]" strokeWidth={2.5} />
        </div>

        <div>
          <h1 style={serif} className="text-4xl lg:text-5xl leading-tight mb-2">תודה!</h1>
          <p className="text-[#0d0d0d]/60">ההזמנה נשלחה לשליחים הזמינים באזור. תקבל עדכון ברגע ששליח יאשר.</p>
        </div>

        <div className="bg-[#f5f3ee] rounded-2xl p-5 text-right space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-[#0d0d0d]/50">קישור מעקב חי</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate text-xs text-[#0d0d0d]/70 font-mono ltr text-left" dir="ltr">{trackUrl}</div>
            <button onClick={copy} className="size-9 grid place-items-center rounded-lg bg-[#0d0d0d] text-[#f5f3ee] hover:bg-[#35AD29]" aria-label="העתק">
              <Copy className="size-4" />
            </button>
          </div>
          <Link
            to="/track/$token"
            params={{ token }}
            className="inline-flex items-center gap-2 w-full justify-center py-3 bg-[#35AD29] text-white rounded-xl text-sm font-bold hover:bg-[#2d9623]"
          >
            <MapPin className="size-4" /> פתח מסך מעקב
          </Link>
        </div>

        <p className="text-xs text-[#0d0d0d]/50">שמור את הקישור — הוא היחיד שיאפשר לך לעקוב אחר המשלוח.</p>

        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#0d0d0d]/60 hover:text-[#35AD29]">
          <ArrowRight className="size-4" /> חזרה לדף הראשי
        </Link>
      </div>
    </div>
  );
}
