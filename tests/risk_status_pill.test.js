const assert = require("assert");
const { formatRiskPill } = require("../shared_libs/ui/risk_status_pill");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("renders_from_stub_receipt", () => {
  const receipt = {
    snapshot_hash: "a".repeat(64),
    receipt_id: "r1",
    outputs_summary: { band_label: "High", band_id: "high" }
  };
  const pill = formatRiskPill(receipt);
  assert.strictEqual(pill.text, "Risk: High");
  assert.ok(pill.tooltip.includes("Snapshot"));
});

run("shows_unknown_when_missing_band", () => {
  const receipt = { snapshot_hash: "a".repeat(64), receipt_id: "r1", outputs_summary: {} };
  const pill = formatRiskPill(receipt);
  assert.strictEqual(pill.text, "Risk: Unknown");
  assert.ok(pill.warning);
});

run("shows_no_repo_state", () => {
  const pill = formatRiskPill(null, { reason: "no_repo" });
  assert.strictEqual(pill.text, "Risk: —");
  assert.strictEqual(pill.tooltip, "No repository detected");
});
