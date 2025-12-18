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
      provider_id: inputs?.provider_id || null
    },
    outputs_summary: {
      decision: evaluation.decision,
      missing_fields: evaluation.missing_fields || [],
      capability_violations: evaluation.capability_violations || [],
      is_stale: evaluation.is_stale === true,
      provider_id: evaluation.provider_id,
      required_fields: evaluation.required_fields || [],
      enforcement_mode: evaluation.enforcement_mode,
      rollback_status: evaluation.rollback_status,
      rollback_action_refs: evaluation.rollback_action_refs || [],
      rollback_evidence_refs: evaluation.rollback_evidence_refs || [],
      severity: evaluation.severity,
      current_version_ref: evaluation.current_version_ref,
      target_version_ref: evaluation.target_version_ref,
      flag_versions: evaluation.flag_versions || [],
      version_history_refs: evaluation.version_history_refs || [],
      compat_status: evaluation.compat_status,
      compat_warnings: evaluation.compat_warnings || [],
      version_rollback_ref: evaluation.version_rollback_ref,
      version_rollback_action_refs: evaluation.version_rollback_action_refs || [],
      rollout_mode: evaluation.rollout_mode,
      rollout_phase: evaluation.rollout_phase,
      rollout_percent_ref: evaluation.rollout_percent_ref,
      rollout_status: evaluation.rollout_status,
      rollout_health_refs: evaluation.rollout_health_refs || [],
      rollout_incident_refs: evaluation.rollout_incident_refs || [],
      rollout_audit_refs: evaluation.rollout_audit_refs || [],
      pause_action_refs: evaluation.pause_action_refs || [],
      rollout_rollback_action_refs: evaluation.rollout_rollback_action_refs || [],
      alert_refs: evaluation.alert_refs || [],
      health_status: evaluation.health_status,
      health_metric_refs: evaluation.health_metric_refs || [],
      incident_status: evaluation.incident_status,
      incident_severity: evaluation.incident_severity,
      incident_refs: evaluation.incident_refs || [],
      incident_actions: evaluation.incident_actions || [],
      evidence_log_refs: evaluation.evidence_log_refs || [],
      audit_trail_refs: evaluation.audit_trail_refs || [],
      state_history_refs: evaluation.state_history_refs || [],
      rollback_reason_refs: evaluation.rollback_reason_refs || [],
      compliance_status: evaluation.compliance_status,
      missing_evidence_refs: evaluation.missing_evidence_refs || []
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

