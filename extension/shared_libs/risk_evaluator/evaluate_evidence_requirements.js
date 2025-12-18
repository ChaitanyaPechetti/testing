// Policy-driven evidence evaluator: returns missing evidence refs without any external calls.
const evaluateEvidenceRequirements = (inputs = {}, policy = {}) => {
  const reqs = policy.receipts_policy?.evidence_requirements || {};
  const required = reqs.required_evidence_refs || [];
  const provided = inputs.evidence_refs || [];
  const providedIds = new Set(provided.map((e) => e && e.id).filter(Boolean));
  const missing = required.filter((r) => !providedIds.has(r));
  const decision = missing.length ? "warn" : "pass";
  return {
    decision,
    missing_evidence: missing,
    required_evidence: required,
    templates: reqs.templates || []
  };
};

module.exports = { evaluateEvidenceRequirements };

