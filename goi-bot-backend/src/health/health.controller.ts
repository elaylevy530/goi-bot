import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

@Controller("api/health")
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    let database: "up" | "down" = "down";
    try {
      await this.dataSource.query("SELECT 1");
      database = "up";
    } catch {
      database = "down";
    }

    return {
      ok: database === "up",
      service: "goi-bot-backend",
      env: this.config.get<string>("nodeEnv") ?? "development",
      database,
      synchronize: this.config.get<boolean>("database.synchronize") ?? false,
      timestamp: new Date().toISOString(),
    };
  }
}
