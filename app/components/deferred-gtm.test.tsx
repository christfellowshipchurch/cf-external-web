import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeferredGtm } from './deferred-gtm';

describe('DeferredGtm', () => {
  const gtmId = 'GTM-TEST123';

  beforeEach(() => {
    document
      .querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
      .forEach((el) => el.remove());
    window.dataLayer = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    document
      .querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
      .forEach((el) => el.remove());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('injects the GTM script for the given container id', () => {
    render(<DeferredGtm gtmId={gtmId} />);
    vi.runAllTimers();

    const scripts = document.querySelectorAll(
      `script[src="https://www.googletagmanager.com/gtm.js?id=${gtmId}"]`,
    );
    expect(scripts).toHaveLength(1);
  });

  it('queues the GTM bootstrap before injecting the script so tags can send', () => {
    const pushSpy = vi.spyOn(window.dataLayer, 'push');
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    render(<DeferredGtm gtmId={gtmId} />);
    vi.runAllTimers();

    expect(pushSpy).toHaveBeenCalledWith({
      'gtm.start': expect.any(Number),
      event: 'gtm.js',
    });

    const scriptAppendIndex = appendSpy.mock.calls.findIndex(
      ([node]) =>
        node instanceof window.HTMLScriptElement &&
        node.src === `https://www.googletagmanager.com/gtm.js?id=${gtmId}`,
    );
    expect(scriptAppendIndex).toBeGreaterThanOrEqual(0);
    expect(pushSpy.mock.invocationCallOrder[0]).toBeLessThan(
      appendSpy.mock.invocationCallOrder[scriptAppendIndex],
    );
  });

  it('does not inject a duplicate script when mounted repeatedly for the same id', () => {
    const { unmount } = render(<DeferredGtm gtmId={gtmId} />);
    vi.runAllTimers();
    unmount();

    render(<DeferredGtm gtmId={gtmId} />);
    vi.runAllTimers();

    const scripts = document.querySelectorAll(
      `script[src="https://www.googletagmanager.com/gtm.js?id=${gtmId}"]`,
    );
    expect(scripts).toHaveLength(1);
  });

  it('does not inject a second script when one already exists in the document', () => {
    const existing = document.createElement('script');
    existing.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(existing);

    render(<DeferredGtm gtmId={gtmId} />);
    vi.runAllTimers();

    expect(
      document.querySelectorAll(
        `script[src="https://www.googletagmanager.com/gtm.js?id=${gtmId}"]`,
      ),
    ).toHaveLength(1);
  });
});
