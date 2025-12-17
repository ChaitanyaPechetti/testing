// Policy-driven approval evaluator: ids/refs only, no network.
const evaluateApprovals = (inputs = {}, policy = {}) => {
  const reqs = policy.approval_requirements || [];
  const provided = inputs.approvals || []; // [{ approver_ref }]
  const providedSet = new Set(provided.map((a) => a && a.approver_ref).filter(Boolean));

  const missing = reqs
    .map((r) => ({
      id: r.id,
      approver_refs: r.approver_refs || [],
      missing_refs: (r.approver_refs || []).filter((ref) => !providedSet.has(ref.ref_id || ref))
    }))
    .filter((r) => r.missing_refs.length > 0);

  const decision = missing.length ? "block" : "pass";
  return {
    decision,
    missing_approvals: missing,
    required: reqs.map((r) => ({ id: r.id, approver_refs: r.approver_refs || [] })),
    severity: inputs.severity || (missing.length ? "warning" : null)
  };
};

module.exports = { evaluateApprovals };

