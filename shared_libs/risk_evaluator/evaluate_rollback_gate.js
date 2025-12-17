// Deterministic, policy-driven rollback gate evaluator.
// Uses only policy-declared requirements; no hardcoded semantics.
const evaluateRollbackGate = (inputs = {}, policy = {}) => {
  const gate = policy.release_gate || {};
  const requirements = gate.rollback_requirements || [];
  const mode = gate.mode || "observe";

  const missing = requirements.map((r) => r && r.id).filter(Boolean);
  const severityMap = gate.severity_map || {};
  const severity =
    severityMap[mode] ||
    (mode === "enforce" ? "error" : mode === "warn" ? "warning" : "information");

  const decision =
    missing.length === 0
      ? "pass"
      : mode === "enforce"
      ? "block"
      : mode === "warn"
      ? "warn"
      : "pass";

  return {
    decision,
    missing_requirements: missing,
    severity,
    mode,
    evidence_refs: (requirements || []).flatMap((r) => r?.required_evidence_refs || [])
  };
};

module.exports = { evaluateRollbackGate };

