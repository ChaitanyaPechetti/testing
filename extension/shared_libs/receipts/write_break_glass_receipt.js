const { appendReceipt } = require("./receipt_writer");

// Append-only break-glass receipt. Records ids/refs only.
const writeBreakGlassReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") throw new Error("policy_snapshot required");
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "break_glass",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      request_active: inputs?.request_active === true,
      approvers: inputs?.approvers || [],
      action_ref: inputs?.action_ref
    },
    outputs_summary: {
      decision: evaluation.decision,
      active: evaluation.active,
      expiry_ref: evaluation.expiry_ref,
      scope_refs: evaluation.scope_refs || [],
      post_hoc_refs: evaluation.post_hoc_refs || [],
      banner_template_ref: evaluation.banner_template_ref,
      severity: evaluation.severity
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:breakglass`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeBreakGlassReceipt };

