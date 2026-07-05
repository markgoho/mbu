import { describe, expect, it } from 'vitest';
import type { ClassRoster, RosterResponse, RosterRow } from '../api-types/registrations-api.types';
import { classRosterToCsv, eventRosterToCsv } from './roster-csv';

function row(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    scoutId: 'scout1',
    scoutFirstName: 'Alex',
    scoutLastName: 'Smith',
    scoutUnit: 'Troop 1',
    accommodations: null,
    parentName: 'Jamie Smith',
    parentEmail: 'jamie@example.com',
    consentReceived: true,
    status: 'enrolled',
    ...overrides,
  };
}

function classRoster(overrides: Partial<ClassRoster> = {}): ClassRoster {
  return {
    class: {
      classId: 'cls1',
      badgeTitle: 'Camping',
      periodLabels: ['Period 1'],
      room: 'Room A',
      capacity: 10,
      enrolledCount: 1,
      waitlistCount: 0,
      counselorNames: ['Pat Counselor'],
    },
    enrolled: [row()],
    waitlisted: [],
    ...overrides,
  };
}

describe('classRosterToCsv', () => {
  it('lists the class column header row', () => {
    const csv = classRosterToCsv(classRoster({ enrolled: [], waitlisted: [] }));
    expect(csv).toBe(
      'Present,Last Name,First Name,Unit,Status,Waitlist Position,Accommodations,Parent Name,Parent Email,Consent',
    );
  });

  it('leaves the Present column empty for enrolled rows', () => {
    const csv = classRosterToCsv(classRoster());
    const [, dataLine] = csv.split('\r\n');
    expect(dataLine).toBe(',Smith,Alex,Troop 1,enrolled,,,Jamie Smith,jamie@example.com,Yes');
  });

  it('numbers waitlisted rows by position, 1-indexed', () => {
    const csv = classRosterToCsv(
      classRoster({
        enrolled: [],
        waitlisted: [
          row({ scoutId: 's1', scoutLastName: 'First' }),
          row({ scoutId: 's2', scoutLastName: 'Second' }),
        ],
      }),
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain(',First,');
    expect(lines[1]?.split(',')[5]).toBe('1');
    expect(lines[2]?.split(',')[5]).toBe('2');
  });

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = classRosterToCsv(
      classRoster({
        enrolled: [row({ accommodations: 'Needs a "quiet" room, near exit\nand a chair' })],
      }),
    );
    expect(csv).toContain('"Needs a ""quiet"" room, near exit\nand a chair"');
  });
});

describe('eventRosterToCsv', () => {
  function roster(overrides: Partial<RosterResponse> = {}): RosterResponse {
    return {
      university: {
        title: 'Spring MBU',
        startDate: '2026-06-01T12:00:00.000Z',
        endDate: null,
        location: {
          name: 'Scout Hall',
          address: '1 Main St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
        timezone: 'America/New_York',
      },
      classRosters: [classRoster()],
      ...overrides,
    };
  }

  it('prefixes each row with Badge, Period(s), Room ahead of the class columns', () => {
    const csv = eventRosterToCsv(roster());
    const [header, dataLine] = csv.split('\r\n');
    expect(header).toBe(
      'Badge,Period(s),Room,Present,Last Name,First Name,Unit,Status,Waitlist Position,Accommodations,Parent Name,Parent Email,Consent',
    );
    expect(dataLine).toBe(
      'Camping,Period 1,Room A,,Smith,Alex,Troop 1,enrolled,,,Jamie Smith,jamie@example.com,Yes',
    );
  });

  it('joins multiple period labels with a semicolon', () => {
    const csv = eventRosterToCsv(
      roster({
        classRosters: [
          classRoster({
            class: {
              ...classRoster().class,
              periodLabels: ['Period 1', 'Period 2'],
            },
          }),
        ],
      }),
    );
    expect(csv.split('\r\n')[1]).toContain('Period 1; Period 2');
  });

  it('includes every class, one after another', () => {
    const csv = eventRosterToCsv(
      roster({
        classRosters: [
          classRoster({ class: { ...classRoster().class, badgeTitle: 'Camping' } }),
          classRoster({
            class: { ...classRoster().class, badgeTitle: 'Archery' },
            enrolled: [],
            waitlisted: [],
          }),
        ],
      }),
    );
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2); // header + 1 Camping row (Archery has no rows)
    expect(lines[1]).toContain('Camping');
  });
});
