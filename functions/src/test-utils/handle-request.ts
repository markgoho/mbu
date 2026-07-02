/**
 * Typed wrapper around Elysia's `.handle()` method for use in tests.
 */
export async function handleRequest(
  app: { handle: (request: Request) => Promise<Response> },
  request: Request,
): Promise<Response> {
  return app.handle(request);
}
