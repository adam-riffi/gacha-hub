/**
 * A request the domain refuses (ADR 0011): a service throws it, the error handler answers it as
 * `{ error: code, ...details }` with its status, as the routes did inline before.
 */
export class DomainError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "DomainError";
  }

  /** Nothing of the user's under that id. */
  static notFound(): DomainError {
    return new DomainError(404, "not_found");
  }
}
