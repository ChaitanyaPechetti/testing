const assert = require("assert");
const { evaluateFeatureFlagHygiene } = require("../shared_libs/risk_evaluator/evaluate_feature_flag_hygiene");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("passes when required fields present and caps ok", () => {
  const res = evaluateFeatureFlagHygiene(
    { flag_metadata: { provider_id: "p1", owner_ref: "o1", kill_path_ref: "k1" } },
    {
      feature_flag_meta: { required_fields: ["owner_ref", "kill_path_ref"] },
      feature_flag_provider_capabilities: [{ provider_id: "p1", supports_kill: true, supports_metadata: true }],
      feature_flag_hygiene: { enforcement_mode: "warn" }
    }
  );
  assert.strictEqual(res.decision, "pass");
  assert.deepStrictEqual(res.missing_fields, []);
  assert.deepStrictEqual(res.capability_violations, []);
});

run("warns when missing required metadata", () => {
  const res = evaluateFeatureFlagHygiene(
    { flag_metadata: { provider_id: "p1" } },
    {
      feature_flag_meta: { required_fields: ["owner_ref"] },
      feature_flag_provider_capabilities: [{ provider_id: "p1", supports_metadata: true }],
      feature_flag_hygiene: { enforcement_mode: "warn" }
    }
  );
  assert.strictEqual(res.decision, "warn");
  assert.deepStrictEqual(res.missing_fields, ["owner_ref"]);
});

