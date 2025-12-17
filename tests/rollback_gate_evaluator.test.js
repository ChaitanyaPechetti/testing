const assert = require("assert");
const { evaluateRollbackGate } = require("../shared_libs/risk_evaluator/evaluate_rollback_gate");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("passes when no requirements", () => {
  const result = evaluateRollbackGate({}, { release_gate: { rollback_requirements: [] } });
  assert.strictEqual(result.decision, "pass");
});

run("warns when requirements missing in warn mode", () => {
  const result = evaluateRollbackGate({}, { release_gate: { mode: "warn", rollback_requirements: [{ id: "r1" }] } });
  assert.strictEqual(result.decision, "warn");
  assert.deepStrictEqual(result.missing_requirements, ["r1"]);
});

run("blocks when enforce", () => {
  const result = evaluateRollbackGate({}, { release_gate: { mode: "enforce", rollback_requirements: [{ id: "r1" }] } });
  assert.strictEqual(result.decision, "block");
});

