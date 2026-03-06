import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #111118 0%, #0c0c14 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M 19 74  L 40 46  L 57 57  L 79 22"
            stroke="url(#mark)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 67 19  L 81 22  L 78 36"
            stroke="url(#mark)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="19" cy="74" r="5" fill="#4338ca" opacity="0.9" />
          <circle cx="40" cy="46" r="4" fill="#6366f1" opacity="0.9" />
          <circle cx="57" cy="57" r="4" fill="#6366f1" opacity="0.9" />
          <circle cx="79" cy="22" r="5.5" fill="#a5b4fc" opacity="1" />
          <defs>
            <linearGradient id="mark" x1="18" y1="75" x2="82" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    { ...size },
  );
}
