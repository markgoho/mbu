/**
 * Date and time text for the pages, in the formats of the Angular `DatePipe`.
 *
 * With no `timeZone`, a function uses the timezone of the browser. The pages of
 * an event give the IANA timezone of the university (`America/New_York`), so
 * that all visitors see the local date and time of the event.
 */

const LOCALE = 'en-US';

// Newer ICU data puts a narrow no-break space (U+202F) before "AM" / "PM".
// The Angular `shortTime` format had a normal space.
const NARROW_NO_BREAK_SPACE = String.fromCodePoint(8239);

/**
The date of an ISO datetime as `Jun 1, 2026` (the `mediumDate` format of the Angular `DatePipe`).
*/
export function formatMediumDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone }).format(new Date(iso));
}

/**
The time of an ISO datetime as `9:00 AM` (the `shortTime` format of the Angular `DatePipe`).
*/
export function formatShortTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short', timeZone })
    .format(new Date(iso))
    .replaceAll(NARROW_NO_BREAK_SPACE, ' ');
}
