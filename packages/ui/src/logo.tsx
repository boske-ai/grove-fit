export interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gf-chip-face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a6b3a" />
          <stop offset="55%" stopColor="#3d5a30" />
          <stop offset="100%" stopColor="#2f4725" />
        </linearGradient>
        <linearGradient id="gf-pin-face" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4f7040" />
          <stop offset="100%" stopColor="#2f4725" />
        </linearGradient>
        <radialGradient id="gf-led-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b8ff6a" />
          <stop offset="45%" stopColor="#7ee03a" />
          <stop offset="100%" stopColor="#7ee03a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="#ffffff" />
      <g fill="url(#gf-pin-face)">
        <rect x="72" y="118" width="34" height="22" rx="8" />
        <rect x="72" y="154" width="34" height="22" rx="8" />
        <rect x="72" y="190" width="34" height="22" rx="8" />
        <rect x="72" y="226" width="34" height="22" rx="8" />
        <rect x="72" y="262" width="34" height="22" rx="8" />
        <rect x="72" y="298" width="34" height="22" rx="8" />
        <rect x="72" y="334" width="34" height="22" rx="8" />
        <rect x="142" y="406" width="22" height="34" rx="8" />
        <rect x="178" y="406" width="22" height="34" rx="8" />
        <rect x="214" y="406" width="22" height="34" rx="8" />
        <rect x="250" y="406" width="22" height="34" rx="8" />
        <rect x="286" y="406" width="22" height="34" rx="8" />
        <rect x="322" y="406" width="22" height="34" rx="8" />
      </g>
      <rect x="106" y="106" width="300" height="300" rx="58" fill="url(#gf-chip-face)" />
      <path
        d="M132 132 C170 118 220 112 270 118 C300 122 330 132 352 148"
        fill="none"
        stroke="#6f915d"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.35"
      />
      <g transform="translate(256 248) rotate(28)">
        <path d="M-58 18 C-42 -58 42 -58 58 18 C34 42 -34 42 -58 18 Z" fill="#ffffff" />
        <path
          d="M-8 -34 C-2 -8 2 10 6 30"
          fill="none"
          stroke="#d8e8d0"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <circle cx="368" cy="368" r="34" fill="url(#gf-led-glow)" />
      <circle cx="368" cy="368" r="12" fill="#9dff4d" />
      <circle cx="364" cy="364" r="4" fill="#e8ffd0" opacity="0.85" />
    </svg>
  );
}
