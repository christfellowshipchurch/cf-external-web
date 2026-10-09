import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';

export const CONFETTI_STILL_SRC = '/assets/confetti-still.webp';
export const AUTOPLAY_PROBE_SRC = '/assets/autoplay-probe.mp4';

// The page background is ocean blue (#0092bc), so the palette avoids mid blues
// that would disappear against it.
export const CONFETTI_COLORS = [
  '#56c6f2',
  '#1ea5fc',
  '#3b2a9c',
  '#6a3fc9',
  '#1aa39a',
  '#6cc04a',
  '#f2802c',
  '#f5d76e',
  '#f9b233',
  '#e8433f',
  '#f25c9a',
  '#c13fb8',
  '#b5e61d',
  '#ffffff',
];

export const EMIT_DURATION_MS = 10000;
const EMIT_INTERVAL_MS = 70;
const PARTICLES_PER_EMIT = 2;
// Pieces fade linearly over `ticks` (60 per second), so ticks stay high enough
// that they are still visible at the bottom of a tall page; this gives the last
// pieces time to fall about 1500px before reset() clears them.
export const ANIMATION_DURATION_MS = 17000;

const randomColor = () =>
  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

const overlayClassName =
  'pointer-events-none w-full h-full object-cover absolute top-0 left-0 z-2';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * iOS Low Power Mode blocks muted video autoplay. That is the only reliable
 * web signal we have for it; when autoplay is denied, show the still frame
 * so the animation does not stutter on a throttled CPU.
 */
const probeMutedAutoplay = (): Promise<boolean> => {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.src = AUTOPLAY_PROBE_SRC;

  const cleanup = () => {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {
      // jsdom does not implement pause/load.
    }
  };

  const playPromise = video.play?.();
  if (!playPromise || typeof playPromise.then !== 'function') {
    cleanup();
    return Promise.resolve(true);
  }

  return playPromise.then(
    () => {
      cleanup();
      return true;
    },
    () => {
      cleanup();
      return false;
    },
  );
};

type Mode = 'pending' | 'animating' | 'still' | 'done';

export const YesWelcomeConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('pending');

  useEffect(() => {
    if (prefersReducedMotion()) {
      setMode('still');
      return;
    }

    let cancelled = false;
    let instance: confetti.CreateTypes | undefined;
    let emitTimer: ReturnType<typeof setInterval> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    void probeMutedAutoplay().then((allowed) => {
      if (cancelled) return;
      if (!allowed) {
        setMode('still');
        return;
      }
      if (!canvasRef.current) return;

      setMode('animating');
      instance = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });

      const startedAt = Date.now();
      const emit = () => {
        if (Date.now() - startedAt > EMIT_DURATION_MS) {
          clearInterval(emitTimer);
          return;
        }
        void instance?.({
          particleCount: PARTICLES_PER_EMIT,
          angle: 270,
          spread: 60,
          startVelocity: 4,
          gravity: 1.2,
          drift: Math.random() - 0.5,
          ticks: 1000,
          scalar: 1.4,
          origin: { x: Math.random(), y: -0.05 },
          // canvas-confetti assigns colors[i % length] per particle, so passing the
          // full list with a small particleCount would only ever use its first entries.
          colors: Array.from({ length: PARTICLES_PER_EMIT }, randomColor),
        });
      };
      emit();
      emitTimer = setInterval(emit, EMIT_INTERVAL_MS);
      endTimer = setTimeout(() => {
        instance?.reset();
        setMode('done');
      }, ANIMATION_DURATION_MS);
    });

    return () => {
      cancelled = true;
      clearInterval(emitTimer);
      clearTimeout(endTimer);
      instance?.reset();
    };
  }, []);

  if (mode === 'done') return null;

  if (mode === 'still') {
    return (
      <img
        src={CONFETTI_STILL_SRC}
        alt=''
        aria-hidden
        decoding='async'
        className={overlayClassName}
      />
    );
  }

  return <canvas ref={canvasRef} aria-hidden className={overlayClassName} />;
};
