const { appendReceipt } = require("./receipt_writer");

// Append-only delta coverage receipt. Records refs/values only.
const writeDeltaCoverageReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") throw new Error("policy_snapshot required");
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "delta_coverage",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      delta_coverage: inputs?.delta_coverage
    },
    outputs_summary: {
      decision: evaluation.decision,
      severity: evaluation.severity,
      delta_coverage: evaluation.delta_coverage,
      threshold_ref: evaluation.threshold_ref,
      cadence_ref: evaluation.cadence_ref,
      scaffold_action_ref: evaluation.scaffold_action_ref,
      below_threshold: evaluation.below_threshold
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:delta`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeDeltaCoverageReceipt };

