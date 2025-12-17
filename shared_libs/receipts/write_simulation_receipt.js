const { appendReceipt } = require("./receipt_writer");

// Writes a shadow-mode simulation receipt (refs-only) with no side effects.
// outputs_summary is refs-only: ids/refs to simulated outcomes and suggested actions/thresholds.
const writeSimulationReceipt = ({ policy_snapshot, evaluation, actor, filePath }) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") {
    throw new Error("policy_snapshot required");
  }

  const now = new Date().toISOString();

  const outputsSummary = {
    mode: evaluation?.mode,
    scenario_refs: evaluation?.scenario_refs || [],
    result_refs: evaluation?.result_refs || [],
    threshold_suggestion_refs: evaluation?.threshold_suggestion_refs || [],
    action_refs: evaluation?.action_refs || []
  };

  const receipt = {
    receipt_id: `${policy_snapshot.snapshot_hash}:${now}`,
    decision_type: "simulation",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    outputs_summary: outputsSummary,
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  appendReceipt(receipt, filePath);
  return { receipt_id: receipt.receipt_id, receipt_path: filePath };
};

module.exports = { writeSimulationReceipt };



