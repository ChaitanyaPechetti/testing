const assert = require("assert");
const { formatDiagnostics } = require("../shared_libs/ui/risk_diagnostics");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("diagnostics_from_receipt_basic", () => {
  const receipt = {
    snapshot_hash: "a".repeat(64),
    receipt_id: "r1",
    outputs_summary: {
      band_label: "High",
      contributing_drivers: [{ driver_id: "d1", policy_ref: "p1" }]
    }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.includes("High"));
});

run("diagnostics_clear_when_no_receipt", () => {
  const diags = formatDiagnostics(null);
  assert.strictEqual(diags.length, 0);
});

run("diagnostics_fallback_when_missing_band", () => {
  const receipt = {
    snapshot_hash: "a".repeat(64),
    receipt_id: "r1",
    outputs_summary: {}
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.includes("details unavailable"));
});

run("rollback missing emits diagnostic", () => {
  const receipt = {
    decision_type: "release_gate",
    snapshot_hash: "a".repeat(64),
    receipt_id: "r2",
    outputs_summary: { missing_requirements: ["r1"], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("rollback"));
});

run("stage check failure emits diagnostic", () => {
  const receipt = {
    decision_type: "release_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { stage_checks: [{ id: "metrics", result: "failed" }], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("stage"));
});

run("guard breach emits diagnostic", () => {
  const receipt = {
    decision_type: "release_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { guard_breached: true, severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("guard"));
});

run("feature flag missing metadata emits diagnostic", () => {
  const receipt = {
    decision_type: "feature_flag_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { missing_fields: ["owner_ref"], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("feature flag"));
});

run("preview unavailable emits diagnostic", () => {
  const receipt = {
    decision_type: "preview_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { preview_available: false, severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("preview"));
});

run("smoke checks failed emits diagnostic", () => {
  const receipt = {
    decision_type: "preview_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { smoke_check_results: [{ id: "metrics", result: "failed" }], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("smoke"));
});

run("missing approvals emits diagnostic", () => {
  const receipt = {
    decision_type: "approval_gate",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { missing_approvals: [{ id: "r1", missing_refs: ["a1"] }], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("approval"));
});

run("break-glass active emits diagnostic", () => {
  const receipt = {
    decision_type: "break_glass",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { active: true, expiry_ref: "exp1", severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("break"));
});

run("impacted tests emits info diagnostic", () => {
  const receipt = {
    decision_type: "impacted_tests",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { strategy_ref: "s1" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("impacted"));
});

run("flaky handling emits diagnostic when flaky present", () => {
  const receipt = {
    decision_type: "flaky_handling",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { flaky_tests: ["t1"], severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("flaky"));
});

run("delta coverage below threshold emits diagnostic", () => {
  const receipt = {
    decision_type: "delta_coverage",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { below_threshold: true, severity: "warning" }
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("coverage"));
});

run("redaction emits info diagnostic", () => {
  const receipt = {
    decision_type: "risk_score",
    snapshot_hash: "a".repeat(64),
    outputs_summary: { redacted: true },
    receipt_id: "r1"
  };
  const diags = formatDiagnostics(receipt);
  assert.strictEqual(diags.length, 1);
  assert.ok(diags[0].message.toLowerCase().includes("redaction"));
});
