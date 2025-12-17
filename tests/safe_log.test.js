const assert = require("assert");
const { safeLog } = require("../shared_libs/logging/safe_log");

class StubOutput {
  constructor() {
    this.lines = [];
  }
  appendLine(line) {
    this.lines.push(line);
  }
}

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("safeLog blocks non-allowed keys and preserves allowed", () => {
  const out = new StubOutput();
  safeLog(out, { event: "x", receipt_id: "r1", secret: "oops", message: "hi" });
  const parsed = JSON.parse(out.lines[0].replace(/^ZeroUI:/, ""));
  assert.strictEqual(parsed.event, "x");
  assert.strictEqual(parsed.receipt_id, "r1");
  assert.strictEqual(parsed.message, "hi");
  assert.strictEqual(parsed.secret, "[blocked]");
});

