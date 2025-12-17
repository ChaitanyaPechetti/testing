// Build quick-fixable action descriptors from a receipt without adding any policy logic.
// Reads only receipt fields; does not infer or filter by risk bands.
const buildQuickFixActions = (receipt) => {
  if (!receipt || typeof receipt !== "object") return [];
  const outputs = receipt.outputs_summary || {};
  const actions = outputs.actions || [];
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
