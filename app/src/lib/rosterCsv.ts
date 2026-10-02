import type {
  ClassRoster,
  RosterResponse,
  RosterRow,
} from '#lib/api-types/registrations-api.types.js';

/**
 * RFC-4180 field escaping: quote a field if it contains a comma, quote, or
 * line break, doubling any embedded quotes.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map((field) => csvField(field)).join(',');
}

function rosterRowFields(row: RosterRow, waitlistPosition: string): string[] {
  return [
    '', // Present
    row.scoutLastName ?? '',
    row.scoutFirstName ?? '',
    row.scoutUnit ?? '',
    row.status,
    waitlistPosition,
    row.accommodations ?? '',
    row.parentName ?? '',
    row.parentEmail ?? '',
    row.consentReceived ? 'Yes' : 'No',
  ];
}

/**
The rows of one class: the enrolled scouts, then the waitlisted scouts with their 1-based position.
*/
function classRosterRows(classRoster: ClassRoster): string[][] {
  return [
    ...classRoster.enrolled.map((row) => rosterRowFields(row, '')),
    ...classRoster.waitlisted.map((row, index) => rosterRowFields(row, String(index + 1))),
  ];
}

const CLASS_COLUMNS = [
  'Present',
  'Last Name',
  'First Name',
  'Unit',
  'Status',
  'Waitlist Position',
  'Accommodations',
  'Parent Name',
  'Parent Email',
  'Consent',
];

const EVENT_COLUMNS = ['Badge', 'Period(s)', 'Room', ...CLASS_COLUMNS];

/**
CSV for a single class's roster (enrolled then waitlisted).
*/
export function classRosterToCsv(classRoster: ClassRoster): string {
  const lines = [csvRow(CLASS_COLUMNS)];
  for (const fields of classRosterRows(classRoster)) {
    lines.push(csvRow(fields));
  }
  return lines.join('\r\n');
}

/**
CSV for every class in the event, each row prefixed with the class's badge/period/room.
*/
export function eventRosterToCsv(roster: RosterResponse): string {
  const lines = [csvRow(EVENT_COLUMNS)];
  for (const classRoster of roster.classRosters) {
    const prefix = [
      classRoster.class.badgeTitle,
      classRoster.class.periodLabels.join('; '),
      classRoster.class.room ?? '',
    ];
    for (const fields of classRosterRows(classRoster)) {
      lines.push(csvRow([...prefix, ...fields]));
    }
  }
  return lines.join('\r\n');
}
