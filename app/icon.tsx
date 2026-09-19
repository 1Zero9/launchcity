import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Drawn from the real homepage's own visual language (app/globals.css's
// --lc-bg / --lc-horizon / --lc-accent tokens) - the glowing orbital
// horizon arc with a launch marker, not an invented rocket icon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0e17",
          display: "flex",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32">
          <path
            d="M -4 24 Q 16 12 36 24"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="15.2" r="2.6" fill="#ffb066" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
