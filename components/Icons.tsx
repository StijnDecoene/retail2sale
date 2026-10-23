type P = { size?: number; color?: string };
const base = (size: number, color: string, sw = 1.8) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IcWinkel = ({ size = 22, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M10 20v-6h4v6" /></svg>
);
export const IcPersoon = ({ size = 22, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5" /></svg>
);
export const IcSchool = ({ size = 22, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c2 2 10 2 12 0v-5" /></svg>
);
export const IcOnthaal = ({ size = 24, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M4 15a8 8 0 0116 0" /><path d="M2 18h20" /><path d="M12 7V5M10 5h4" /></svg>
);
export const IcKalender = ({ size = 24, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6" /></svg>
);
export const IcTas = ({ size = 24, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8a3 3 0 016 0" /></svg>
);
export const IcDownload = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size, color, 1.9)}><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /><path d="M12 11v6M9.5 14.5L12 17l2.5-2.5" /></svg>
);
export const IcFormulier = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /><path d="M9 13l2 2 4-4" /></svg>
);
export const IcMap = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size, color)}><path d="M3 6h6l2 2h10v11H3z" /></svg>
);
export const IcVink = ({ size = 18, color = "currentColor" }: P) => (
  <svg {...base(size, color, 2.2)}><path d="M5 12l5 5 9-10" /></svg>
);
export const IcSluit = ({ size = 18, color = "currentColor" }: P) => (
  <svg {...base(size, color, 2)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IcZoek = ({ size = 18, color = "currentColor" }: P) => (
  <svg {...base(size, color, 2)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const IcSmartschool = ({ size = 22, color = "currentColor" }: P) => (
  <svg {...base(size, color, 2)}><path d="M3 10l9-5 9 5-9 5-9-5z" /><path d="M7 12.5V17c2.5 2 7.5 2 10 0v-4.5" /></svg>
);
export const IcMail = ({ size = 18, color = "currentColor" }: P) => (
  <svg {...base(size, color, 2)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
