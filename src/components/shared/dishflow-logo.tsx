interface DishflowLogoProps {
  size?: number
  variant?: 'mark' | 'full'
  className?: string
}

export function DishflowLogo({ size = 40, variant = 'mark', className = '' }: DishflowLogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="df-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#df-bg)" />
      {/* DF initials */}
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize="16"
        letterSpacing="-0.5"
        fill="white"
      >
        DF
      </text>
      {/* Subtle underline accent */}
      <rect x="11" y="30.5" width="18" height="2" rx="1" fill="white" opacity="0.35" />
    </svg>
  )

  if (variant === 'mark') return mark

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="text-base font-bold tracking-tight text-[var(--foreground)]">Dishflow</span>
    </div>
  )
}
