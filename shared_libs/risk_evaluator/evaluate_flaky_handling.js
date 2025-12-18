// Policy-driven flaky handling; action refs only, no network.
const evaluateFlakyHandling = (inputs = {}, policy = {}) => {
  const cfg = policy.testing?.flaky_handling || {};
  const flaky = inputs.flaky_tests || [];
  const retry = cfg.retry_policy_ref ? flaky.map((t) => ({ test_id: t, action_ref: cfg.retry_policy_ref })) : [];
  const quarantine = cfg.quarantine_policy_ref
    ? flaky.map((t) => ({ test_id: t, action_ref: cfg.quarantine_policy_ref }))
    : [];
  const tickets = cfg.ticketing_action_ref
    ? flaky.map((t) => ({ test_id: t, action_ref: cfg.ticketing_action_ref }))
    : [];
  const decision = flaky.length ? "warn" : "pass";
  return {
    decision,
    severity: inputs.severity || (flaky.length ? "warning" : null),
    flaky_tests: flaky,
    retry_actions: retry,
    quarantine_actions: quarantine,
    ticket_actions: tickets
  };
};

module.exports = { evaluateFlakyHandling };

