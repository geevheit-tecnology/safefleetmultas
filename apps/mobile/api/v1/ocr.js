const { sendJson } = require("../_db");

const maxImageBytes = Number(process.env.OCR_MAX_IMAGE_BYTES || 4_500_000);

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const image = String(body.image || "");
  const mimeType = String(body.mimeType || "");

  if (!image.startsWith("data:image/") || !mimeType.startsWith("image/")) {
    return sendJson(res, 400, { error: "invalid_image", message: "Envie uma imagem valida para OCR." });
  }
  if (Buffer.byteLength(image, "utf8") > maxImageBytes) {
    return sendJson(res, 413, { error: "image_too_large", message: "Imagem muito grande para OCR. Tire uma foto mais proxima ou reduza a resolucao." });
  }

  try {
    const payload = await ocrSpace(image);
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 502, { error: "ocr_failed", message: error.message || "OCR remoto indisponivel." });
  }
};

async function ocrSpace(base64Image) {
  const apiKey = process.env.OCR_SPACE_API_KEY || "helloworld";
  const form = new URLSearchParams();
  form.set("base64Image", base64Image);
  form.set("language", "por");
  form.set("OCREngine", "2");
  form.set("scale", "true");
  form.set("isTable", "true");
  form.set("isOverlayRequired", "false");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  const result = await response.json();
  if (!response.ok || result.IsErroredOnProcessing) {
    const message = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(" ") : result.ErrorMessage;
    throw new Error(message || "OCR.Space nao conseguiu processar a imagem.");
  }
  const parsed = Array.isArray(result.ParsedResults) ? result.ParsedResults : [];
  const text = parsed.map((item) => item.ParsedText || "").join("\n").trim();
  if (!text) throw new Error("OCR remoto nao retornou texto.");
  return {
    text,
    provider: process.env.OCR_SPACE_API_KEY ? "ocr.space" : "ocr.space-demo",
    confidence: confidenceFromText(text),
    warning: process.env.OCR_SPACE_API_KEY ? undefined : "Usando chave publica de teste. Configure OCR_SPACE_API_KEY para uso em campo."
  };
}

function confidenceFromText(text) {
  const normalized = text.toUpperCase();
  const signals = [
    /ANTT/.test(normalized),
    /AUTO\s+DE\s+INFRA/.test(normalized),
    /FELTF\s*\d{6,}/.test(normalized.replace(/\s+/g, "")),
    /CNPJ|CPF/.test(normalized),
    /PLACA/.test(normalized),
    /RNTRC/.test(normalized),
    /R\$\s*\d/.test(normalized),
    /DATA/.test(normalized)
  ].filter(Boolean).length;
  return Math.min(95, 25 + signals * 8);
}
