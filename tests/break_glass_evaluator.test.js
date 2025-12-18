const assert = require("assert");
const { evaluateBreakGlass } = require("../shared_libs/risk_evaluator/evaluate_break_glass");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("active break-glass returns expiry ref", () => {
  const res = evaluateBreakGlass(
    { request_active: true, expiry_ts_ref: "expiry-1" },
    { break_glass_rules: [{ scope_refs: [{ ref_id: "scope1" }], expiry_rule_refs: [{ rule_ref: "exp-policy" }] }] }
  );
  assert.strictEqual(res.decision, "active");
  assert.strictEqual(res.expiry_ref, "expiry-1");
});

