const assert = require("assert");
const { evaluateApprovals } = require("../shared_libs/risk_evaluator/evaluate_approvals");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("passes when approvals satisfied", () => {
  const res = evaluateApprovals(
    { approvals: [{ approver_ref: "a1" }] },
    { approval_requirements: [{ id: "r1", approver_refs: [{ ref_id: "a1" }] }] }
  );
  assert.strictEqual(res.decision, "pass");
});

run("blocks when approvals missing", () => {
  const res = evaluateApprovals(
    { approvals: [] },
    { approval_requirements: [{ id: "r1", approver_refs: [{ ref_id: "a1" }] }] }
  );
  assert.strictEqual(res.decision, "block");
  assert.strictEqual(res.missing_approvals.length, 1);
});

