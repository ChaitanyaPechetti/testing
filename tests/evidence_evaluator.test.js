const assert = require("assert");
const { evaluateEvidenceRequirements } = require("../shared_libs/risk_evaluator/evaluate_evidence_requirements");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("passes when all evidence present", () => {
  const res = evaluateEvidenceRequirements(
    { evidence_refs: [{ id: "trace" }] },
    { receipts_policy: { evidence_requirements: { required_evidence_refs: ["trace"] } } }
  );
  assert.strictEqual(res.decision, "pass");
  assert.deepStrictEqual(res.missing_evidence, []);
});

run("warns when evidence missing", () => {
  const res = evaluateEvidenceRequirements(
    { evidence_refs: [] },
    { receipts_policy: { evidence_requirements: { required_evidence_refs: ["trace"] } } }
  );
  assert.strictEqual(res.decision, "warn");
  assert.deepStrictEqual(res.missing_evidence, ["trace"]);
});

