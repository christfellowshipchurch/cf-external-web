import { useEffect, useState } from 'react';

export const CONFETTI_ANIMATED_SRC = '/assets/confetti-animation.webp';
export const CONFETTI_STILL_SRC = '/assets/confetti-still.webp';
export const AUTOPLAY_PROBE_SRC = '/assets/autoplay-probe.mp4';

const confettiClassName =
  'pointer-events-none w-full h-screen object-cover absolute top-0 left-0 z-2';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * iOS Low Power Mode blocks muted video autoplay. That is the only reliable
 * web signal we have for it; when autoplay is denied, freeze the overlay so
 * the animation does not stutter on a throttled CPU.
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

export const YesWelcomeConfetti = () => {
  const [src, setSrc] = useState(CONFETTI_ANIMATED_SRC);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setSrc(CONFETTI_STILL_SRC);
      return;
    }

    let cancelled = false;
    void probeMutedAutoplay().then((allowed) => {
      if (!cancelled && !allowed) setSrc(CONFETTI_STILL_SRC);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <img
      src={src}
      alt=''
      aria-hidden
      decoding='async'
      className={confettiClassName}
    />
  );
};
