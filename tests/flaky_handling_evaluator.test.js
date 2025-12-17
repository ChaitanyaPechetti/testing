const assert = require("assert");
const { evaluateFlakyHandling } = require("../shared_libs/risk_evaluator/evaluate_flaky_handling");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("warns and emits actions when flaky tests present", () => {
  const res = evaluateFlakyHandling(
    { flaky_tests: ["t1"] },
    { testing: { flaky_handling: { retry_policy_ref: "retry", quarantine_policy_ref: "quar", ticketing_action_ref: "ticket" } } }
  );
  assert.strictEqual(res.decision, "warn");
  assert.strictEqual(res.retry_actions.length, 1);
  assert.strictEqual(res.quarantine_actions.length, 1);
  assert.strictEqual(res.ticket_actions.length, 1);
});

