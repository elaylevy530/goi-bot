import { In, Not, type Repository } from "typeorm";
import { Job } from "./entities/job.entity";

export const ISRAEL_TZ = "Asia/Jerusalem";
export const SCHEDULED_GO_ONLINE_MINUTES = 30;
export const LIVE_JOB_OFFLINE_ERROR = "לא ניתן לעבור למצב לא זמין בזמן משלוח פעיל";

const DONE_STATUSES = ["הושלמה", "בוטלה"];

export type JobScheduleFields = {
  job_date?: string | Date | null;
  job_time?: string | null;
};

function parseFirstHhMm(raw?: string | null): { hour: number; minute: number } | null {
  if (!raw) return null;
  const match = String(raw).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function jobDateYmd(jobDate?: string | Date | null): string | null {
  if (!jobDate) return null;
  if (jobDate instanceof Date && !Number.isNaN(jobDate.getTime())) {
    return jobDate.toISOString().slice(0, 10);
  }
  const raw = String(jobDate).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/** Convert a wall-clock time in a timezone to a UTC Date. */
function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(new Date(utc))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asIfLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(utc - (asIfLocal - utc));
}

/** Scheduled start instant in Israel. Immediate jobs (no date/time) return null. */
export function jobStartAt(job: JobScheduleFields, now = new Date()): Date | null {
  const ymd = jobDateYmd(job.job_date);
  const time = parseFirstHhMm(job.job_time);
  if (!ymd && !time) return null;
  const dateStr = ymd ?? new Intl.DateTimeFormat("en-CA", { timeZone: ISRAEL_TZ }).format(now);
  const [year, month, day] = dateStr.split("-").map(Number);
  const hour = time?.hour ?? 0;
  const minute = time?.minute ?? 0;
  return zonedLocalToUtc(ISRAEL_TZ, year, month, day, hour, minute);
}

/** Assigned job that is already in progress (not a future scheduled slot). */
export function isLiveActiveJob(job: JobScheduleFields, now = new Date()): boolean {
  const start = jobStartAt(job, now);
  if (!start) return true;
  return start.getTime() <= now.getTime();
}

export function isWithinScheduledGoOnlineWindow(job: JobScheduleFields, now = new Date()): boolean {
  const start = jobStartAt(job, now);
  if (!start) return false;
  const ms = start.getTime() - now.getTime();
  const windowMs = SCHEDULED_GO_ONLINE_MINUTES * 60_000;
  const catchUpMs = 15 * 60_000;
  return ms <= windowMs && ms >= -catchUpMs;
}

export async function courierHasLiveActiveJob(
  jobs: Repository<Job>,
  courierId: string,
  now = new Date(),
): Promise<boolean> {
  const rows = await jobs.find({
    where: {
      selected_courier_id: courierId,
      status: Not(In(DONE_STATUSES)),
    },
    select: ["id", "job_date", "job_time"],
    take: 200,
  });
  return rows.some((row) => isLiveActiveJob(row, now));
}
