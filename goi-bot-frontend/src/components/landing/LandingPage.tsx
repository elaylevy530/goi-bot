import { Link } from "@tanstack/react-router";
import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import goiMascot from "@/assets/goi-mascot.png";
import fitRestaurants from "@/assets/landing/fit-restaurants.png";
import fitCafe from "@/assets/landing/fit-cafe.png";
import fitFlowers from "@/assets/landing/fit-flowers.png";
import fitPharmacy from "@/assets/landing/fit-pharmacy.png";
import fitFashion from "@/assets/landing/fit-fashion.png";
import fitOffice from "@/assets/landing/fit-office.png";
import fitClinic from "@/assets/landing/fit-clinic.png";
import fitParts from "@/assets/landing/fit-parts.png";
import "@/styles/goi-landing.css";

const BUSINESS_SIGNUP = "/signup-business";
const COURIER_JOIN = "/join";
const COURIER_LOGIN = "/auth";
const BUSINESS_LOGIN = "/auth";
const ADMIN_LOGIN = "/admin-login";

function Arrow() {
  return <span className="arrow">←</span>;
}

function Logo({ className }: { className?: string }) {
  return (
    <span className={className ?? "logo"}>
      GO<span>I</span>
    </span>
  );
}

function Reveal({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`reveal ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "#07100a";
    document.documentElement.style.background = "#07100a";
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll(".goi-landing .reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="goi-landing" dir="rtl">
      <header id="header" className={scrolled ? "scrolled" : undefined}>
        <nav className={`nav goi-wrap${menuOpen ? " open" : ""}`} aria-label="ניווט ראשי">
          <a className="brand-lockup" href="#top" aria-label="GOI דף הבית" onClick={closeMenu}>
            <Logo />
            <span className="brand-note">משלוחים מקומיים לעסקים</span>
          </a>
          <div className="nav-links" id="navLinks">
            <a href="#business" onClick={closeMenu}>לעסקים</a>
            <a href="#network" onClick={closeMenu}>רשת השליחים</a>
            <a href="#fits" onClick={closeMenu}>למי זה מתאים</a>
            <a href="#local" onClick={closeMenu}>סוגי משלוחים</a>
            <a href="#how" onClick={closeMenu}>איך זה עובד</a>
            <a href="#couriers" onClick={closeMenu}>לשליחים</a>
          </div>
          <div className="nav-actions">
            <Link to={COURIER_JOIN} className="btn btn-ghost" onClick={closeMenu}>
              רוצה להיות שליח
            </Link>
            <Link to={BUSINESS_SIGNUP} className="btn btn-primary" onClick={closeMenu}>
              פתיחת חשבון עסקי <Arrow />
            </Link>
            <button
              className="btn btn-ghost menu-btn"
              type="button"
              aria-label="פתיחת תפריט"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </nav>
      </header>

      <main id="top">
        <Hero />
        <TrustStrip />
        <Network />
        <Business />
        <Fits />
        <Local />
        <How activeStep={activeStep} setActiveStep={setActiveStep} />
        <Numbers />
        <Couriers />
        <Tech />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="goi-wrap hero-grid">
        <div className="hero-copy">
          <div className="availability">
            <span className="pulse" /> רשת שליחים זמינה לעסק שלכם
          </div>
          <h1>
            אפליקציה אחת.<span className="accent">רשת שליחים שלמה.</span>
          </h1>
          <p>
            GOI מחברת את העסק שלכם בזמן אמת לרשת משולבת של חברות משלוחים ושליחים עצמאיים. המטרה פשוטה: שתמיד יהיה שליח זמין לעסק שלכם. כשיש משלוח פותחים הזמנה באפליקציה ועוקבים עד המסירה.
          </p>
          <div className="hero-actions">
            <Link to={BUSINESS_SIGNUP} className="btn btn-primary">
              אני עסק — בואו נתחיל <Arrow />
            </Link>
            <a href="#how" className="btn btn-ghost">
              לראות איך זה עובד
            </a>
          </div>
          <div className="hero-proof">
            <span className="proof-item">
              <svg className="proof-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>{" "}
              ללא מינימום משלוחים
            </span>
            <span className="proof-item">
              <svg className="proof-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>{" "}
              משתמשים רק כשצריך
            </span>
            <span className="proof-item">
              <svg className="proof-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
              </svg>{" "}
              חברות + עצמאיים
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-label="משלוח פעיל במערכת GOI">
          <div className="delivery-card">
            <div className="card-top">
              <span className="status">
                <span className="dot" /> משלוח פעיל
              </span>
              <span className="eta">הגעה משוערת 18 דק׳</span>
            </div>
            <div className="route">
              <div className="stop">
                <span className="stop-dot" />
                <div>
                  <small>איסוף</small>
                  <strong>פיצה נונה · דיזנגוף 72</strong>
                </div>
              </div>
              <div className="stop">
                <span className="stop-dot" />
                <div>
                  <small>מסירה</small>
                  <strong>אבן גבירול 104, תל אביב</strong>
                </div>
              </div>
            </div>
            <div className="courier-row">
              <div className="courier">
                <span className="avatar">🛵</span>
                <div>
                  <strong>איתי בדרך אליך</strong>
                  <small>קטנוע · 4.9 ★</small>
                </div>
              </div>
              <span className="price">₪29</span>
            </div>
          </div>
          <img className="mascot" src={goiMascot} alt="הדמות הירוקה של GOI עם חבילת משלוח" />
          <div className="float-chip chip-1">
            <span className="mini-icon">✓</span> נמצא שליח זמין
          </div>
          <div className="float-chip chip-2">
            <span className="pulse" /> הרשת פעילה עכשיו
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="goi-wrap trust-content">
        <span>האפליקציה שמחברת בין העסק לרשת שליחים רחבה</span>
        <div className="audiences">
          <span className="audience-pill">
            <b>🍕</b> מסעדות
          </span>
          <span className="audience-pill">
            <b>🛍</b> חנויות
          </span>
          <span className="audience-pill">
            <b>📦</b> עסקים
          </span>
          <span className="audience-pill">
            <b>🛵</b> שליחים
          </span>
        </div>
      </div>
    </div>
  );
}

function Network() {
  return (
    <section className="network-section" id="network">
      <div className="goi-wrap">
        <Reveal className="network-panel">
          <div className="network-copy">
            <span className="eyebrow">הכוח של GOI הוא הרשת</span>
            <h2>
              לא שליח אחד.
              <br />
              רשת שלמה מאחוריכם.
            </h2>
            <p>
              בצד השני של האפליקציה נמצאים גם שליחים עצמאיים וגם חברות משלוחים. GOI מרכזת את הזמינות במקום אחד ומחברת כל הזמנה לשליח מתאים באזור — כך שלעסק יש כתובת אחת לכל המשלוחים המקומיים.
            </p>
            <div className="network-points">
              <div className="network-point">
                <strong>אין התחייבות לכמות</strong>
                <span>גם משלוח בודד מתקבל</span>
              </div>
              <div className="network-point">
                <strong>אין צורך להחזיק צי</strong>
                <span>השליחים כבר מחוברים לרשת</span>
              </div>
              <div className="network-point">
                <strong>עובד לפי הצורך שלכם</strong>
                <span>יום עמוס, שעה לחוצה או משלוח דחוף</span>
              </div>
              <div className="network-point">
                <strong>זמינות רחבה יותר</strong>
                <span>יותר מקורות של שליחים באותה מערכת</span>
              </div>
            </div>
          </div>
          <div className="network-visual" aria-label="רשת השליחים של GOI">
            <div className="network-ring" />
            <div className="network-center">GOI</div>
            <div className="network-card company">
              <strong>חברות משלוחים</strong>
              <span>מחוברות לרשת</span>
            </div>
            <div className="network-card independent">
              <strong>שליחים עצמאיים</strong>
              <span>זמינים באזור</span>
            </div>
            <div className="network-card available">
              <strong>תמיד יש שליח זמין</strong>
              <span>מוכן לקבל את המשלוח של העסק</span>
            </div>
            <i className="orbit-dot a" />
            <i className="orbit-dot b" />
            <i className="orbit-dot c" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Business() {
  return (
    <section id="business">
      <div className="goi-wrap">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">השליחים של העסק, מתי שצריך</span>
            <h2>
              מהדלפק, מהחנות
              <br />
              או מהמשרד — ללקוח.
            </h2>
          </div>
          <p>משלוח אחד באמצע היום או עומס של הזמנות בערב — מזמינים לפי הצורך ומקבלים שליח מתאים באזור.</p>
        </Reveal>
        <div className="business-grid">
          <article className="business-card reveal" style={{ ["--card-glow" as string]: "rgba(255,138,50,.15)" }}>
            <span className="card-num">01 / מסעדות</span>
            <div className="business-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3c3 2 4 5 4 9h-4v9M16 3v18" />
              </svg>
            </div>
            <h3>האוכל מוכן? השליח יוצא</h3>
            <p>הזמנות מהאתר, מהטלפון או מהדלפק. מסמנים מתי המנה מוכנה ומקבלים שליח לאיסוף מהמסעדה ולמסירה ללקוח.</p>
            <a className="card-link" href="#how" aria-label="איך זה עובד למסעדות">
              ↗
            </a>
          </article>
          <article className="business-card reveal" style={{ ["--card-glow" as string]: "rgba(103,167,255,.15)" }}>
            <span className="card-num">02 / חנויות</span>
            <div className="business-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 8h16l-1 13H5L4 8Z" />
                <path d="M8 10V6a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h3>הלקוח רוצה את זה עוד היום</h3>
            <p>אופנה, פארם, פרחים, מתנות או מוצר מהמדף — מוציאים משלוח ישירות מהסניף ומגיעים ללקוח היום.</p>
            <a className="card-link" href="#how" aria-label="איך זה עובד לחנויות">
              ↗
            </a>
          </article>
          <article className="business-card reveal">
            <span className="card-num">03 / עסקים</span>
            <div className="business-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7h18v13H3zM7 7V4h10v3" />
                <path d="M3 12h18M10 12v3h4v-3" />
              </svg>
            </div>
            <h3>משהו חייב להגיע עכשיו</h3>
            <p>מסמך, מפתח, חבילה קטנה, חלק או ציוד דחוף — שליח נקודתי מהעסק ללקוח או לעסק אחר, באותו היום.</p>
            <a className="card-link" href="#how" aria-label="איך זה עובד לעסקים">
              ↗
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

function Fits() {
  const items = [
    { img: fitRestaurants, title: "מסעדות ואוכל מהיר", copy: "מנות חמות, טייק אוויי והזמנות ישירות מהעסק ללקוח." },
    { img: fitCafe, title: "בתי קפה ומאפיות", copy: "מארזים, מגשים והזמנות שצריכות להגיע טריות ובזמן." },
    { img: fitFlowers, title: "פרחים ומתנות", copy: "משלוח אישי ומהיר ליום הולדת, אירוע או הפתעה של הרגע האחרון." },
    { img: fitPharmacy, title: "פארם וחנויות נוחות", copy: "מוצר נדרש עכשיו, באיסוף מהסניף ומסירה מקומית ללקוח." },
    { img: fitFashion, title: "אופנה וחנויות בוטיק", copy: "פריט מהחנות, החלפה או רכישה שהלקוח רוצה לקבל עוד היום." },
    { img: fitOffice, title: "משרדים ובעלי מקצוע", copy: "מסמכים, מפתחות וחבילות קטנות שחייבים לעבור מנקודה לנקודה." },
    { img: fitClinic, title: "קליניקות ומעבדות", copy: "פריטים ומסמכים למסירה מקומית מתואמת ומהירה." },
    { img: fitParts, title: "חלפים וציוד דחוף", copy: "חלק או ציוד שנדרש לעסק, למוסך או לטכנאי במהלך יום העבודה." },
  ] as const;

  return (
    <section className="fit-section" id="fits">
      <div className="goi-wrap">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">למי GOI מתאימה?</span>
            <h2>
              לכל עסק שצריך להגיע
              <br />
              ללקוח עוד היום.
            </h2>
          </div>
          <p>אם המוצר כבר אצלכם והלקוח נמצא בעיר או באזור סמוך — GOI יכולה לחבר אתכם לשליח שייקח אותו מכאן לשם.</p>
        </Reveal>
        <div className="fit-grid">
          {items.map((item) => (
            <article className="fit-card reveal" key={item.title}>
              <span className="fit-icon">
                <img src={item.img} alt={item.title} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        <Reveal className="fit-bottom">
          <b>לא מצאתם את התחום שלכם?</b>
          <span>אם זה משלוח מקומי מהיום להיום — כנראה ש־GOI מתאימה גם לכם.</span>
        </Reveal>
      </div>
    </section>
  );
}

function Local() {
  return (
    <section className="local-section" id="local">
      <div className="goi-wrap local-panel">
        <Reveal className="local-copy">
          <span className="eyebrow">בדיוק לשימוש היומיומי</span>
          <h3>
            לא לוגיסטיקה.
            <br />
            המשלוח שהעסק צריך עכשיו.
          </h3>
          <p>GOI לא מחליפה מחסן ולא מנהלת מלאי. אנחנו מחברים את העסק לשליח זמין כדי להוציא הזמנה מקומית במהירות — נקודה לנקודה.</p>
          <div className="scope-note">
            <b>חשוב לדעת</b>
            <span>השירות מיועד למשלוחים מהיום להיום ועכשיו לעכשיו, ולא לשירותי Fulfillment, הפצה ארצית או לוגיסטיקת איקומרס.</span>
          </div>
        </Reveal>
        <Reveal className="local-options">
          <article className="local-option">
            <span className="local-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l4 2" />
              </svg>
            </span>
            <div>
              <strong>עכשיו לעכשיו</strong>
              <p>הזמנה דחופה, מנה מוכנה או לקוח שמחכה — מחפשים שליח זמין ברגע זה.</p>
            </div>
            <span>ON DEMAND</span>
          </article>
          <article className="local-option">
            <span className="local-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </span>
            <div>
              <strong>מהיום להיום</strong>
              <p>פותחים מראש משלוח שצריך לצאת בהמשך היום ובוחרים את חלון הזמן המתאים.</p>
            </div>
            <span>SAME DAY</span>
          </article>
          <article className="local-option">
            <span className="local-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 19h14M7 16l5-12 5 12M9 12h6" />
              </svg>
            </span>
            <div>
              <strong>משלוח מקומי</strong>
              <p>אותה עיר או אזור סמוך — מהעסק ללקוח במסלול קצר וברור.</p>
            </div>
            <span>LOCAL</span>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function How({
  activeStep,
  setActiveStep,
}: {
  activeStep: number;
  setActiveStep: (n: number) => void;
}) {
  const steps = [
    ["01", "פותחים משלוח", "כתובת איסוף, כתובת מסירה ומה שולחים. פחות מדקה וסיימתם."],
    ["02", "GOI מוצאת שליח", "המערכת מאתרת שליח זמין ומתאים באזור ושולחת אותו לאיסוף."],
    ["03", "עוקבים עד המסירה", "רואים סטטוס בזמן אמת ומקבלים אישור כשהמשלוח הגיע ליעד."],
  ] as const;

  return (
    <section className="how" id="how">
      <div className="goi-wrap">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">פשוט גם בזמן לחץ</span>
            <h2>
              שלושה צעדים.
              <br />
              והשליח בדרך לעסק.
            </h2>
          </div>
          <p>בלי שיחות לקבוצות שליחים ובלי לבדוק מי פנוי. הצוות פותח משלוח וממשיך לעבוד.</p>
        </Reveal>
        <div className="flow">
          <Reveal className="phone-shell" aria-label="הדגמת מסך הזמנת משלוח">
            <div className="phone-screen">
              <div className="screen-head">
                <span className="screen-logo">
                  GO<span>I</span>
                </span>
                <span className="user-dot">עסק</span>
              </div>
              <div className="screen-kicker">שלום, פיצה נונה</div>
              <div className="screen-title">לאן שולחים הפעם?</div>
              <div className="address-box">
                <div className="address">
                  <i />
                  <div>
                    <small>איסוף מהעסק</small>
                    <strong>דיזנגוף 72, תל אביב</strong>
                  </div>
                </div>
                <div className="address">
                  <i />
                  <div>
                    <small>כתובת הלקוח</small>
                    <strong>אבן גבירול 104, תל אביב</strong>
                  </div>
                </div>
              </div>
              <div className="map-mini">
                <span className="map-route" />
                <span className="map-pin a" />
                <span className="map-pin b" />
              </div>
              <div className="order-summary">
                <div>
                  <small>מרחק</small>
                  <strong>3.8 ק״מ</strong>
                </div>
                <div>
                  <small>זמן משוער</small>
                  <strong>18–24 דק׳</strong>
                </div>
                <div>
                  <small>מחיר</small>
                  <strong>₪29</strong>
                </div>
              </div>
              <div className="screen-button">
                <span>מצא לי שליח</span>
                <span>←</span>
              </div>
            </div>
          </Reveal>
          <div className="steps reveal">
            {steps.map(([num, title, copy], i) => (
              <article
                key={num}
                className={`step${activeStep === i ? " active" : ""}`}
                tabIndex={0}
                onClick={() => setActiveStep(i)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveStep(i);
                  }
                }}
              >
                <span className="step-num">{num}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Numbers() {
  return (
    <section className="numbers">
      <div className="goi-wrap numbers-grid reveal">
        <div className="number">
          <strong>200+</strong>
          <span>שליחים במערך</span>
        </div>
        <div className="number">
          <strong>דקה</strong>
          <span>לפתיחת משלוח</span>
        </div>
        <div className="number">
          <strong>LIVE</strong>
          <span>מעקב עד הלקוח</span>
        </div>
        <div className="number">
          <strong>היום</strong>
          <span>איסוף ומסירה מקומיים</span>
        </div>
      </div>
    </section>
  );
}

function Couriers() {
  return (
    <section className="courier-section" id="couriers">
      <div className="goi-wrap">
        <Reveal className="courier-panel">
          <div className="courier-copy">
            <span className="eyebrow">יש לך קטנוע או רכב?</span>
            <h2>
              הזמן שלך
              <br />
              יכול להפוך להכנסה.
            </h2>
            <p>
              מצטרפים למערך השליחים העצמאיים של GOI, מתחברים לאפליקציה כשנוח ורואים משלוחים קרובים באזור. לפני שלוקחים עבודה רואים את המסלול, המרחק והתגמול — והבחירה תמיד שלכם.
            </p>
            <div className="courier-benefits">
              <span>
                <b className="check">✓</b> עובדים מתי שנוח
              </span>
              <span>
                <b className="check">✓</b> בוחרים משלוחים
              </span>
              <span>
                <b className="check">✓</b> תגמול מוצג מראש
              </span>
              <span>
                <b className="check">✓</b> תמיכה לאורך הדרך
              </span>
            </div>
            <Link to={COURIER_JOIN} className="btn btn-primary">
              רוצה להצטרף כשליח <Arrow />
            </Link>
          </div>
          <div className="courier-art" aria-hidden="true">
            <div className="radar">
              <span className="radar-line" />
              <span className="radar-line two" />
            </div>
            <div className="job-card job-a">
              <strong>
                משלוח קרוב אליך <b>₪38</b>
              </strong>
              <small>2.4 ק״מ · מוכן לאיסוף</small>
            </div>
            <div className="job-card job-b">
              <strong>
                קו חלוקה <b>₪126</b>
              </strong>
              <small>5 נקודות · 11.2 ק״מ</small>
            </div>
            <div className="scooter">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="16" cy="47" r="8" />
                <circle cx="49" cy="47" r="8" />
                <path d="M16 47h19l9-19h8M29 47l-8-21h-8M24 33h15l5 14M45 20h10" />
              </svg>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Tech() {
  return (
    <section className="tech-section" id="technology">
      <div className="goi-wrap">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">יותר מסתם טלפון לשליח</span>
            <h2>
              המשלוחים המקומיים.
              <br />
              במסך אחד.
            </h2>
          </div>
          <p>הזמנות, שליחים, סטטוסים, היסטוריה וחיובים — כל מה שהעסק צריך כדי לנהל את המשלוחים היומיים.</p>
        </Reveal>
        <div className="tech-grid">
          <article className="tech-card featured reveal">
            <h3>מתחברת לדרך שבה אתם עובדים</h3>
            <p>פותחים הזמנה ידנית מהמחשב או מהנייד, ובהמשך אפשר לחבר את מקורות ההזמנה של העסק.</p>
            <div className="integration-row">
              <span className="integration">קופות</span>
              <span className="integration">אתר הזמנות</span>
              <span className="integration">WhatsApp</span>
              <span className="integration">API</span>
            </div>
          </article>
          <article className="tech-card reveal">
            <h3>יודעים מה קורה. בכל רגע.</h3>
            <p>מרגע פתיחת המשלוח ועד אישור המסירה — העסק והלקוח מקבלים תמונה ברורה, בלי טלפונים מיותרים.</p>
            <div className="live-bar">
              <div>
                <small>סטטוס נוכחי</small>
                <strong>השליח בדרך למסירה</strong>
              </div>
              <div className="live-signal">
                <i />
                <i />
                <i />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="cta" id="start">
      <div className="goi-wrap">
        <Reveal className="cta-box">
          <h2>צריכים משלוח? הרשת כבר מחכה.</h2>
          <p>בלי מינימום, בלי התחייבות ובלי להחזיק שליח קבוע. פותחים את האפליקציה רק כשצריך ו־GOI מחברת אתכם לשליח זמין.</p>
          <div className="cta-actions">
            <Link to={BUSINESS_SIGNUP} className="btn btn-dark">
              פתיחת חשבון לעסק <Arrow />
            </Link>
            <Link to={COURIER_JOIN} className="btn" style={{ background: "rgba(255,255,255,.33)", borderColor: "rgba(7,16,8,.13)", color: "#071008" }}>
              הצטרפות כשליח
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="goi-wrap">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="logo" href="#top">
              GO<span>I</span>
            </a>
            <p>משלוחים מקומיים לעסקים — עכשיו לעכשיו ומהיום להיום. בלי הובלות ובלי לקוחות פרטיים.</p>
          </div>
          <div className="footer-col">
            <h4>לעסקים</h4>
            <Link to={BUSINESS_LOGIN} search={{ role: "business" }}>
              כניסה לעסק
            </Link>
            <Link to={BUSINESS_SIGNUP}>פתיחת חשבון עסקי</Link>
            <a href="#how">איך זה עובד</a>
          </div>
          <div className="footer-col">
            <h4>לשליחים</h4>
            <Link to={COURIER_LOGIN}>כניסה לשליח</Link>
            <Link to={COURIER_JOIN}>הצטרפות כשליח</Link>
            <a href="#couriers">איך עובדים</a>
          </div>
          <div className="footer-col">
            <h4>כניסה</h4>
            <Link to={ADMIN_LOGIN}>כניסת מנהל</Link>
            <Link to={BUSINESS_LOGIN} search={{ role: "business" }}>
              כניסת עסק
            </Link>
            <Link to={COURIER_LOGIN}>כניסת שליח</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 GOI. כל הזכויות שמורות.</span>
          <span>
            <strong>תמיכה:</strong> support@goi.co.il
          </span>
        </div>
      </div>
    </footer>
  );
}
