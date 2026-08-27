'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

interface HeroVideoProps {
  className?: string;
  src: string;
  poster: string;
  ariaLabel: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function HeroVideo({ className, src, poster, ariaLabel }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    if (videoRef.current) {
      if (prefersReducedMotion) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {
          // Autoplay blocked by browser playback policy - poster stays visible
        });
      }
    }
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <img
        className={className}
        src={poster}
        alt="GetWink discovery experience preview static poster"
        width={820}
        height={615}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-label={ariaLabel}
    >
      <source src={src} type="video/mp4" />
      <img src={poster} alt="GetWink discovery experience preview static poster fallback" width={820} height={615} />
    </video>
  );
}
