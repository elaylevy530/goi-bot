export type TimingStamp = Date | string | null | undefined;

export type TimingLog = {
  new_status?: string | null;
  created_at?: TimingStamp;
};

export type TimingJob = {
  accepted_at?: TimingStamp;
  heading_to_pickup_at?: TimingStamp;
  arrived_at_pickup_at?: TimingStamp;
  picked_up_at?: TimingStamp;
  delivered_at?: TimingStamp;
};

const HEADING = new Set(["בדרך לאיסוף", "יצאתי לאיסוף"]);
const ARRIVED = new Set(["הגעתי לאיסוף"]);
const PICKED = new Set(["אספתי"]);
const DELIVERED = new Set(["נמסר"]);

function firstLog(logs: TimingLog[], names: Set<string>) {
  const hit = logs.find((l) => names.has(String(l.new_status ?? "")));
  return hit?.created_at ?? null;
}

export function timelineFromStatusLogs(logs: TimingLog[]) {
  return {
    heading_to_pickup_at: firstLog(logs, HEADING),
    arrived_at_pickup_at: firstLog(logs, ARRIVED),
    picked_up_at: firstLog(logs, PICKED),
    delivered_at: firstLog(logs, DELIVERED),
  };
}

export function resolveJobTiming(
  job: TimingJob | null | undefined,
  outcome: TimingJob | null | undefined,
  logs: TimingLog[] = [],
) {
  const fromLogs = timelineFromStatusLogs(logs);
  const heading =
    job?.heading_to_pickup_at ?? fromLogs.heading_to_pickup_at ?? job?.accepted_at ?? null;
  const arrived = job?.arrived_at_pickup_at ?? fromLogs.arrived_at_pickup_at ?? null;
  const picked =
    job?.picked_up_at ?? outcome?.picked_up_at ?? fromLogs.picked_up_at ?? null;
  const delivered =
    job?.delivered_at ?? outcome?.delivered_at ?? fromLogs.delivered_at ?? null;
  return {
    accepted_at: job?.accepted_at ?? null,
    heading_to_pickup_at: heading,
    arrived_at_pickup_at: arrived,
    picked_up_at: picked,
    delivered_at: delivered,
  };
}
