const { appendReceipt } = require("./receipt_writer");

// Append-only evidence receipt writer. Records required/present evidence refs only.
const writeEvidenceReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") {
    throw new Error("policy_snapshot required");
  }
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "evidence_check",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      evidence_refs: inputs?.evidence_refs || []
    },
    outputs_summary: {
      decision: evaluation.decision,
      missing_evidence: evaluation.missing_evidence || [],
      required_evidence: evaluation.required_evidence || [],
      templates: evaluation.templates || []
    },
    evidence_refs: inputs?.evidence_refs || [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:evidence`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeEvidenceReceipt };

