export const COLORS = {
  bg: "#0A0A0A",
  bgCard: "#121212",
  bgElevated: "#1A1A1A",
  bgInput: "#1E1E1E",
  border: "#2A2A2A",
  borderLight: "#333333",

  green: "#00F5A0",
  greenDim: "rgba(0,245,160,0.15)",
  greenGlow: "rgba(0,245,160,0.3)",

  cyan: "#00D9FF",
  cyanDim: "rgba(0,217,255,0.15)",

  amber: "#FFB800",
  amberDim: "rgba(255,184,0,0.15)",
  amberGlow: "rgba(255,184,0,0.3)",

  red: "#FF3B5C",
  redDim: "rgba(255,59,92,0.15)",
  redGlow: "rgba(255,59,92,0.3)",

  violet: "#7B61FF",
  violetDim: "rgba(123,97,255,0.15)",
  violetGlow: "rgba(123,97,255,0.3)",

  white: "#FFFFFF",
  gray100: "#F5F5F5",
  gray200: "#E0E0E0",
  gray400: "#999999",
  gray600: "#666666",
  gray800: "#333333",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
};

export const MODE_CONFIG = {
  performance: {
    color: COLORS.violet,
    dim: COLORS.violetDim,
    glow: COLORS.violetGlow,
    label: "PERFORMANCE",
    emoji: "violet",
  },
  normal: {
    color: COLORS.cyan,
    dim: COLORS.cyanDim,
    glow: "rgba(0,217,255,0.3)",
    label: "NORMAL",
    emoji: "cyan",
  },
  adapt: {
    color: COLORS.amber,
    dim: COLORS.amberDim,
    glow: COLORS.amberGlow,
    label: "ADAPT",
    emoji: "amber",
  },
  recovery: {
    color: COLORS.red,
    dim: COLORS.redDim,
    glow: COLORS.redGlow,
    label: "RECOVERY",
    emoji: "red",
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
