import { Timestamp } from "firebase-admin/firestore";
import type { UniversityLocation } from "../../collections/universities.js";
import { ValidationError } from "../../shared-api/errors/http-error.js";

export function toIso(value: Timestamp | null | undefined): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export function parseIso(iso: string): Timestamp {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid date");
  }
  return Timestamp.fromDate(date);
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function validateTimezone(timezone: string): void {
  if (!isValidTimezone(timezone)) {
    throw new ValidationError("Invalid IANA timezone");
  }
}

export function validateLocation(location: UniversityLocation): void {
  for (const [field, value] of Object.entries(location)) {
    if (!value.trim()) {
      throw new ValidationError(`location.${field} is required`);
    }
  }
}

export function validateDateOrder(
  earlier: Timestamp,
  later: Timestamp,
  message: string,
): void {
  if (earlier.toMillis() >= later.toMillis()) {
    throw new ValidationError(message);
  }
}

export function assertDraftStatus(status: string): void {
  if (status !== "draft") {
    throw new ValidationError("Only draft universities can be modified");
  }
}

export function mintPeriodId(): string {
  return crypto.randomUUID();
}
