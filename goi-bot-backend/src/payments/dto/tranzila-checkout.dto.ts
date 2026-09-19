import { GuestJobRefDto } from "../../jobs/dto/guest-job-ref.dto";

/** Guest checkout request: job_id + tracking_token only — the amount is always server-computed. */
export class TranzilaCheckoutDto extends GuestJobRefDto {}
