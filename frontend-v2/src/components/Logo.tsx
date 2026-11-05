export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="Invendex logo"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
