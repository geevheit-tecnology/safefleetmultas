const notificationTypes = [
  "DEADLINE_APPROACHING",
  "DEADLINE_EXPIRED",
  "NEW_CASE",
  "RISK_CHANGED",
  "DOCUMENT_REQUIRED",
  "LEGAL_CHANGE",
  "IMPACT_DETECTED",
  "ACTION_REQUIRED"
];

const notificationChannels = ["in_app", "email", "push", "whatsapp"];

function buildChannelPlan(type) {
  return {
    in_app: true,
    email: ["DEADLINE_EXPIRED", "RISK_CHANGED", "LEGAL_CHANGE", "IMPACT_DETECTED"].includes(type),
    push: ["DEADLINE_APPROACHING", "ACTION_REQUIRED", "DOCUMENT_REQUIRED"].includes(type),
    whatsapp: false
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || "",
    readAt: row.read_at || "",
    createdAt: row.created_at || "",
    channelPlan: buildChannelPlan(row.type)
  };
}

module.exports = { buildChannelPlan, mapNotification, notificationChannels, notificationTypes };
