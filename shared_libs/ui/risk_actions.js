// Build quick-fixable action descriptors from a receipt without adding any policy logic.
// Reads only receipt fields; does not infer or filter by risk bands.
const buildQuickFixActions = (receipt) => {
  if (!receipt || typeof receipt !== "object") return [];
  const outputs = receipt.outputs_summary || {};
  const actions = [
    ...(outputs.actions || []),
    ...(outputs.rollback_actions || []),
    ...(outputs.version_rollback_action_refs || []).map((ref) => ({
      action_id: "version_rollback",
      label_ref: "Rollback flag version",
      command_ref: ref
    })),
    ...(outputs.pause_action_refs || []).map((ref) => ({
      action_id: "pause_flag",
      label_ref: "Pause rollout",
      command_ref: ref
    })),
    ...(outputs.rollout_rollback_action_refs || []).map((ref) => ({
      action_id: "rollout_rollback",
      label_ref: "Rollback rollout",
      command_ref: ref
    })),
    ...(outputs.incident_actions || []).map((ref) => ({
      action_id: "incident_action",
      label_ref: "Resolve incident",
      command_ref: ref
    })),
    ...(outputs.evidence_actions || []).map((ref) => ({
      action_id: "evidence_action",
      label_ref: "Provide required evidence",
      command_ref: ref
    }))
  ];
  return actions
    .filter((a) => a && (a.command_ref || a.command_id))
    .map((a) => ({
      action_id: a.action_id || a.id || "action",
      title: a.label_ref || a.label || a.action_id || "action",
      command_id: a.command_ref || a.command_id,
      args: a.command_args || [],
      policy_ref: a.policy_ref
    }));
};

module.exports = {
  buildQuickFixActions
};
