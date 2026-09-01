function classifyDeadlineAlert(daysLeft, status) {
  if (status === "COMPLETED" || status === "CANCELLED") return "RESOLVED";
  if (daysLeft < 0 || status === "EXPIRED") return "OVERDUE";
  if (daysLeft <= 1) return "1_DAY";
  if (daysLeft <= 3) return "3_DAYS";
  if (daysLeft <= 7) return "7_DAYS";
  if (daysLeft <= 15) return "15_DAYS";
  return "MONITORING";
}

function describeDeadlineAlert(alertLevel) {
  const labels = {
    RESOLVED: "resolvido",
    OVERDUE: "vencido",
    "1_DAY": "1 dia",
    "3_DAYS": "3 dias",
    "7_DAYS": "7 dias",
    "15_DAYS": "15 dias",
    MONITORING: "monitoramento"
  };
  return labels[alertLevel] || "monitoramento";
}

module.exports = { classifyDeadlineAlert, describeDeadlineAlert };
