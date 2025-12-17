const { appendReceipt } = require("./receipt_writer");
const { PolicyEvaluationError } = require("../risk_evaluator/evaluate_risk_band");

// Serialize a risk decision (Module 1) into an immutable receipt and append it via the JSONL writer.
// This function is policy-neutral: it records links to the effective snapshot and the evaluator output
// without re-computing any thresholds or bands.
const writeRiskDecisionReceipt = ({
  repo_id,
  actor,
  inputs,
  evaluation,
  policy_snapshot,
  filePath
}) => {
  if (!policy_snapshot || typeof policy_snapshot !== "object") {
    throw new Error("policy_snapshot required");
  }

  const now = new Date().toISOString();
  const stagedDiff = inputs?.staged_diff || {
    loc_added: 0,
    loc_deleted: 0,
    loc_total: 0,
    file_count: 0,
    files: []
  };

  // Privacy: capture only metadata (counts, extensions, manifest names) and omit raw paths.
  const extensions = Array.from(
    new Set((stagedDiff.files || []).map((f) => f.ext || "").filter(Boolean))
  );

  const inputsSummary = {
    repo_id,
    branch: inputs?.branch || null,
    staged_diff: {
      loc_added: stagedDiff.loc_added || 0,
      loc_deleted: stagedDiff.loc_deleted || 0,
      loc_total: stagedDiff.loc_total || 0,
      file_count: stagedDiff.file_count || 0,
      extensions
    },
    path_signals: inputs?.path_signals || [],
    dependency_signals: inputs?.dependency_signals || [],
    coverage_delta_meta: inputs?.coverage_delta_meta || null,
    recent_incident_refs: inputs?.recent_incident_refs || []
  };

  const outputsSummary =
    evaluation && !(evaluation instanceof PolicyEvaluationError)
      ? {
          band_id: evaluation.band_id,
          band_label: evaluation.band_label,
          contributing_drivers: evaluation.contributing_drivers || [],
          actions: evaluation.actions || [],
          severity: evaluation.severity,
          ownership_refs: evaluation.ownership_refs || {},
          owner_review_required: evaluation.owner_review_required === true,
          escalation_action: evaluation.escalation_action
        }
      : {};

  const receiptBase = {
    decision_type: "risk_score",
    snapshot_hash: policy_snapshot.snapshot_hash,
    policy_version_ids: policy_snapshot.policy_version_ids || [],
    timestamping_mode: policy_snapshot.timestamping_mode,
    actor: actor || {},
    provenance: {
      repo_id,
      branch: inputs?.branch || null
    },
    inputs_summary: inputsSummary,
    outputs_summary: outputsSummary,
    evidence_refs: [],
    redaction_applied: false,
    evidence_visibility: "masked",
    timestamp: now
  };

  if (evaluation instanceof PolicyEvaluationError) {
    receiptBase.error = {
      code: evaluation.name,
      message_ref: evaluation.message,
      policy_ref: evaluation.policy_ref
    };
  }

  const receipt_id = `${policy_snapshot.snapshot_hash}:${now}`;
  const receipt = { receipt_id, ...receiptBase };

  appendReceipt(receipt, filePath);

  return { receipt_id, receipt_path: filePath };
};

module.exports = {
  writeRiskDecisionReceipt
};
