export const tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28
  },
  typography: {
    title: 24,
    section: 16,
    body: 14,
    caption: 12,
    tiny: 11
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16
  },
  elevation: {
    border: 1
  },
  colors: {
    background: "#f8fafc", // Lighter, premium slate background
    surface: "#ffffff",
    surfaceMuted: "#f1f5f9",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#0f172a",
    muted: "#64748b",
    brand: "#4338ca", // Premium Indigo
    primary: "#4f46e5", // Vibrant Indigo
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
    infoSoft: "#eef2ff",
    warningSoft: "#fffbeb",
    successSoft: "#ecfdf5",
    dangerSoft: "#fef2f2"
  },
  status: {
    RECEIVED: "#4f46e5",
    TRIAGE: "#6366f1",
    ANALYSIS: "#d97706",
    ACTION_REQUIRED: "#dc2626",
    IN_TREATMENT: "#4f46e5",
    WAITING_DOCUMENTS: "#d97706",
    WAITING_EXTERNAL: "#d97706",
    DECISION: "#334155",
    APPEAL: "#334155",
    FINALIZATION: "#059669",
    CLOSED: "#059669",
    PENDING: "#d97706",
    IN_PROGRESS: "#4f46e5",
    DONE: "#059669",
    CANCELLED: "#94a3b8"
  },
  risk: {
    LOW: "#059669",
    MEDIUM: "#d97706",
    HIGH: "#ea580c",
    CRITICAL: "#dc2626"
  },
  components: {
    controlHeight: 42,
    bottomNavHeight: 72,
    cardMinWidth: 160
  }
} as const;

export type RiskTone = keyof typeof tokens.risk;
export type StatusTone = keyof typeof tokens.status;
