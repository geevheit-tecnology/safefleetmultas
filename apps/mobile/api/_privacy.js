function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!name || !domain) return "nao informado";
  return `${name.slice(0, 2)}***@${domain}`;
}

function minimizePersonName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `${parts[0].slice(0, 1)}.`;
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
}

function maskDocument(document) {
  const digits = String(document || "").replace(/\D/g, "");
  if (!digits) return null;
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

function privacyNotice() {
  return "LGPD: dados pessoais minimizados; CPF/documentos nao sao expostos em listagens ou respostas operacionais comuns.";
}

module.exports = { maskDocument, maskEmail, minimizePersonName, privacyNotice };
