import { describe, it, expect } from 'vitest';
import { AuthenticationError, RockAPIError } from '../error-types';

describe('AuthenticationError', () => {
  it('is an instance of Error', () => {
    const err = new AuthenticationError('not allowed');
    expect(err).toBeInstanceOf(Error);
  });

  it('sets name to AuthenticationError', () => {
    const err = new AuthenticationError('not allowed');
    expect(err.name).toBe('AuthenticationError');
  });

  it('sets message correctly', () => {
    const err = new AuthenticationError('unauthorized');
    expect(err.message).toBe('unauthorized');
  });

  it('supports cause option', () => {
    const cause = new Error('original');
    const err = new AuthenticationError('wrapper', { cause });
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});

describe('RockAPIError', () => {
  it('is an instance of Error', () => {
    const err = new RockAPIError('not found', 404);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets name to RockAPIError', () => {
    const err = new RockAPIError('not found', 404);
    expect(err.name).toBe('RockAPIError');
  });

  it('sets message correctly', () => {
    const err = new RockAPIError('server error', 500);
    expect(err.message).toBe('server error');
  });

  it('exposes statusCode', () => {
    const err = new RockAPIError('bad request', 400);
    expect(err.statusCode).toBe(400);
  });

  it('supports cause option', () => {
    const cause = new Error('original');
    const err = new RockAPIError('wrapper', 500, { cause });
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});
