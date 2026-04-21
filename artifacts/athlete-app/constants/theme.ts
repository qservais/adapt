export const COLORS = {
  bg: "#111111",
  bgCard: "#1A1A1A",
  bgElevated: "#272727",
  bgInput: "#222222",
  border: "#303030",
  borderLight: "#3A3A3A",

  cyan: "#00F0FF",
  cyanDim: "rgba(0,240,255,0.12)",
  cyanGlow: "rgba(0,240,255,0.3)",

  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  greenGlow: "rgba(34,197,94,0.3)",

  violet: "#A855F7",
  violetDim: "rgba(168,85,247,0.12)",
  violetGlow: "rgba(168,85,247,0.3)",

  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  amberGlow: "rgba(245,158,11,0.3)",

  red: "#EF4444",
  redDim: "rgba(239,68,68,0.12)",
  redGlow: "rgba(239,68,68,0.3)",

  gold: "#FFD700",
  goldDim: "rgba(255,215,0,0.12)",
  goldGlow: "rgba(255,215,0,0.3)",

  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#555555",
  textInverse: "#0A0A0A",

  gradientStart: "#00F0FF",
  gradientEnd: "#A855F7",
};

export const DARK_COLORS = COLORS;

export const LIGHT_COLORS = {
  ...COLORS,
  bg: "#F5F5F5",
  bgCard: "#FFFFFF",
  bgElevated: "#F0F0F0",
  bgInput: "#EBEBEB",
  border: "#DEDEDE",
  borderLight: "#E8E8E8",
  textPrimary: "#111111",
  textSecondary: "#555555",
  textMuted: "#999999",
  textInverse: "#FFFFFF",
};

export type ThemeColors = typeof COLORS;

export const MODE_CONFIG = {
  performance: {
    color: "#3B82F6",
    dim: "rgba(59,130,246,0.12)",
    glow: "rgba(59,130,246,0.3)",
    label: "PERFORMANCE",
  },
  normal: {
    color: COLORS.cyan,
    dim: COLORS.cyanDim,
    glow: COLORS.cyanGlow,
    label: "NORMAL",
  },
  adapt: {
    color: COLORS.amber,
    dim: COLORS.amberDim,
    glow: COLORS.amberGlow,
    label: "ADAPT",
  },
  recovery: {
    color: COLORS.red,
    dim: COLORS.redDim,
    glow: COLORS.redGlow,
    label: "RECOVERY",
  },
} as const;

export type SessionMode = keyof typeof MODE_CONFIG;

export const FONTS = {
  title: "BebasNeue_400Regular",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screen: 20,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export function getModeColor(mode: string): string {
  return (MODE_CONFIG[mode as SessionMode]?.color) ?? COLORS.cyan;
}

export function getModeDim(mode: string): string {
  return (MODE_CONFIG[mode as SessionMode]?.dim) ?? COLORS.cyanDim;
}
