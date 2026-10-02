import { describe, expect, it } from 'vitest';
import { ApiError } from '#lib/api.js';
import { apiErrorMessage } from '#lib/apiErrorMessage.js';

const FALLBACK = 'Could not save the class.';

describe('apiErrorMessage', () => {
  it('returns the error text of the API error body', () => {
    const error = new ApiError(400, { error: 'Title is required' });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Title is required');
  });

  it('returns the fallback when the API error has no body', () => {
    expect(apiErrorMessage(new ApiError(502, undefined), FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback when the body has no error text', () => {
    expect(apiErrorMessage(new ApiError(500, {}), FALLBACK)).toBe(FALLBACK);
  });

  it('appends the titles of the classes in the details, in parentheses', () => {
    const error = new ApiError(409, {
      error: 'These classes use the period',
      details: {
        classes: [
          { classId: 'c1', title: 'Camping' },
          { classId: 'c2', title: 'First Aid' },
        ],
      },
    });

    expect(apiErrorMessage(error, FALLBACK)).toBe(
      'These classes use the period (Camping, First Aid)',
    );
  });

  it('appends the class titles to the fallback when the body has no error text', () => {
    const error = new ApiError(409, {
      details: { classes: [{ classId: 'c1', title: 'Camping' }] },
    });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Could not save the class. (Camping)');
  });

  it('appends nothing when the list of classes is empty', () => {
    const error = new ApiError(409, { error: 'Conflict', details: { classes: [] } });

    expect(apiErrorMessage(error, FALLBACK)).toBe('Conflict');
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a value that is not an error', 'oops'],
    ['undefined', undefined],
  ])('returns the fallback for %s', (_name, error) => {
    expect(apiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});
