const { appendReceipt } = require("./receipt_writer");

// Append-only flaky handling receipt. Records ids/refs only.
const writeFlakyHandlingReceipt = ({ repo_id, actor, inputs, evaluation, policy_snapshot, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") throw new Error("policy_snapshot required");
  const now = new Date().toISOString();

  const receiptBase = {
    decision_type: "flaky_handling",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: {
      flaky_tests: inputs?.flaky_tests || []
    },
    outputs_summary: {
      decision: evaluation.decision,
      severity: evaluation.severity,
      flaky_tests: evaluation.flaky_tests || [],
      retry_actions: evaluation.retry_actions || [],
      quarantine_actions: evaluation.quarantine_actions || [],
      ticket_actions: evaluation.ticket_actions || []
    },
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}:flaky`;
  const receipt = { receipt_id, ...receiptBase };
  appendReceipt(receipt, filePath);
  return { receipt_id, receipt_path: filePath };
};

module.exports = { writeFlakyHandlingReceipt };

