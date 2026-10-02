import { describe, expect, it } from 'vitest';
import { isEmailAddress } from '#lib/emailAddress.js';

describe('isEmailAddress', () => {
  it.each(['scout@example.com', 'first.last+tag@troop-123.example.org', 'a@b'])(
    'accepts %s',
    (value) => {
      expect(isEmailAddress(value)).toBe(true);
    },
  );

  it.each([
    ['an empty value', ''],
    ['a value with no @', 'scout.example.com'],
    ['a value with no local part', '@example.com'],
    ['a value with no domain', 'scout@'],
    ['a value with a space', 'scout @example.com'],
    ['a domain label that starts with a hyphen', 'scout@-example.com'],
    ['a local part that ends with a dot', 'scout.@example.com'],
    ['a local part of more than 64 characters', `${'a'.repeat(65)}@example.com`],
    [
      'a value of more than 254 characters',
      `scout@${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}`,
    ],
  ])('refuses %s', (_name, value) => {
    expect(isEmailAddress(value)).toBe(false);
  });
});
