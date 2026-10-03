import { SVGProps } from "react";

interface HerSpaceLogoProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: "badge" | "glyph";
}

export function HerSpaceLogo({
  size = 32,
  variant = "badge",
  className = "",
  ...props
}: HerSpaceLogoProps) {
  const isBadge = variant === "badge";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-label="HerSpace — A sanctuary for women"
      role="img"
      className={`shrink-0 select-none ${className}`}
      {...props}
    >
      <defs>
        {/* Background Circle with Soft Blush Sanctuary Gradient */}
        <linearGradient id="hs-bloom-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbcfe8" />
          <stop offset="35%" stopColor="#f472b6" />
          <stop offset="70%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#9d174d" />
        </linearGradient>

        {/* Petal Gradient (Delicate Rose Pink to Soft White) */}
        <linearGradient id="hs-bloom-petal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#fff1f2" />
          <stop offset="100%" stopColor="#fce7f3" />
        </linearGradient>

        {/* Petal Border / Depth Accent */}
        <linearGradient id="hs-bloom-petal-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0.5" />
        </linearGradient>

        {/* Golden Pistil Center */}
        <radialGradient id="hs-bloom-gold-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>

        {/* Soft Drop Shadow */}
        <filter id="hs-bloom-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#701a35" floodOpacity="0.3" />
        </filter>

        {/* Base Petal Geometry Template centered at origin pointing up */}
        <path
          id="hs-bloom-petal-shape"
          d="M 0 0 C -11 -12 -21 -25 -16 -40 C -13 -48 -4 -50 0 -43 C 4 -50 13 -48 16 -40 C 21 -25 11 -12 0 0 Z"
        />
      </defs>

      {/* 1. Circular Sanctuary Badge (optional when badge mode) */}
      {isBadge && (
        <>
          <circle cx="50" cy="50" r="47" fill="url(#hs-bloom-logo-bg)" />
          <circle cx="50" cy="50" r="46.5" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="50" cy="50" r="38" fill="#ffffff" fillOpacity="0.12" />
        </>
      )}

      {/* 2. The Blooming 5-Petal Flower */}
      <g transform="translate(50, 50)" filter={isBadge ? "url(#hs-bloom-shadow)" : undefined}>
        {/* 5 Radial Petals with Delicate Notched Tips */}
        <use href="#hs-bloom-petal-shape" fill="url(#hs-bloom-petal)" stroke="url(#hs-bloom-petal-stroke)" strokeWidth="0.8" />
        <use href="#hs-bloom-petal-shape" transform="rotate(72)" fill="url(#hs-bloom-petal)" stroke="url(#hs-bloom-petal-stroke)" strokeWidth="0.8" />
        <use href="#hs-bloom-petal-shape" transform="rotate(144)" fill="url(#hs-bloom-petal)" stroke="url(#hs-bloom-petal-stroke)" strokeWidth="0.8" />
        <use href="#hs-bloom-petal-shape" transform="rotate(216)" fill="url(#hs-bloom-petal)" stroke="url(#hs-bloom-petal-stroke)" strokeWidth="0.8" />
        <use href="#hs-bloom-petal-shape" transform="rotate(288)" fill="url(#hs-bloom-petal)" stroke="url(#hs-bloom-petal-stroke)" strokeWidth="0.8" />

        {/* Delicate Inner Blossom Vein Accents */}
        <g stroke="#f472b6" strokeWidth="0.9" strokeLinecap="round" opacity="0.65">
          <line x1="0" y1="-8" x2="0" y2="-28" />
          <line x1="0" y1="-8" x2="0" y2="-28" transform="rotate(72)" />
          <line x1="0" y1="-8" x2="0" y2="-28" transform="rotate(144)" />
          <line x1="0" y1="-8" x2="0" y2="-28" transform="rotate(216)" />
          <line x1="0" y1="-8" x2="0" y2="-28" transform="rotate(288)" />
        </g>

        {/* Stamens / Pollen Dots (5 Delicate Golden Filaments) */}
        <g stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round">
          <line x1="0" y1="0" x2="0" y2="-15" />
          <circle cx="0" cy="-15" r="1.6" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" />

          <line x1="0" y1="0" x2="0" y2="-15" transform="rotate(72)" />
          <circle cx="0" cy="-15" r="1.6" transform="rotate(72)" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" />

          <line x1="0" y1="0" x2="0" y2="-15" transform="rotate(144)" />
          <circle cx="0" cy="-15" r="1.6" transform="rotate(144)" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" />

          <line x1="0" y1="0" x2="0" y2="-15" transform="rotate(216)" />
          <circle cx="0" cy="-15" r="1.6" transform="rotate(216)" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" />

          <line x1="0" y1="0" x2="0" y2="-15" transform="rotate(288)" />
          <circle cx="0" cy="-15" r="1.6" transform="rotate(288)" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" />
        </g>

        {/* Center Blossom Pearl / Pistil Core */}
        <circle cx="0" cy="0" r="4.8" fill="url(#hs-bloom-gold-center)" stroke="#ffffff" strokeWidth="1" />
      </g>
    </svg>
  );
}
