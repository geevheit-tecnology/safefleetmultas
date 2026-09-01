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
    sm: 6,
    md: 8,
    lg: 8
  },
  elevation: {
    border: 1
  },
  colors: {
    background: "#f7f8fb",
    surface: "#ffffff",
    surfaceMuted: "#f9fafb",
    border: "#e6e8ee",
    borderStrong: "#cfd5df",
    text: "#172033",
    muted: "#667085",
    brand: "#1f2a44",
    primary: "#2f66d0",
    success: "#17745b",
    warning: "#a66a00",
    danger: "#b23b3b",
    infoSoft: "#eef5ff",
    warningSoft: "#fff8eb",
    successSoft: "#edf8f4",
    dangerSoft: "#fff1f1"
  },
  status: {
    RECEIVED: "#2f66d0",
    TRIAGE: "#2f66d0",
    ANALYSIS: "#a66a00",
    ACTION_REQUIRED: "#b23b3b",
    IN_TREATMENT: "#2f66d0",
    WAITING_DOCUMENTS: "#a66a00",
    WAITING_EXTERNAL: "#a66a00",
    DECISION: "#1f2a44",
    APPEAL: "#1f2a44",
    FINALIZATION: "#17745b",
    CLOSED: "#17745b",
    PENDING: "#a66a00",
    IN_PROGRESS: "#2f66d0",
    DONE: "#17745b",
    CANCELLED: "#667085"
  },
  risk: {
    LOW: "#17745b",
    MEDIUM: "#a66a00",
    HIGH: "#b23b3b",
    CRITICAL: "#9f2f2f"
  },
  components: {
    controlHeight: 42,
    bottomNavHeight: 72,
    cardMinWidth: 160
  }
} as const;

export type RiskTone = keyof typeof tokens.risk;
export type StatusTone = keyof typeof tokens.status;
