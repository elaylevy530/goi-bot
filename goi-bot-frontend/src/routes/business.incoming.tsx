import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, CheckCheck, Eye, MapPin, Package, Phone, Plus, Search, X } from "lucide-react";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { Badge, FilterTabs, Panel, SearchBox, SelectBox, money } from "@/components/business/goi/GoiUi";
import { nestCancelJob, type NestJob } from "@/lib/nest-jobs";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import {
  isIncomingJob,
  jobBadgeTone,
  jobItemsLabel,
  jobPrice,
  jobRecipientName,
  jobRecipientPhone,
  jobSourceLabel,
  pinsFromJobs,
} from "@/lib/business-panel";
import { toast } from "sonner";

export const Route = createFileRoute("/business/incoming")({
  head: () => ({ meta: [{ title: "הזמנות נכנסות לאישור — Goi" }] }),
  ssr: false,
  component: IncomingPage,
});

function IncomingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const { data: jobs = [] } = useBusinessJobs(me?.id);
  const dispatchFn = useServerFn(dispatchJobToCouriers);
  const [filter, setFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [query, setQuery] = useState("");

  const approvalStatus = (job: NestJob) => {
    const status = job.status.toLowerCase();
    if (status === "בוטלה" || status === "נדחתה" || status === "rejected" || status === "cancelled" || status === "canceled") return "rejected";
    if (isIncomingJob(job)) return "pending";
    return "approved";
  };
  const approvedCount = jobs.filter((job) => approvalStatus(job) === "approved").length;
  const rejectedCount = jobs.filter((job) => approvalStatus(job) === "rejected").length;
  const sources = Array.from(new Set(jobs.map(jobSourceLabel))).sort((a, b) => a.localeCompare(b, "he"));
  const shown = jobs
    .filter((job) => filter === "all" || approvalStatus(job) === filter)
    .filter((job) => sourceFilter === "all" || jobSourceLabel(job) === sourceFilter)
    .filter((j) => `${j.job_number} ${jobRecipientName(j)} ${j.dropoff_address || ""}`.includes(query.trim()));

  const dispatch = useMutation({
    mutationFn: async (jobId: string) => dispatchFn({ data: { jobId } }),
    onSuccess: (r) => {
      toast.success(r.dispatched ? `המשלוח הופץ ל־${r.sent} שליחים` : "ההפצה הושלמה");
      qc.invalidateQueries({ queryKey: ["business-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: (jobId: string) => nestCancelJob(jobId),
    onSuccess: () => {
      toast.success("ההזמנה נדחתה");
      qc.invalidateQueries({ queryKey: ["business-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pickupLat = Number((me as { pickup_lat?: number | null } | null)?.pickup_lat);
  const pickupLng = Number((me as { pickup_lng?: number | null } | null)?.pickup_lng);
  const pins = [
    ...(Number.isFinite(pickupLat) && Number.isFinite(pickupLng)
      ? [{ id: "store", lat: pickupLat, lng: pickupLng, label: "איסוף מהעסק", type: "store" as const, color: "#00a334" }]
      : []),
    ...pinsFromJobs(shown),
  ];

  const card = (o: NestJob) => (
    <Panel className="incoming-card" key={o.id}>
      <div className="incoming-data">
        <div className="incoming-customer">
          <Badge
            text={approvalStatus(o) === "pending" ? "ממתינה לאישור" : approvalStatus(o) === "approved" ? "אושרה" : "נדחתה"}
            tone={approvalStatus(o) === "rejected" ? "red" : approvalStatus(o) === "approved" ? "green" : jobBadgeTone(o.status)}
          />
          <div className="incoming-name">
            <span className="round-icon">
              <Package size={24} />
            </span>
            <div>
              <strong>#{o.job_number}</strong>
              <h3>{jobRecipientName(o)}</h3>
            </div>
          </div>
          {jobRecipientPhone(o) && (
            <p>
              <Phone size={14} />
              <bdi>{jobRecipientPhone(o)}</bdi>
            </p>
          )}
          <p>
            <MapPin size={14} />
            {o.dropoff_address || o.dropoff_area || "כתובת מסירה לא צוינה"}
          </p>
        </div>
        <div className="incoming-items">
          <small>פרטי ההזמנה</small>
          <p>{jobItemsLabel(o)}</p>
        </div>
        <div className="incoming-amount">
          <small>עלות משלוח</small>
          <strong>{money(jobPrice(o))}</strong>
          <small>רכב</small>
          <b>
            <Bike size={17} />
            {(o as { vehicle_required?: string | null }).vehicle_required || "אוטומטי"}
          </b>
        </div>
        <div className="incoming-source">
          <small>מקור ההזמנה</small>
          <Badge text={jobSourceLabel(o)} tone="green" />
          <small>סטטוס</small>
          <strong>{approvalStatus(o) === "pending" ? "ממתינה לאישור" : approvalStatus(o) === "approved" ? "אושרה" : "נדחתה"}</strong>
        </div>
      </div>
      <div className="incoming-actions">
        {isIncomingJob(o) && (o.pricing_type === "quote_request" ? (
          <Link to="/business/quotes" className="btn primary">
            <Search size={17} />
            בחירת הצעת מחיר
          </Link>
        ) : (
          <button type="button" className="btn primary" disabled={dispatch.isPending} onClick={() => dispatch.mutate(o.id)}>
            <Search size={17} />
            אשר והפץ לשליחים
          </button>
        ))}
        <button type="button" className="btn outline" onClick={() => navigate({ to: "/business/order/$id", params: { id: o.id } })}>
          <Eye size={17} />
          פרטים
        </button>
        {isIncomingJob(o) && <button type="button" className="btn outline" disabled={cancel.isPending} onClick={() => cancel.mutate(o.id)}>
          <X size={17} />
          דחה
        </button>}
      </div>
    </Panel>
  );

  return (
    <BusinessShell title="הזמנות נכנסות לאישור" subtitle="ההזמנות שהתקבלו וממתינות לאישור או להפצה">
      <div className="operations-layout">
        <div className="operations-list">
          <div className="operations-filters">
            <FilterTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "הכל", count: jobs.length },
                { value: "approved", label: "אושרה", count: approvedCount },
                { value: "rejected", label: "נדחתה", count: rejectedCount },
              ]}
            />
            <SelectBox
              value={sourceFilter}
              onChange={setSourceFilter}
              label="מקור ההזמנה"
              options={[
                { value: "all", label: "כל המקורות" },
                ...sources.map((source) => ({ value: source, label: source })),
              ]}
            />
            <SearchBox value={query} onChange={setQuery} placeholder="חיפוש משלוח או לקוח..." />
          </div>
          <div className="order-cards">
            {shown.map(card)}
            {shown.length === 0 && (
              <Panel className="empty-state">
                <CheckCheck size={32} />
                <h2>אין הזמנות להצגה</h2>
                <p>אפשר לשנות את הסינון או לפתוח הזמנה חדשה.</p>
                <Link to="/business/new-delivery" className="btn primary">
                  <Plus size={17} />
                  הזמנה חדשה
                </Link>
              </Panel>
            )}
          </div>
        </div>
        <div className="operations-map">
          <LiveJobsMap
            pins={pins}
            showControls
            onMarker={(id) => {
              if (id !== "store") navigate({ to: "/business/order/$id", params: { id } });
            }}
            className="h-full min-h-[16rem]"
          />
        </div>
      </div>
    </BusinessShell>
  );
}
