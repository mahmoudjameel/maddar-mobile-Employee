export type Palette = {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  info: string;
  border: string;
  input: string;
  sidebar: string;
  sidebarForeground: string;
};

const colors: { light: Palette; dark: Palette; radius: number } = {
  light: {
    text: "#0f172a",
    tint: "#0f766e",
    background: "#f7faf9",
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    primary: "#0f766e",
    primaryForeground: "#ffffff",
    secondary: "#e6f4f1",
    secondaryForeground: "#0f766e",
    muted: "#f1f5f4",
    mutedForeground: "#64748b",
    accent: "#ecfdf5",
    accentForeground: "#065f46",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#3b82f6",
    border: "#e2e8f0",
    input: "#e2e8f0",
    sidebar: "#0f3d39",
    sidebarForeground: "#ffffff",
  },
  dark: {
    text: "#e2e8f0",
    tint: "#2dd4bf",
    background: "#0b1220",
    foreground: "#e2e8f0",
    card: "#111a2e",
    cardForeground: "#e2e8f0",
    primary: "#2dd4bf",
    primaryForeground: "#0b1220",
    secondary: "#1e293b",
    secondaryForeground: "#5eead4",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    accent: "#0e7490",
    accentForeground: "#cffafe",
    destructive: "#f87171",
    destructiveForeground: "#0b1220",
    success: "#34d399",
    warning: "#fbbf24",
    info: "#60a5fa",
    border: "#1e293b",
    input: "#1e293b",
    sidebar: "#0a1325",
    sidebarForeground: "#e2e8f0",
  },
  radius: 14,
};

export default colors;
