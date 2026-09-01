const { sendJson } = require("./_db");

module.exports = function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  sendJson(res, 200, {
    status: "ok",
    service: "antt-control-mobile-api",
    version: "v1",
    timestamp: new Date().toISOString()
  });
};
