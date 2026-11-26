const base = { "aria-hidden": true, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const MailIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" stroke="#6C7A7A" strokeWidth="1.9">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);

export const LockIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" stroke="#6C7A7A" strokeWidth="1.9">
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const EyeIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" stroke="#E48519" strokeWidth="2.6">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" stroke="#1B7A4F" strokeWidth="2.6">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
