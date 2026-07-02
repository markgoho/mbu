/**
 * Minimal Response interface for Firebase Functions HTTP handlers.
 */
export interface FirebaseResponse {
  readonly headersSent: boolean;
  status(code: number): this;
  setHeader(name: string, value: string): this;
  send(body: string | Buffer): void;
  json(body: unknown): void;
}
