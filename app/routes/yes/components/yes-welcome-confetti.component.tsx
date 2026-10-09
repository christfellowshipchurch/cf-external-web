import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';

export const CONFETTI_STILL_SRC = '/assets/confetti-still.webp';
export const AUTOPLAY_PROBE_SRC = '/assets/autoplay-probe.mp4';

// Sampled from the animated WEBP this replaced. The page background is
// ocean blue, so a blues-only palette would disappear against it.
export const CONFETTI_COLORS = [
  '#56c6f2',
  '#1ea5fc',
  '#0092bc',
  '#3b2a9c',
  '#6a3fc9',
  '#1aa39a',
  '#6cc04a',
  '#f2802c',
  '#f5d76e',
];

export const EMIT_DURATION_MS = 7000;
const EMIT_INTERVAL_MS = 200;
// Long enough for the last emitted pieces to fall past the bottom of the screen.
export const ANIMATION_DURATION_MS = 11000;

const overlayClassName =
  'pointer-events-none w-full h-screen object-cover absolute top-0 left-0 z-2';

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
          particleCount: 4,
          angle: 270,
          spread: 60,
          startVelocity: 4,
          gravity: 0.5,
          drift: Math.random() - 0.5,
          ticks: 600,
          scalar: 1.4,
          origin: { x: Math.random(), y: -0.05 },
          colors: CONFETTI_COLORS,
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
