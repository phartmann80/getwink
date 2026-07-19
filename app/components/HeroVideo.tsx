'use client';

import { useEffect, useRef, useState } from 'react';

interface HeroVideoProps {
  className?: string;
  src: string;
  poster: string;
  ariaLabel: string;
}

export function HeroVideo({ className, src, poster, ariaLabel }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if ('addEventListener' in mediaQuery) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, []);

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
