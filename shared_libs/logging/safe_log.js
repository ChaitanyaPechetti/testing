const ALLOWED_KEYS = new Set(["event", "receipt_id", "message", "detail", "warning"]);

function safeLog(output, payload) {
  if (!output || !payload || typeof payload !== "object") return;
  const sanitized = {};
  for (const key of Object.keys(payload)) {
    sanitized[key] = ALLOWED_KEYS.has(key) ? payload[key] : "[blocked]";
  }
  output.appendLine(`ZeroUI:${JSON.stringify(sanitized)}`);
}

module.exports = { safeLog };

