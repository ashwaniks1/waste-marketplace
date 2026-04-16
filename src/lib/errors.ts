/** Typed HTTP errors for route handlers — consumed by `handleRouteError`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extras?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
