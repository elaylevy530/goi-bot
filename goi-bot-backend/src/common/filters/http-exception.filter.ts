import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { AppError } from "../errors/app.error";

@Catch()
export class AppHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppError) {
      this.logger.error(`[${exception.code}] ${exception.message}`, exception.stack);
      response.status(exception.status).json({
        error: { code: exception.code, message: exception.userMessage },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const bodyObj =
        typeof body === "object" && body !== null
          ? (body as { code?: string; message?: string | string[] })
          : null;
      const message =
        typeof body === "string"
          ? body
          : (bodyObj?.message ?? exception.message);
      const code =
        bodyObj?.code ??
        (status === 401
          ? "unauthorized"
          : status === 403
            ? "forbidden"
            : "bad_request");
      response.status(status).json({
        error: {
          code,
          message: Array.isArray(message) ? message.join(", ") : message,
        },
      });
      return;
    }

    this.logger.error("Unhandled error", exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: "internal", message: "אירעה שגיאה. נסה שוב בעוד רגע" },
    });
  }
}
