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
    background: "#f7fbff",
    surface: "#ffffff",
    surfaceMuted: "#eef7ff",
    border: "#dbeaf7",
    borderStrong: "#bdd7ee",
    text: "#183247",
    muted: "#6b8296",
    brand: "#5aa9f7",
    primary: "#2488e8",
    success: "#19a782",
    warning: "#d98b1f",
    danger: "#d84a5f",
    infoSoft: "#eaf6ff",
    warningSoft: "#fff6e7",
    successSoft: "#eafaf5",
    dangerSoft: "#fff0f3"
  },
  status: {
    RECEIVED: "#2488e8",
    TRIAGE: "#5aa9f7",
    ANALYSIS: "#d98b1f",
    ACTION_REQUIRED: "#d84a5f",
    IN_TREATMENT: "#2488e8",
    WAITING_DOCUMENTS: "#d98b1f",
    WAITING_EXTERNAL: "#d98b1f",
    DECISION: "#60798f",
    APPEAL: "#60798f",
    FINALIZATION: "#19a782",
    CLOSED: "#19a782",
    PENDING: "#d98b1f",
    IN_PROGRESS: "#2488e8",
    DONE: "#19a782",
    CANCELLED: "#9aabba"
  },
  risk: {
    LOW: "#19a782",
    MEDIUM: "#d98b1f",
    HIGH: "#e0783d",
    CRITICAL: "#d84a5f"
  },
  components: {
    controlHeight: 42,
    bottomNavHeight: 72,
    cardMinWidth: 160
  }
} as const;

export type RiskTone = keyof typeof tokens.risk;
export type StatusTone = keyof typeof tokens.status;
