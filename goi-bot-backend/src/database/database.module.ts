import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TYPEORM_ENTITIES } from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("database.url");
        const ssl = config.get<boolean | { rejectUnauthorized: boolean }>("database.ssl") ?? false;

        return {
          type: "postgres" as const,
          ...(url
            ? { url }
            : {
                host: config.getOrThrow<string>("database.host"),
                port: config.getOrThrow<number>("database.port"),
                username: config.getOrThrow<string>("database.username"),
                password: config.getOrThrow<string>("database.password"),
                database: config.getOrThrow<string>("database.name"),
              }),
          ssl,
          synchronize: config.get<boolean>("database.synchronize") ?? false,
          entities: [...TYPEORM_ENTITIES],
          autoLoadEntities: true,
          // Schema changes only via synchronize + entities — no TypeORM migrations.
          migrationsRun: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
