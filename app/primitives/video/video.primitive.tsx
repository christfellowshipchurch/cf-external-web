import { useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';

// Declare Wistia types
declare global {
  interface Window {
    _wq: Array<{
      id: string;
      onReady: (video: {
        play: () => Promise<void>;
        pause: () => void;
        muted: (muted: boolean) => void;
      }) => void;
    }>;
  }
}

type VideoProps = {
  src?: string;
  wistiaId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  fallback?: React.ReactNode;
} & ({ src: string } | { wistiaId: string });

export const Video = (props: VideoProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (props.wistiaId || !props.autoPlay) return;

    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      // iOS/iPadOS autoplay checks muted + playsInline at play time.
      video.muted = props.muted !== false;
      video.defaultMuted = props.muted !== false;
      video.setAttribute('muted', '');
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      try {
        const playPromise = video.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Autoplay can still be blocked (e.g. Low Power Mode).
          });
        }
      } catch {
        // jsdom and some WebViews throw instead of returning a rejected promise.
      }
    };

    tryPlay();
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
    };
  }, [props.src, props.autoPlay, props.muted, props.wistiaId]);

  useEffect(() => {
    if (!props?.wistiaId || !props.autoPlay) return;
    if (!iframeRef.current) return;

    // Load Wistia embed script if not already loaded (needed for API)
    const loadWistiaScript = (): Promise<void> => {
      return new Promise((resolve) => {
        const existingScript = document.querySelector(
          'script[src*="fast.wistia.com/assets/external/E-v1.js"]',
        );
        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://fast.wistia.com/assets/external/E-v1.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve(); // Resolve anyway to continue
        document.head.appendChild(script);
      });
    };

    // Initialize Wistia queue if it doesn't exist
    window._wq = window._wq || [];

    // Wait for iframe to load before setting up Wistia API
    const setupWistiaVideo = () => {
      // Add video to Wistia queue to handle when it's ready
      window._wq.push({
        id: props.wistiaId!,
        onReady: (video) => {
          // Ensure video is muted for autoplay policy compliance
          if (props.muted !== false) {
            video.muted(true);
          }
          // Set loop if needed
          if (
            props.loop &&
            'loop' in video &&
            typeof (video as { loop?: (value: boolean) => void }).loop ===
              'function'
          ) {
            (video as { loop: (value: boolean) => void }).loop(true);
          }
          // Programmatically play the video
          if (props.autoPlay) {
            video.play().catch(() => {
              // Autoplay might be blocked, but that's okay - user can interact
              // Silently fail - this is expected behavior in some browsers
            });
          }
        },
      });
    };

    // Load script first, then set up video
    let iframeLoadHandler: (() => void) | null = null;

    loadWistiaScript().then(() => {
      // Set up immediately (Wistia queue handles timing)
      setupWistiaVideo();

      // Also try after iframe loads as a fallback
      const iframe = iframeRef.current;
      if (iframe) {
        iframeLoadHandler = () => {
          // Small delay to ensure Wistia is ready
          setTimeout(() => {
            setupWistiaVideo();
          }, 100);
        };

        // Check if iframe is already loaded
        try {
          if (iframe.contentDocument?.readyState === 'complete') {
            iframeLoadHandler();
          } else {
            iframe.addEventListener('load', iframeLoadHandler);
          }
        } catch {
          // Cross-origin iframe, can't access contentDocument
          iframe.addEventListener('load', iframeLoadHandler);
        }
      }
    });

    // Cleanup function
    return () => {
      // Remove event listener
      if (iframeRef.current && iframeLoadHandler) {
        iframeRef.current.removeEventListener('load', iframeLoadHandler);
      }
      // Remove this video from the queue on unmount
      if (window._wq && props.wistiaId) {
        window._wq = window._wq.filter((item) => item.id !== props.wistiaId);
      }
    };
  }, [props.wistiaId, props.autoPlay, props.muted, props.loop]);

  // Build iframe URL - match home page approach (no autoplay in URL, control via API)
  const iframeSrc = props?.wistiaId
    ? `https://fast.wistia.net/embed/iframe/${props.wistiaId}?fitStrategy=cover`
    : undefined;

  return (
    <>
      {props?.wistiaId ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          aria-label='Wistia Video'
          allow='autoplay; fullscreen'
          allowFullScreen
          className={cn('size-full', props.className)}
        />
      ) : (
        <video
          ref={videoRef}
          src={props.src}
          autoPlay={props.autoPlay || false}
          loop={props.loop || false}
          muted={props.muted || false}
          playsInline
          controls={props.controls || undefined}
          preload={props.autoPlay ? 'auto' : undefined}
          className={props.className}
          aria-label='Video'
          {...{ 'webkit-playsinline': 'true' }}
        />
      )}
    </>
  );
};
