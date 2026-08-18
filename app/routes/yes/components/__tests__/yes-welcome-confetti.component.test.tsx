import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOPLAY_PROBE_SRC,
  CONFETTI_ANIMATED_SRC,
  CONFETTI_STILL_SRC,
  YesWelcomeConfetti,
} from '../yes-welcome-confetti.component';

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  mockMatchMedia(false);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('YesWelcomeConfetti', () => {
  it('keeps the animated overlay when muted autoplay is allowed', () => {
    render(<YesWelcomeConfetti />);
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      CONFETTI_ANIMATED_SRC,
    );
  });

  it('uses the still frame when muted autoplay is blocked (Low Power Mode)', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new Error('NotAllowedError'),
    );

    render(<YesWelcomeConfetti />);

    await waitFor(() => {
      expect(document.querySelector('img')).toHaveAttribute(
        'src',
        CONFETTI_STILL_SRC,
      );
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('probes with a tiny H.264 file so iOS WebM autoplay failure is not a false positive', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(function (this: HTMLVideoElement) {
        expect(this.getAttribute('src') ?? this.src).toContain(
          AUTOPLAY_PROBE_SRC,
        );
        return Promise.resolve();
      });

    render(<YesWelcomeConfetti />);
    await waitFor(() => expect(play).toHaveBeenCalled());
  });

  it('uses the still frame when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    render(<YesWelcomeConfetti />);
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      CONFETTI_STILL_SRC,
    );
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
