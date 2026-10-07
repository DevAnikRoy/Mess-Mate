type Props = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function IconMeal({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M6 3v8a3 3 0 0 0 3 3v7M9 3v6M15 3c2 3 2 6 2 8v9M15 3c-1.2 2.2-1.2 5 0 8" />
    </svg>
  );
}

export function IconBag({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M6 8h12l-1 12H7L6 8z" />
      <path {...stroke} d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

export function IconBill({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M7 3h10v18l-2-1.2L13 21l-2-1.2L9 21l-2-1.2L5 21V5a2 2 0 0 1 2-2z" />
      <path {...stroke} d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconReport({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
    </svg>
  );
}

export function IconDuty({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M8 4h8l1 3H7l1-3z" />
      <path {...stroke} d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path {...stroke} d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconBell({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5L6 16zM10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconSearch({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="11" cy="11" r="6" />
      <path {...stroke} d="m16 16 4 4" />
    </svg>
  );
}

export function IconArrow({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconPlus({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconUsers({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="9" cy="8" r="3.2" />
      <path {...stroke} d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.2A5 5 0 0 1 20.5 19" />
    </svg>
  );
}

export function IconCopy({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect {...stroke} x="8" y="8" width="12" height="12" rx="2.5" />
      <path {...stroke} d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function IconLogout({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2" />
      <path {...stroke} d="M4 12h11M12 8l4 4-4 4" />
    </svg>
  );
}
