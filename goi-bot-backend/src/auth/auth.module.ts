import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { CourierPasswordReset } from "../accounts/entities/courier-password-reset.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { User } from "../accounts/entities/user.entity";
import { UserRole } from "../accounts/entities/user-role.entity";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminPreviewSession } from "./entities/admin-preview-session.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthRequestInterceptor } from "./interceptors/auth-request.interceptor";
import { FilesModule } from "../files/files.module";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("jwt.secret"),
        signOptions: {
          expiresIn: (config.get<string>("jwt.expiresIn") ?? "7d") as JwtSignOptions["expiresIn"],
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      UserRole,
      Customer,
      Courier,
      CourierPasswordReset,
      AdminPreviewSession,
    ]),
    FilesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    CronSecretGuard,
    { provide: APP_INTERCEPTOR, useClass: AuthRequestInterceptor },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule {}
