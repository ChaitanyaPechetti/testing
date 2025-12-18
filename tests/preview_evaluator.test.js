const assert = require("assert");
const { evaluatePreviewSmokes } = require("../shared_libs/risk_evaluator/evaluate_preview_smokes");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("passes when preview available and smokes ok", () => {
  const res = evaluatePreviewSmokes(
    { preview_available: true, smoke_results: { smoke: { result: "pass" } } },
    {
      preview_environment: { available: true, label: "preview" },
      preview_smoke_checks: [{ id: "smoke", enforcement_mode: "warn" }]
    }
  );
  assert.strictEqual(res.decision, "pass");
});

run("blocks when smoke failed in enforce mode", () => {
  const res = evaluatePreviewSmokes(
    { preview_available: true, smoke_results: { metrics: { result: "failed" } } },
    {
      preview_environment: { available: true },
      preview_smoke_checks: [{ id: "metrics", enforcement_mode: "enforce" }]
    }
  );
  assert.strictEqual(res.decision, "block");
});

