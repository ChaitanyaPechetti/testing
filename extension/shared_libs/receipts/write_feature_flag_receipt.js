const { appendReceipt } = require("./receipt_writer");

// Append-only feature flag gate receipt. Records ids/refs only.
const writeFeatureFlagReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") {
    throw new Error("policy_snapshot required");
  }
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "feature_flag_gate",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      flag_ids: inputs?.flag_ids || [],
      flag_metadata: inputs?.flag_metadata || {}
    },
    outputs_summary: {
      decision: evaluation.decision,
      missing_fields: evaluation.missing_fields || [],
      capability_violations: evaluation.capability_violations || [],
      is_stale: evaluation.is_stale === true,
      provider_id: evaluation.provider_id,
      required_fields: evaluation.required_fields || [],
      enforcement_mode: evaluation.enforcement_mode
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:feature-flag`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeFeatureFlagReceipt };

