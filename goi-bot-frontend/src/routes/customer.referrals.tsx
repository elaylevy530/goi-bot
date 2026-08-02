import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/customer/referrals")({
  head: () => ({ meta: [{ title: "הזמן חבר — Goi" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const [code, setCode] = useState("GOI");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { fetchNestSession } = await import("@/lib/nest-auth");
      const session = await fetchNestSession();
      if (!session) return;
      const phone = session.profile?.phone ?? session.email?.split("@")[0] ?? "";
      const tail = phone.replace(/\D/g, "").slice(-4) || session.userId.slice(0, 4).toUpperCase();
      setCode(`GOI${tail}`);
    })();
  }, []);

  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("הקישור הועתק");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const share = async () => {
    const text = `היי! הצטרפו איתי ל־Goi וקבלו הנחה על המשלוח הראשון. הקוד שלי: ${code}\n${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Goi", text, url: link }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-[#F5C518] to-[#f5a518] p-6 text-[#101418] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/40 grid place-items-center">
            <Gift className="size-7" />
          </div>
          <div>
            <div className="text-xl font-extrabold">הזמינו חברים לגוי</div>
            <div className="text-sm opacity-80">קבלו ₪20 זיכוי על כל חבר שיזמין משלוח ראשון</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm border border-black/5 space-y-4">
        <div>
          <div className="text-xs font-bold text-[#101418]/50 mb-1">קוד ההפניה שלך</div>
          <div className="text-3xl font-black tracking-widest text-center bg-[#f5f6f8] rounded-2xl py-4">
            {code}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-[#101418]/50 mb-1">קישור אישי</div>
          <div className="flex items-center gap-2 bg-[#f5f6f8] rounded-xl px-3 py-2">
            <div className="flex-1 text-sm truncate" dir="ltr">{link}</div>
            <button onClick={copy} className="shrink-0 p-2 rounded-lg hover:bg-black/5">
              {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        <Button onClick={share} className="w-full bg-[#101418] hover:bg-[#101418]/90 text-white">
          <Share2 className="size-4" /> שיתוף עם חברים
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm border border-black/5 space-y-3">
        <div className="font-bold">איך זה עובד?</div>
        <ol className="space-y-2 text-sm text-[#101418]/70">
          <li className="flex gap-2"><span className="font-black text-[#F5C518]">1.</span> שתפו את הקוד עם חברים.</li>
          <li className="flex gap-2"><span className="font-black text-[#F5C518]">2.</span> הם מזמינים משלוח ראשון עם הקוד.</li>
          <li className="flex gap-2"><span className="font-black text-[#F5C518]">3.</span> אתם מקבלים ₪20 זיכוי — הם מקבלים הנחה.</li>
        </ol>
      </div>
    </div>
  );
}
