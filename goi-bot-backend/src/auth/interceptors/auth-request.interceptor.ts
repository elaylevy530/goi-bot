import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { authAls } from "../auth-als";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PREVIEW_MUTATION_ALLOWLIST = ["/api/auth/admin/preview/exit"];

/**
 * 1) Reject mutating requests while an admin preview claim is active.
 * 2) Expose `request.auth` to services via AsyncLocalStorage for the request.
 */
@Injectable()
export class AuthRequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.auth;

    if (auth?.preview) {
      const method = (request.method ?? "GET").toUpperCase();
      if (!SAFE_METHODS.has(method)) {
        const path = (request.path || request.url || "").split("?")[0];
        const allowed = PREVIEW_MUTATION_ALLOWLIST.some(
          (entry) => path === entry || path.endsWith(entry),
        );
        if (!allowed) {
          throw new ForbiddenException({
            code: "preview_read_only",
            message:
              "מצב תצוגת מנהל הוא לקריאה בלבד. לא ניתן לבצע פעולות כתיבה.",
          });
        }
      }
    }

    if (!auth) return next.handle();

    return new Observable((subscriber) => {
      authAls.run({ auth }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
