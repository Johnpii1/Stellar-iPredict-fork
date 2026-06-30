export interface FastifyErrorLike extends Error { statusCode?: number; code?: string }
export interface FastifyReplyLike { status(code: number): { send(payload: unknown): unknown } }
export interface FastifyInstanceLike { setErrorHandler(handler: typeof errorHandler): void }
export type FastifyRequestLike = object;

export class HttpError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message = "Bad request") => new HttpError(400, "BAD_REQUEST", message);
export const notFound = (message = "Not found") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message = "Conflict") => new HttpError(409, "CONFLICT", message);

export interface ErrorResponse { error: { code: string; message: string } }

function mapError(error: FastifyErrorLike | Error): { statusCode: number; code: string; message: string } {
  if (error instanceof HttpError) return { statusCode: error.statusCode, code: error.code, message: error.message };
  const maybeStatus = (error as FastifyErrorLike).statusCode;
  const statusCode = typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 500 ? maybeStatus : 500;
  if (statusCode < 500) {
    return { statusCode, code: (error as FastifyErrorLike).code ?? "BAD_REQUEST", message: error.message || "Request failed" };
  }
  return { statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal server error" };
}

export function errorHandler(error: FastifyErrorLike, _request: FastifyRequestLike, reply: FastifyReplyLike): void {
  const mapped = mapError(error);
  reply.status(mapped.statusCode).send({ error: { code: mapped.code, message: mapped.message } } satisfies ErrorResponse);
}

export function registerErrorHandler(app: FastifyInstanceLike): void {
  app.setErrorHandler(errorHandler);
}
