const assert = require("assert");
const { formatDiagnostics } = require("../shared_libs/ui/risk_diagnostics");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("evidence missing emits diagnostic", () => {
  const receipt = {
    decision_type: "evidence_check",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { missing_evidence: ["trace"], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("evidence"));
});

