import { Controller, Get, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

type CheckStatus = "READY" | "WARNING" | "BLOCKED";
type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  link?: string;
  lastChecked: string;
};

@Controller("api/admin/launch-readiness")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "manager")
export class LaunchReadinessController {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async run() {
    const now = new Date().toISOString();
    const checks: Check[] = [];

    let dbUp = false;
    try {
      await this.dataSource.query("SELECT 1");
      dbUp = true;
    } catch {
      dbUp = false;
    }
    checks.push({
      id: "database",
      label: "Database",
      status: dbUp ? "READY" : "BLOCKED",
      detail: dbUp ? "PostgreSQL reachable" : "Database connection failed",
      lastChecked: now,
    });

    const jwt = !!this.config.get<string>("jwt.secret");
    checks.push({
      id: "jwt",
      label: "JWT secret",
      status: jwt ? "READY" : "BLOCKED",
      detail: jwt ? "JWT_SECRET configured" : "JWT_SECRET missing",
      lastChecked: now,
    });

    const cron = !!this.config.get<string>("cron.secret");
    checks.push({
      id: "cron",
      label: "Cron secret",
      status: cron ? "READY" : "WARNING",
      detail: cron
        ? "CRON_SECRET configured"
        : "CRON_SECRET unset — workers fail closed",
      lastChecked: now,
    });

    const green =
      !!this.config.get<string>("greenApi.instanceId") &&
      !!this.config.get<string>("greenApi.token");
    checks.push({
      id: "green-api",
      label: "Green API (WhatsApp)",
      status: green ? "READY" : "WARNING",
      detail: green
        ? "GREEN_API credentials configured"
        : "GREEN_API_* unset — WhatsApp fan-out skipped",
      lastChecked: now,
    });

    const vapid =
      !!this.config.get<string>("vapid.publicKey") &&
      !!this.config.get<string>("vapid.privateKey");
    checks.push({
      id: "vapid",
      label: "Web Push (VAPID)",
      status: vapid ? "READY" : "WARNING",
      detail: vapid
        ? "VAPID keys configured"
        : "VAPID_* unset — push send skipped",
      lastChecked: now,
    });

    const ai = !!this.config.get<string>("ai.lovableApiKey");
    checks.push({
      id: "ai-gateway",
      label: "Admin AI gateway",
      status: ai ? "READY" : "WARNING",
      detail: ai
        ? "LOVABLE_API_KEY configured"
        : "LOVABLE_API_KEY unset — admin assistant replies fail",
      lastChecked: now,
    });

    const ready = checks.filter((c) => c.status === "READY").length;
    const warning = checks.filter((c) => c.status === "WARNING").length;
    const blocked = checks.filter((c) => c.status === "BLOCKED").length;
    const overall: CheckStatus =
      blocked > 0 ? "BLOCKED" : warning > 0 ? "WARNING" : "READY";

    return { overall, ready, warning, blocked, checks };
  }
}
