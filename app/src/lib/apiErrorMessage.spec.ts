import { describe, expect, it } from 'vitest';
import { ApiError } from '#lib/api.js';
import { apiErrorMessage, apiFieldErrors, hasCode } from '#lib/apiErrorMessage.js';

const FALLBACK = 'Could not save the class.';

describe('apiErrorMessage', () => {
  it('returns the message of the API error body', () => {
    const error = new ApiError(400, { code: 'INVALID_ARGUMENT', message: 'Check the class form.' });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Check the class form.');
  });

  it('returns the fallback when the API error has no body (a body of an unknown shape, or no JSON)', () => {
    expect(apiErrorMessage(new ApiError(502, undefined), FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for INTERNAL: the message of the API has nothing for a person', () => {
    const error = new ApiError(500, { code: 'INTERNAL', message: 'internal error' });

    expect(apiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the message of a code that is also the name of an object property', () => {
    const error = new ApiError(409, { code: 'constructor', message: 'A newer refusal' });

    expect(apiErrorMessage(error, FALLBACK)).toBe('A newer refusal');
  });

  it('returns the message of a code that the app does not know', () => {
    const error = new ApiError(409, { code: 'SOMETHING_NEW', message: 'A newer refusal' });

    expect(apiErrorMessage(error, FALLBACK)).toBe('A newer refusal');
  });

  it.each([
    ['RATE_LIMITED', 'Too many requests. Wait a minute, then try again.'],
    [
      'IDEMPOTENCY_KEY_REUSED',
      'The request was sent again with different values. Reload the page, then try again.',
    ],
    [
      'FAILED_PRECONDITION',
      'The university cannot make that change in its current status. Reload the page to see its status.',
    ],
  ])('returns the text of the app for %s', (code, text) => {
    const error = new ApiError(409, { code, message: 'text of the server' });

    expect(apiErrorMessage(error, FALLBACK)).toBe(text);
  });

  it.each(['PERIOD_CONFLICT', 'CONFLICT'])(
    'appends the badge titles of the classes in the details of %s, in parentheses',
    (code) => {
      const error = new ApiError(409, {
        code,
        message: 'Cannot remove periods that are assigned to classes',
        details: { c1: 'Camping', c2: 'First Aid' },
      });

      expect(apiErrorMessage(error, FALLBACK)).toBe(
        'Cannot remove periods that are assigned to classes (Camping, First Aid)',
      );
    },
  );

  it('appends nothing when a conflict has no details', () => {
    const error = new ApiError(409, { code: 'CONFLICT', message: 'Conflict' });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Conflict');
  });

  it('does not append the field messages of INVALID_ARGUMENT', () => {
    const error = new ApiError(400, {
      code: 'INVALID_ARGUMENT',
      message: 'Check the class form.',
      details: { capacity: 'Enter a capacity of 1 or more' },
    });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Check the class form.');
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a value that is not an error', 'oops'],
    ['undefined', undefined],
  ])('returns the fallback for %s', (_name, error) => {
    expect(apiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});

describe('apiFieldErrors', () => {
  it('returns the details of INVALID_ARGUMENT, keyed by the JSON name of the field', () => {
    const details = { title: 'Enter a title.', 'location.city': 'Enter the city.' };
    const error = new ApiError(400, { code: 'INVALID_ARGUMENT', message: 'Check.', details });

    expect(apiFieldErrors(error)).toEqual(details);
  });

  it('returns no field errors for the class titles of a conflict', () => {
    const error = new ApiError(409, {
      code: 'PERIOD_CONFLICT',
      message: 'Overlap',
      details: { c1: 'Camping' },
    });

    expect(apiFieldErrors(error)).toEqual({});
  });

  it.each([
    [
      'INVALID_ARGUMENT with no details',
      new ApiError(400, { code: 'INVALID_ARGUMENT', message: 'x' }),
    ],
    ['an API error with no body', new ApiError(400, undefined)],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('returns no field errors for %s', (_name, error) => {
    expect(apiFieldErrors(error)).toEqual({});
  });
});

describe('hasCode', () => {
  it('is true for an API error with the code', () => {
    expect(hasCode(new ApiError(409, { code: 'CLASS_FULL', message: 'Full' }), 'CLASS_FULL')).toBe(
      true,
    );
  });

  it.each([
    ['a different code', new ApiError(409, { code: 'CONFLICT', message: 'x' })],
    ['an API error with no body', new ApiError(409, undefined)],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('is false for %s', (_name, error) => {
    expect(hasCode(error, 'CLASS_FULL')).toBe(false);
  });
});
