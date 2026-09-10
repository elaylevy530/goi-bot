import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCheck,
  Clock3,
  Eye,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { Avatar, Badge, FilterTabs, Panel, SearchBox, SelectBox, money } from "@/components/business/goi/GoiUi";
import type { NestJob } from "@/lib/nest-jobs";
import {
  courierStepLabel,
  formatJobWhen,
  jobCourierName,
  jobCourierVehicle,
  jobEtaMinutes,
  jobHasCourier,
  jobItemsLabel,
  jobPrice,
  jobRecipientName,
  jobSourceLabel,
  jobBadgeTone,
  pinsFromJobs,
  trackingGroup,
  trackingStageIndex,
  type LiveMapPin,
} from "@/lib/business-panel";

const STAGES = ["שיבוץ שליח", "בדרך לאיסוף", "נאסף מהעסק", "בדרך ללקוח"];

type Props = {
  jobs: NestJob[];
  businessName: string;
  storePin?: LiveMapPin | null;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onDetails: (id: string) => void;
  initialFilter?: string;
};

export function ActiveTracking({
  jobs,
  businessName,
  storePin,
  selectedId,
  onSelect,
  onDetails,
  initialFilter = "all",
}: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(initialFilter);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [view, setView] = useState("map");
  const mapHost = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const groups = [
    { value: "all", label: "כל הפעילים", count: jobs.length },
    { value: "waiting", label: "ממתינים לשליח", count: jobs.filter((j) => trackingGroup(j) === "waiting").length },
    { value: "pickup", label: "בדרך לאיסוף", count: jobs.filter((j) => trackingGroup(j) === "pickup").length },
    { value: "delivery", label: "בדרך ללקוח", count: jobs.filter((j) => trackingGroup(j) === "delivery").length },
  ];
  const sources = Array.from(new Set(jobs.map(jobSourceLabel)));
  const shown = jobs
    .filter((j) => status === "all" || trackingGroup(j) === status)
    .filter((j) => source === "all" || jobSourceLabel(j) === source)
    .filter((j) => {
      const q = query.trim();
      if (!q) return true;
      return `${j.job_number} ${jobRecipientName(j)} ${j.dropoff_address || ""} ${j.pickup_address || ""} ${jobCourierName(j) || ""}`.includes(q);
    });
  const chosen = shown.find((j) => j.id === selectedId);
  const pins: LiveMapPin[] = [
    ...(storePin ? [storePin] : []),
    ...pinsFromJobs(shown),
  ];

  const clearFilters = () => {
    setStatus("all");
    setSource("all");
    setQuery("");
    onSelect(undefined);
  };

  const focusMap = (id: string) => {
    onSelect(id);
    setView("map");
    requestAnimationFrame(() =>
      mapHost.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
      }),
    );
  };

  const selectMarker = (id: string) => {
    if (id === "store") {
      onSelect(undefined);
      return;
    }
    onSelect(id);
    cardRefs.current[id]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  };

  const openChat = (job: NestJob) => {
    if (!jobHasCourier(job) || !job.selected_courier_id) return;
    navigate({
      to: "/business/messages",
      search: { courierId: job.selected_courier_id, jobId: job.id },
    });
  };

  return (
    <div className="active-tracking">
      <div className="screen-heading tracking-heading">
        <div>
          <span className="eyebrow">תפעול משלוחים</span>
          <h1>מעקב משלוחים פעילים</h1>
          <p>מהשיבוץ ועד למסירה — כל המשלוחים הפעילים במסך אחד.</p>
        </div>
      </div>
      <div className="tracking-toolbar">
        <FilterTabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            onSelect(undefined);
          }}
          options={groups}
        />
        <FilterTabs
          value={view}
          onChange={setView}
          options={[
            { value: "map", label: "מפה ומשלוחים" },
            { value: "list", label: "רשימה" },
          ]}
        />
      </div>
      <div className="tracking-search-row">
        <SearchBox value={query} onChange={setQuery} placeholder="חיפוש מספר משלוח, לקוח, כתובת או שליח..." />
        <div className="tracking-source">
          <SelectBox
            label="מקור הזמנה"
            value={source}
            onChange={setSource}
            options={[{ value: "all", label: "כל מקורות ההזמנה" }, ...sources.map((value) => ({ value, label: value }))]}
          />
        </div>
        <span className="tracking-count" role="status">
          {shown.length} מתוך {jobs.length} משלוחים
        </span>
        {(query || source !== "all" || status !== "all") && (
          <button type="button" className="link" onClick={clearFilters}>
            <X size={15} />
            נקה סינון
          </button>
        )}
      </div>
      <div className={"tracking-workspace tracking-view-" + view}>
        <div className="tracking-orders" aria-label="רשימת משלוחים פעילים">
          {shown.map((job) => {
            const courier = jobCourierName(job);
            const assigned = jobHasCourier(job);
            const stage = trackingStageIndex(job);
            const eta = jobEtaMinutes(job);
            return (
              <article
                key={job.id}
                ref={(node) => {
                  cardRefs.current[job.id] = node;
                }}
                className={"tracking-card " + (chosen?.id === job.id ? "is-selected" : "")}
              >
                <header>
                  <button type="button" className="tracking-order-id" onClick={() => onDetails(job.id)}>
                    #{job.job_number}
                    <Eye size={15} />
                  </button>
                  <Badge text={courierStepLabel(job)} tone={jobBadgeTone(job.status)} />
                  <span className="source-tag">{jobSourceLabel(job)}</span>
                </header>
                <div className="tracking-recipient">
                  <span className="round-icon">
                    <Package size={21} />
                  </span>
                  <div>
                    <h2>{jobRecipientName(job)}</h2>
                    <p>
                      <MapPin size={14} />
                      {job.dropoff_address || job.dropoff_area || "כתובת מסירה לא צוינה"}
                    </p>
                  </div>
                  <strong>
                    {money(jobPrice(job))}
                    <small>עלות משלוח</small>
                  </strong>
                </div>
                <div className="tracking-progress" aria-label={"שלב נוכחי: " + STAGES[stage]}>
                  {STAGES.map((name, i) => (
                    <div key={name} className={i < stage ? "complete" : i === stage ? "current" : ""}>
                      <span>{i < stage ? <Check size={11} /> : i + 1}</span>
                      <small>{name}</small>
                    </div>
                  ))}
                </div>
                <div className="tracking-courier">
                  {assigned ? (
                    <>
                      <Avatar name={courier || "שליח"} />
                      <div>
                        <strong>{courier}</strong>
                        <small>
                          <Bike size={13} />
                          שליח · {jobCourierVehicle(job) || "לא צוין"}
                        </small>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="pending-courier">
                        <Search size={19} />
                      </span>
                      <div>
                        <strong>{job.status === "נשלחה לשליחים" ? "מחפשים שליח למשלוח" : "ממתין לשיבוץ שליח"}</strong>
                        <small>פרטי השליח יופיעו לאחר השיבוץ</small>
                      </div>
                    </>
                  )}
                  <div className="tracking-eta">
                    <small>{assigned ? "הגעה משוערת" : "נוצר"}</small>
                    <strong>{assigned ? (eta != null ? `${eta} דק׳` : "—") : formatJobWhen(job.created_at)}</strong>
                  </div>
                </div>
                <div className="tracking-meta">
                  <span>
                    <Clock3 size={14} />
                    {formatJobWhen(job.created_at)}
                  </span>
                  <span>{(job as { number_of_packages?: number | null }).number_of_packages || 1} פריטים</span>
                  <span>{jobItemsLabel(job)}</span>
                </div>
                <footer className="tracking-card-actions">
                  <button type="button" className="btn primary tracking-follow" onClick={() => focusMap(job.id)}>
                    <MapPin size={17} />
                    <span>עקוב במפה</span>
                  </button>
                  <button
                    type="button"
                    className="btn outline tracking-chat"
                    disabled={!assigned}
                    title={assigned ? `פתיחת שיחה עם ${courier}` : "הצ׳אט יהיה זמין לאחר שיבוץ שליח"}
                    onClick={() => openChat(job)}
                  >
                    <MessageCircle size={17} />
                    <span>צ׳אט עם השליח</span>
                  </button>
                  <button type="button" className="btn outline tracking-details" onClick={() => onDetails(job.id)}>
                    <Eye size={16} />
                    פרטי משלוח
                  </button>
                  {!assigned && <small className="tracking-chat-note">הצ׳אט יהיה זמין לאחר שיבוץ שליח</small>}
                </footer>
              </article>
            );
          })}
          {shown.length === 0 && (
            <Panel className="tracking-empty">
              <CheckCheck size={35} />
              <h2>{jobs.length ? "אין משלוחים שמתאימים לחיפוש" : "כל המשלוחים טופלו"}</h2>
              <p>{jobs.length ? "נסה לשנות את הסינון או לחפש משלוח אחר." : "משלוחים שהסתיימו מופיעים בהיסטוריה."}</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => (jobs.length ? clearFilters() : navigate({ to: "/business/new-delivery" }))}
              >
                {jobs.length ? <Search size={17} /> : <Plus size={17} />}
                {jobs.length ? "הצג את כל הפעילים" : "הזמנה חדשה"}
              </button>
            </Panel>
          )}
        </div>
        {view === "map" && (
          <div className="tracking-map-panel" ref={mapHost}>
            <div className="tracking-map-heading">
              <span>
                <MapPin size={18} />
                מפת המשלוחים
              </span>
              <small>{shown.length} משלוחים בתצוגה</small>
            </div>
            <LiveJobsMap pins={pins} selectedId={chosen?.id} onMarker={selectMarker} showControls className="h-full min-h-[16rem]" />
            {chosen ? (
              <div className="tracking-map-selection">
                <div>
                  <strong>
                    #{chosen.job_number} · {jobRecipientName(chosen)}
                  </strong>
                  <p>
                    {jobHasCourier(chosen)
                      ? `${jobCourierName(chosen) || "שליח"} · מיקום מעודכן`
                      : "יעד המסירה · טרם שובץ שליח"}
                  </p>
                </div>
                <button type="button" className="btn outline small" onClick={() => onDetails(chosen.id)}>
                  פרטים
                  <ArrowLeft size={15} />
                </button>
                <button type="button" className="icon-btn" onClick={() => onSelect(undefined)} aria-label="בטל בחירת משלוח">
                  <X size={17} />
                </button>
              </div>
            ) : (
              <div className="tracking-map-hint">
                <Store size={17} />
                <span>בחר משלוח ברשימה או סמן במפה כדי להתמקד בו.</span>
              </div>
            )}
            <div className="tracking-map-legend">
              <span>
                <Bike size={14} />
                מיקום שליח
              </span>
              <span>
                <MapPin size={14} />
                יעד ללא שליח
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
