interface RecipePlaceholderProps {
  className?: string
}

export function RecipePlaceholder({ className }: RecipePlaceholderProps) {
  return (
    <svg
      viewBox="0 0 120 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Warm background */}
      <rect width="120" height="60" fill="#f0f7f3" />

      {/* Plate — outer ring */}
      <circle cx="60" cy="30" r="20" fill="#d8ece1" stroke="#84bf9f" strokeWidth="1.5" />
      {/* Plate — inner decorative ring */}
      <circle cx="60" cy="30" r="14" fill="none" stroke="#84bf9f" strokeWidth="0.8" strokeDasharray="2.5 2" />

      {/* Fork (left of plate) — 3 tines + curved arch + handle */}
      <line x1="37" y1="9"  x2="37" y2="22" stroke="#56a07a" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="40" y1="9"  x2="40" y2="22" stroke="#56a07a" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="43" y1="9"  x2="43" y2="22" stroke="#56a07a" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M37,22 Q37,28 40,28 Q43,28 43,22"
        fill="none"
        stroke="#56a07a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="40" y1="28" x2="40" y2="51" stroke="#56a07a" strokeWidth="1.6" strokeLinecap="round" />

      {/* Knife (right of plate) — blade + handle */}
      <path
        d="M80,9 Q86,14 85,22 L80,25"
        fill="none"
        stroke="#56a07a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="80" y1="9" x2="80" y2="51" stroke="#56a07a" strokeWidth="1.6" strokeLinecap="round" />
      {/* Small guard between blade and handle */}
      <line x1="78" y1="26" x2="82" y2="26" stroke="#56a07a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
