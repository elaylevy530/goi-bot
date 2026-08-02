import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TYPEORM_ENTITIES } from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.getOrThrow<string>("database.host"),
        port: config.getOrThrow<number>("database.port"),
        username: config.getOrThrow<string>("database.username"),
        password: config.getOrThrow<string>("database.password"),
        database: config.getOrThrow<string>("database.name"),
        synchronize: config.get<boolean>("database.synchronize") ?? false,
        entities: [...TYPEORM_ENTITIES],
        autoLoadEntities: true,
        // Schema changes only via synchronize + entities — no TypeORM migrations.
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
