export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Invendex logo"
    >
      <rect width="48" height="48" fill="var(--brand, #2f6fed)" />
      <path
        d="M24 8 40 17v18L24 44 8 35V17L24 8z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
      />
      <path
        d="M24 8v18m0 0L8 17m16 9 16-9M24 26v18"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="26" r="3" fill="#7dd3fc" />
    </svg>
  )
}
