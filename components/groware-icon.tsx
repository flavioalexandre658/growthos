"use client";

import { useId } from "react";

interface GrowareIconProps {
  size?: number;
}

export function GrowareIcon({ size = 48 }: GrowareIconProps) {
  const uid = useId();
  const id = uid.replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#111118" />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>

        <linearGradient
          id={`${id}-mark`}
          x1="18"
          y1="75"
          x2="82"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>

        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.31  0 0 0 0 0.27  0 0 0 0 0.9  0 0 0 0.55 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={`${id}-bloom`} cx="60%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" rx="22" ry="22" fill={`url(#${id}-bg)`} />
      <rect
        width="100"
        height="100"
        rx="22"
        ry="22"
        fill={`url(#${id}-bloom)`}
      />

      <rect
        x="0.75"
        y="0.75"
        width="98.5"
        height="98.5"
        rx="21.5"
        ry="21.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.07"
        strokeWidth="1.5"
      />

      <path
        d="M 19 74  L 40 46  L 57 57  L 79 22"
        stroke={`url(#${id}-mark)`}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${id}-glow)`}
      />

      <path
        d="M 67 19  L 81 22  L 78 36"
        stroke={`url(#${id}-mark)`}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${id}-glow)`}
      />

      <circle cx="19" cy="74" r="5" fill="#4338ca" opacity="0.9" />
      <circle cx="40" cy="46" r="4" fill="#6366f1" opacity="0.9" />
      <circle cx="57" cy="57" r="4" fill="#6366f1" opacity="0.9" />
      <circle
        cx="79"
        cy="22"
        r="5.5"
        fill="#a5b4fc"
        opacity="1"
        filter={`url(#${id}-glow)`}
      />
    </svg>
  );
}
