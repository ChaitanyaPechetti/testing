const { appendReceipt } = require("./receipt_writer");

// Append-only preview/smoke receipt. Records refs/status only.
const writePreviewReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") throw new Error("policy_snapshot required");
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "preview_gate",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      preview_available: inputs?.preview_available === true,
      smoke_results: inputs?.smoke_results || {}
    },
    outputs_summary: {
      decision: evaluation.decision,
      severity: evaluation.severity,
      preview_available: evaluation.preview_available,
      preview_label: evaluation.preview_label,
      preview_url_template_ref: evaluation.preview_url_template_ref,
      smoke_check_results: evaluation.smoke_check_results || [],
      enforcement_mode: evaluation.enforcement_mode
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:preview`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writePreviewReceipt };

