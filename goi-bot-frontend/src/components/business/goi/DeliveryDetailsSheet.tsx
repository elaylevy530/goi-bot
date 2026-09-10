import { Bike, Check, MapPin, MessageCircle, Package, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, Badge, Panel, money } from "@/components/business/goi/GoiUi";
import type { NestJob } from "@/lib/nest-jobs";
import {
  courierStepLabel,
  deliverySheetLevel,
  formatJobWhen,
  jobBadgeTone,
  jobCourierName,
  jobCourierVehicle,
  jobHasCourier,
  jobItemsLabel,
  jobPrice,
  jobRecipientName,
  jobRecipientPhone,
  jobSourceLabel,
} from "@/lib/business-panel";

const TIMELINE = [
  { t: "אישור", v: 0 },
  { t: "שיבוץ", v: 1 },
  { t: "איסוף", v: 2 },
  { t: "נאסף", v: 3 },
  { t: "בדרך", v: 4 },
  { t: "נמסר", v: 5 },
];

type Props = {
  job: NestJob | null;
  onClose: () => void;
  onChat?: (job: NestJob) => void;
};

export function DeliveryDetailsSheet({ job, onClose, onChat }: Props) {
  const assigned = job ? jobHasCourier(job) : false;
  const courier = job ? jobCourierName(job) : null;
  const level = job ? deliverySheetLevel(job) : 0;
  const phone = job ? jobRecipientPhone(job) : "";
  const notes = String((job as { dropoff_notes?: string | null } | null)?.dropoff_notes || "").trim();
  const pickupNotes = String((job as { pickup_instructions?: string | null } | null)?.pickup_instructions || "").trim();
  const qty = Number((job as { number_of_packages?: number | null } | null)?.number_of_packages) || 1;
  const delivered =
    job &&
    (job.status === "הושלמה" || String((job as { courier_step?: string | null }).courier_step) === "נמסר");

  return (
    <Sheet open={job !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="left" dir="rtl" className="goi-biz delivery-sheet sm:!max-w-[420px] !w-[min(420px,92vw)] overflow-y-auto p-0">
        <SheetHeader>
          <SheetTitle>פרטי משלוח</SheetTitle>
          <SheetDescription>
            {job ? `משלוח #${job.job_number}` : "בחרו משלוח"}
          </SheetDescription>
        </SheetHeader>
        {job && (
          <div className="delivery-sheet-content">
            <div className="sheet-overview">
              <div>
                <h2>#{job.job_number}</h2>
                <Badge text={courierStepLabel(job)} tone={jobBadgeTone(job.status)} />
                <p>{jobSourceLabel(job)}</p>
              </div>
              <Avatar name={assigned ? courier || "שליח" : "טרם שובץ"} />
            </div>

            <div className="sheet-customer">
              <strong>{jobRecipientName(job)}</strong>
              {phone ? (
                <p>
                  <Phone size={15} />
                  <a href={`tel:${phone}`} dir="ltr">{phone}</a>
                </p>
              ) : null}
              <p>
                <MapPin size={15} />
                {job.dropoff_address || job.dropoff_area || "כתובת מסירה לא צוינה"}
              </p>
            </div>

            <Panel title="סטטוס משלוח">
              <div className="horizontal-timeline">
                {TIMELINE.map((s) => {
                  const done = level >= 0 && level >= s.v;
                  return (
                    <div key={s.v} className={done ? "done" : ""}>
                      <i>{done ? <Check size={11} /> : null}</i>
                      <small>{s.t}</small>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="איסוף ומסירה">
              <div className="confirmation-route">
                <div>
                  <span className="round-icon">
                    <Package size={21} />
                  </span>
                  <p>
                    איסוף
                    <strong>{job.pickup_address || job.pickup_area || "לא צוין"}</strong>
                  </p>
                </div>
                <div>
                  <span className="round-icon">
                    <MapPin size={21} />
                  </span>
                  <p>
                    מסירה
                    <strong>{job.dropoff_address || job.dropoff_area || "לא צוין"}</strong>
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="שליח">
              {assigned ? (
                <div className="tracking-courier" style={{ margin: 0 }}>
                  <Avatar name={courier || "שליח"} />
                  <div>
                    <strong>{courier}</strong>
                    <small>
                      <Bike size={13} />
                      שליח · {jobCourierVehicle(job) || "לא צוין"}
                    </small>
                  </div>
                </div>
              ) : (
                <p className="hint">טרם שובץ שליח. פרטי השליח יופיעו לאחר השיבוץ.</p>
              )}
            </Panel>

            <Panel title="תכולה ומחיר">
              <dl className="detail-dl">
                <dt>תכולה</dt>
                <dd>
                  {qty} × {jobItemsLabel(job)}
                </dd>
                <dt>עלות משלוח</dt>
                <dd>{money(jobPrice(job))}</dd>
                <dt>נוצר</dt>
                <dd>{formatJobWhen(job.created_at)}</dd>
              </dl>
            </Panel>

            {(notes || pickupNotes) && (
              <Panel title="הערות">
                {pickupNotes ? <p>{pickupNotes}</p> : null}
                {notes ? <p>{notes}</p> : null}
              </Panel>
            )}

            <Panel title="אישור מסירה">
              {delivered ? (
                <p>המשלוח נמסר ללקוח.</p>
              ) : (
                <p className="hint">המשלוח עדיין לא נמסר. אישור יופיע כאן אחרי המסירה.</p>
              )}
            </Panel>

            {assigned && onChat ? (
              <button type="button" className="btn primary full" onClick={() => onChat(job)}>
                <MessageCircle size={17} />
                צ׳אט עם השליח
              </button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
