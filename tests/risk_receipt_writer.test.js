const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { writeRiskDecisionReceipt } = require("../shared_libs/receipts/write_risk_decision_receipt");
const { PolicyEvaluationError } = require("../shared_libs/risk_evaluator/evaluate_risk_band");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

const makeTempLog = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "risk-receipts-"));
  const logPath = path.join(dir, "receipts.log");
  return { dir, logPath };
};

const baseInputs = {
  branch: "main",
  staged_diff: {
    loc_added: 10,
    loc_deleted: 2,
    loc_total: 12,
    file_count: 2,
    files: [
      { ext: ".js", change_type: "M" },
      { ext: ".json", change_type: "A" }
    ]
  },
  path_signals: ["service"],
  dependency_signals: ["package.json"],
  coverage_delta_meta: null,
  recent_incident_refs: []
};

const policySnapshot = {
  snapshot_hash: "a".repeat(64),
  policy_version_ids: ["v1", "v2"],
  timestamping_mode: "client"
};

const evaluation = {
  band_id: "high",
  band_label: "High",
  contributing_drivers: [{ driver_id: "d1" }]
};

run("writes_valid_risk_receipt", () => {
  const { logPath } = makeTempLog();
  const result = writeRiskDecisionReceipt({
    repo_id: "repo",
    actor: { actor_type: "user", principal_id: "p1" },
    inputs: baseInputs,
    evaluation,
    policy_snapshot: policySnapshot,
    filePath: logPath
  });
  assert.ok(result.receipt_id);
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  const last = JSON.parse(lines[lines.length - 1]);
  assert.strictEqual(last.snapshot_hash, policySnapshot.snapshot_hash);
  assert.deepStrictEqual(last.policy_version_ids, policySnapshot.policy_version_ids);
  assert.strictEqual(last.outputs_summary.band_id, evaluation.band_id);
});

run("receipt_is_append_only", () => {
  const { logPath } = makeTempLog();
  writeRiskDecisionReceipt({
    repo_id: "repo",
    actor: { actor_type: "user", principal_id: "p1" },
    inputs: baseInputs,
    evaluation,
    policy_snapshot: policySnapshot,
    filePath: logPath
  });
  const before = fs.readFileSync(logPath, "utf8");
  writeRiskDecisionReceipt({
    repo_id: "repo",
    actor: { actor_type: "user", principal_id: "p1" },
    inputs: baseInputs,
    evaluation,
    policy_snapshot: policySnapshot,
    filePath: logPath
  });
  const after = fs.readFileSync(logPath, "utf8");
  assert.ok(after.startsWith(before));
  assert.strictEqual(after.trim().split("\n").length, 2);
});

run("receipt_matches_evaluator_output", () => {
  const { logPath } = makeTempLog();
  writeRiskDecisionReceipt({
    repo_id: "repo",
    actor: { actor_type: "user", principal_id: "p1" },
    inputs: baseInputs,
    evaluation,
    policy_snapshot: policySnapshot,
    filePath: logPath
  });
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  const last = JSON.parse(lines[lines.length - 1]);
  assert.strictEqual(last.outputs_summary.band_id, evaluation.band_id);
  assert.deepStrictEqual(last.outputs_summary.contributing_drivers, evaluation.contributing_drivers);
});

run("error_evaluation_writes_error_receipt", () => {
  const { logPath } = makeTempLog();
  const errorEval = new PolicyEvaluationError("bad policy", "ref1");
  writeRiskDecisionReceipt({
    repo_id: "repo",
    actor: { actor_type: "user", principal_id: "p1" },
    inputs: baseInputs,
    evaluation: errorEval,
    policy_snapshot: policySnapshot,
    filePath: logPath
  });
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  const last = JSON.parse(lines[lines.length - 1]);
  assert.ok(last.error);
  assert.strictEqual(last.error.policy_ref, "ref1");
  assert.strictEqual(last.snapshot_hash, policySnapshot.snapshot_hash);
});
