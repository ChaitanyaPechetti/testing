// Policy-driven impacted test selection; ids only, no network.
const evaluateImpactedTests = (inputs = {}, policy = {}) => {
  const cfg = policy.testing?.impacted_selection || {};
  const selected = inputs.selected_tests || [];
  return {
    strategy_ref: cfg.strategy_ref,
    max_duration_ref: cfg.max_duration_ref,
    budget_ref: cfg.budget_ref,
    fallbacks_ref: cfg.fallbacks_ref,
    selected_tests: selected,
    decision: "info",
    severity: inputs.severity || null
  };
};

module.exports = { evaluateImpactedTests };

