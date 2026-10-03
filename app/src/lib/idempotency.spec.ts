import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api.js';
import { IdempotencyKeys } from '#lib/idempotency.js';

const REQUEST = { path: '/api/users/me/scouts', body: { firstName: 'Alex', lastName: 'Lee' } };

/**
A send that records each key and answers with the next outcome: a value, or an error to throw.
*/
function setup(...outcomes: unknown[]) {
  const keys = new IdempotencyKeys();
  const sentKeys: string[] = [];
  const send = vi.fn((key: string) => {
    sentKeys.push(key);
    const outcome = outcomes.shift();
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
  });
  async function sendOnce(request: unknown = REQUEST): Promise<unknown> {
    try {
      return await keys.send(request, send);
    } catch (error) {
      return error;
    }
  }
  return { sendOnce, sentKeys };
}

const UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;

describe('IdempotencyKeys', () => {
  it('returns the result of the send, which got a new UUID key', async () => {
    const { sendOnce, sentKeys } = setup('created');

    await expect(sendOnce()).resolves.toBe('created');
    expect(sentKeys).toEqual([expect.stringMatching(UUID)]);
  });

  it('throws the error of the send', async () => {
    const failure = new ApiError(400, { code: 'INVALID_ARGUMENT', message: 'Check.' });
    const keys = new IdempotencyKeys();

    await expect(keys.send(REQUEST, () => Promise.reject(failure))).rejects.toBe(failure);
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a 500', new ApiError(500, { code: 'INTERNAL', message: 'internal error' })],
    ['a 502 with no body', new ApiError(502, undefined)],
  ])('sends the same key again after %s, which the API did not store', async (_name, failure) => {
    const { sendOnce, sentKeys } = setup(failure, 'created');

    await sendOnce();
    await sendOnce();

    expect(sentKeys[1]).toBe(sentKeys[0]);
  });

  it.each([
    ['a success', 'created'],
    ['a 4xx, which the API stores', new ApiError(404, { code: 'NOT_FOUND', message: 'x' })],
  ])('sends a new key after %s', async (_name, outcome) => {
    const { sendOnce, sentKeys } = setup(outcome, 'created');

    await sendOnce();
    await sendOnce();

    expect(sentKeys[1]).not.toBe(sentKeys[0]);
  });

  it('sends a new key for a different request after a network failure', async () => {
    const { sendOnce, sentKeys } = setup(new TypeError('Failed to fetch'), 'created');

    await sendOnce();
    await sendOnce({ ...REQUEST, body: { firstName: 'Sam', lastName: 'Lee' } });

    expect(sentKeys[1]).not.toBe(sentKeys[0]);
  });

  it('keeps the key of each request apart', async () => {
    const otherPath = { ...REQUEST, path: '/api/registrations/u1/c2' };
    const network = new TypeError('Failed to fetch');
    const { sendOnce, sentKeys } = setup(network, network, 'created', 'created');

    await sendOnce();
    await sendOnce(otherPath);
    await sendOnce();
    await sendOnce(otherPath);

    expect(sentKeys[0]).not.toBe(sentKeys[1]);
    expect(sentKeys[2]).toBe(sentKeys[0]);
    expect(sentKeys[3]).toBe(sentKeys[1]);
  });
});
