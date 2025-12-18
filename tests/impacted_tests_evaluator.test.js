const assert = require("assert");
const { evaluateImpactedTests } = require("../shared_libs/risk_evaluator/evaluate_impacted_tests");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("returns selected tests and strategy ref", () => {
  const res = evaluateImpactedTests(
    { selected_tests: ["t1", "t2"] },
    { testing: { impacted_selection: { strategy_ref: "stratA", budget_ref: "bud1" } } }
  );
  assert.strictEqual(res.strategy_ref, "stratA");
  assert.deepStrictEqual(res.selected_tests, ["t1", "t2"]);
});

