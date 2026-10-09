import { act, render } from '@testing-library/react';
import confetti from 'canvas-confetti';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANIMATION_DURATION_MS,
  AUTOPLAY_PROBE_SRC,
  CONFETTI_COLORS,
  CONFETTI_STILL_SRC,
  EMIT_DURATION_MS,
  YesWelcomeConfetti,
} from '../yes-welcome-confetti.component';

const fire = vi.hoisted(() => Object.assign(vi.fn(), { reset: vi.fn() }));

vi.mock('canvas-confetti', () => ({
  default: { create: vi.fn(() => fire) },
}));

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const flushProbe = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  mockMatchMedia(false);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(confetti.create).mockClear();
  fire.mockClear();
  fire.reset.mockClear();
});

describe('YesWelcomeConfetti', () => {
  it('draws confetti on a canvas instead of downloading an animated image', async () => {
    render(<YesWelcomeConfetti />);
    await flushProbe();

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(confetti.create).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ resize: true }),
    );
  });

  it('rains brand-colored confetti from above the top edge, like the old animation', async () => {
    render(<YesWelcomeConfetti />);
    await flushProbe();

    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        angle: 270,
        colors: CONFETTI_COLORS,
        origin: expect.objectContaining({ y: expect.any(Number) }),
      }),
    );
    const { origin } = fire.mock.calls[0][0];
    expect(origin.y).toBeLessThanOrEqual(0);
  });

  it('plays once: stops emitting, then removes the canvas and frees the animation', async () => {
    render(<YesWelcomeConfetti />);
    await flushProbe();

    await act(() => vi.advanceTimersByTimeAsync(EMIT_DURATION_MS + 500));
    const firedWhileEmitting = fire.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(fire.mock.calls.length).toBe(firedWhileEmitting);

    await act(() => vi.advanceTimersByTimeAsync(ANIMATION_DURATION_MS));
    expect(fire.reset).toHaveBeenCalled();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('stops the animation when the page unmounts mid-animation', async () => {
    const { unmount } = render(<YesWelcomeConfetti />);
    await flushProbe();
    const firedBeforeUnmount = fire.mock.calls.length;

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(EMIT_DURATION_MS));

    expect(fire.reset).toHaveBeenCalled();
    expect(fire.mock.calls.length).toBe(firedBeforeUnmount);
  });

  it('shows the still frame and skips the animation when muted autoplay is blocked (Low Power Mode)', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new Error('NotAllowedError'),
    );

    render(<YesWelcomeConfetti />);
    await flushProbe();

    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      CONFETTI_STILL_SRC,
    );
    expect(confetti.create).not.toHaveBeenCalled();
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
    await flushProbe();
    expect(play).toHaveBeenCalled();
  });

  it('shows the still frame with no animation when the user prefers reduced motion', async () => {
    mockMatchMedia(true);
    render(<YesWelcomeConfetti />);
    await flushProbe();

    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      CONFETTI_STILL_SRC,
    );
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(confetti.create).not.toHaveBeenCalled();
  });
});
