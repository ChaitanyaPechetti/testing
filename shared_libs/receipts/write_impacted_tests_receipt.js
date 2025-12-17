const { appendReceipt } = require("./receipt_writer");

// Append-only impacted tests receipt. Records ids/refs only.
const writeImpactedTestsReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") throw new Error("policy_snapshot required");
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "impacted_tests",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      selected_tests: inputs?.selected_tests || []
    },
    outputs_summary: {
      decision: evaluation.decision,
      severity: evaluation.severity,
      strategy_ref: evaluation.strategy_ref,
      max_duration_ref: evaluation.max_duration_ref,
      budget_ref: evaluation.budget_ref,
      fallbacks_ref: evaluation.fallbacks_ref,
      selected_tests: evaluation.selected_tests || []
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:impacted`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeImpactedTestsReceipt };

