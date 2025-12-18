const { appendReceipt } = require("./receipt_writer");

// Append-only rollback gate receipt writer. Policy-neutral; records evaluation outputs only.
const writeRollbackGateReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") {
    throw new Error("policy_snapshot required");
  }
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "release_gate",
    gate: "rollback",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: inputs || {},
    outputs_summary: {
      decision: evaluation.decision,
      missing_requirements: evaluation.missing_requirements || [],
      severity: evaluation.severity,
      mode: evaluation.mode,
      evidence_refs: evaluation.evidence_refs || []
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:rollback`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeRollbackGateReceipt };

