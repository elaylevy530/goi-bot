import { useEffect, useState } from "react";

type Period = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

function getPeriod(h: number): Period {
  if (h < 5) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 15) return "noon";
  if (h < 18) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

const SCENES: Record<Period, { bg: string; accent: string; orb1: string; orb2: string }> = {
  dawn:      { bg: "linear-gradient(135deg,#1a1b3a 0%,#6b4a7a 40%,#f5a572 80%,#ffd89b 100%)", accent: "#ffd89b", orb1: "bg-orange-300/30", orb2: "bg-purple-400/25" },
  morning:   { bg: "linear-gradient(135deg,#7dd3fc 0%,#38bdf8 40%,#34d399 90%)",               accent: "#fde68a", orb1: "bg-yellow-200/40", orb2: "bg-sky-200/30" },
  noon:      { bg: "linear-gradient(135deg,#0ea5e9 0%,#22c55e 60%,#16a34a 100%)",              accent: "#fef3c7", orb1: "bg-white/25",       orb2: "bg-emerald-200/30" },
  afternoon: { bg: "linear-gradient(135deg,#0d8a4a 0%,#1e7a3a 50%,#0f5132 100%)",              accent: "#fcd34d", orb1: "bg-amber-300/25",  orb2: "bg-emerald-300/20" },
  evening:   { bg: "linear-gradient(135deg,#1e1b4b 0%,#7c2d6f 45%,#e85d3a 90%)",               accent: "#fdba74", orb1: "bg-orange-400/30", orb2: "bg-fuchsia-500/25" },
  night:     { bg: "linear-gradient(135deg,#020617 0%,#0f1b3d 50%,#1e3a5f 100%)",               accent: "#cbd5e1", orb1: "bg-indigo-400/20", orb2: "bg-slate-300/10" },
};

export function CourierHeroScene({ className = "" }: { className?: string }) {
  const [period, setPeriod] = useState<Period>(() => getPeriod(new Date().getHours()));

  useEffect(() => {
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, []);

  const s = SCENES[period];
  const isNight = period === "night" || period === "evening" || period === "dawn";

  return (
    <div
      className={`absolute inset-0 overflow-hidden transition-[background] duration-[2000ms] ease-out ${className}`}
      style={{ background: s.bg }}
      aria-hidden
    >
      {/* Soft orbs */}
      <div className={`absolute -top-16 -left-16 size-56 rounded-full blur-3xl ${s.orb1} animate-[pulse_8s_ease-in-out_infinite]`} />
      <div className={`absolute -bottom-24 -right-12 size-64 rounded-full blur-3xl ${s.orb2} animate-[pulse_10s_ease-in-out_infinite]`} />

      {/* Sun / Moon */}
      <div
        className="absolute size-20 rounded-full blur-[2px] opacity-80 transition-all duration-[2000ms]"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${s.accent}, transparent 70%)`,
          top: period === "noon" ? "8%" : period === "morning" ? "18%" : period === "afternoon" ? "20%" : period === "evening" ? "35%" : period === "dawn" ? "40%" : "12%",
          right: period === "morning" ? "70%" : period === "noon" ? "45%" : period === "afternoon" ? "20%" : period === "evening" ? "8%" : period === "dawn" ? "75%" : "15%",
        }}
      />

      {/* Stars (night only) */}
      {isNight && (
        <svg className="absolute inset-0 size-full opacity-70" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => {
            const x = (i * 53) % 100;
            const y = ((i * 37) % 60);
            const d = (i % 5) * 0.4;
            return (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y}%`}
                r={i % 3 === 0 ? 1.5 : 1}
                fill="white"
                style={{ animation: `pulse 3s ease-in-out ${d}s infinite` }}
              />
            );
          })}
        </svg>
      )}

      {/* Subtle horizon glow */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

      {/* Animated diagonal shine */}
      <div
        className="absolute -inset-x-1/3 top-0 h-full opacity-[0.07] pointer-events-none"
        style={{
          background: "linear-gradient(115deg, transparent 40%, white 50%, transparent 60%)",
          animation: "heroShine 9s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes heroShine {
          0%,100% { transform: translateX(-30%); }
          50%     { transform: translateX(30%); }
        }
      `}</style>
    </div>
  );
}
