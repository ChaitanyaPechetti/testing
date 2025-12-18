const assert = require("assert");
const { evaluateDeltaCoverage } = require("../shared_libs/risk_evaluator/evaluate_delta_coverage");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("warns when below threshold", () => {
  const res = evaluateDeltaCoverage(
    { delta_coverage: 50, threshold_value: 60 },
    { testing: { delta_coverage: { threshold_ref: "cov-thresh" } } }
  );
  assert.strictEqual(res.decision, "warn");
  assert.strictEqual(res.below_threshold, true);
});

