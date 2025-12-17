// Policy-driven delta coverage; ids/refs only, no execution.
const evaluateDeltaCoverage = (inputs = {}, policy = {}) => {
  const cfg = policy.testing?.delta_coverage || {};
  const delta = inputs.delta_coverage;
  const threshold_ref = cfg.threshold_ref;
  const below = typeof delta === "number" && typeof inputs.threshold_value === "number" ? delta < inputs.threshold_value : false;
  const decision = below ? "warn" : "pass";
  return {
    decision,
    severity: inputs.severity || (below ? "warning" : null),
    delta_coverage: delta,
    threshold_ref,
    cadence_ref: cfg.cadence_ref,
    scaffold_action_ref: cfg.scaffold_action_ref,
    below_threshold: below
  };
};

module.exports = { evaluateDeltaCoverage };

