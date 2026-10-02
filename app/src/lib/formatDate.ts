/**
 * Date text for the pages. The functions use the timezone of the browser, as
 * the Angular `DatePipe` did. They do not read the IANA timezone of a university.
 */

const mediumDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/**
The date of an ISO datetime as `Jun 1, 2026` (the `mediumDate` format of the Angular `DatePipe`).
*/
export function formatMediumDate(iso: string): string {
  return mediumDate.format(new Date(iso));
}
