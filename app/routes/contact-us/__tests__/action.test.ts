import { beforeEach, describe, expect, it, vi } from 'vitest';
import { action } from '../action';
import { postRockData } from '~/lib/.server/fetch-rock-data';
import {
  FORM_STARTED_AT_FIELD,
  HONEYPOT_FIELD,
  MIN_FILL_TIME_MS,
} from '~/lib/bot-protection';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  postRockData: vi.fn(),
}));

function submit(overrides: Record<string, string> = {}) {
  const body = new FormData();
  const fields: Record<string, string> = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '561-555-0100',
    campus: 'campus-guid',
    message: 'Hello',
    [HONEYPOT_FIELD]: '',
    [FORM_STARTED_AT_FIELD]: String(Date.now() - 30_000),
    ...overrides,
  };
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));

  const request = new Request('http://localhost/contact-us', {
    method: 'POST',
    body,
  });
  return action({
    request,
    params: {},
    context: {},
  } as never) as Promise<Response>;
}

describe('contact-us action bot protection', () => {
  beforeEach(() => {
    vi.mocked(postRockData).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('sends a real submission to the Rock workflow', async () => {
    const response = await submit();

    expect(postRockData).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ success: true });
  });

  it('never launches a Rock workflow when the honeypot is filled, but still reports success', async () => {
    const response = await submit({ [HONEYPOT_FIELD]: 'spam' });

    expect(postRockData).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ success: true });
  });

  it('never launches a Rock workflow for a submission faster than a person could type', async () => {
    const response = await submit({
      [FORM_STARTED_AT_FIELD]: String(Date.now() - MIN_FILL_TIME_MS + 1000),
    });

    expect(postRockData).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ success: true });
  });

  it('logs the block reason without any submitted values', async () => {
    await submit({ [HONEYPOT_FIELD]: 'spam' });

    const logged = vi.mocked(console.warn).mock.calls.flat().join(' ');
    expect(logged).toContain('honeypot');
    expect(logged).not.toMatch(/jane|Doe|561|Hello/i);
  });
});
