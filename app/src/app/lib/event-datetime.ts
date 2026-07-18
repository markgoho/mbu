/**
 * Convert between API datetimes and `<input type="datetime-local">` values
 * in the browser/runtime local timezone. These functions never interpret a
 * University IANA timezone; they retain minute precision and native Date
 * invalid-input and DST behavior.
 */

/** Convert a browser-local `datetime-local` input value to an ISO UTC string. */
export function datetimeInputToIso(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

/** Render an ISO datetime for a browser-local `datetime-local` input. */
export function isoToDatetimeInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
