const assert = require("assert");
const { buildRiskCardModel } = require("../shared_libs/ui/risk_card_model");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("renders stage preset, current stage, checks, guard", () => {
  const model = buildRiskCardModel({
    snapshot_hash: "a".repeat(64),
    outputs_summary: {
      stage_preset: "canary-preset",
      current_stage: "canary-25",
      stage_checks: [
        { id: "smoke", result: "pass" },
        { id: "metrics", result: "blocked" }
      ],
      guard_window: { state: "active", breached: false, next_action: "promote" }
    }
  });
  assert.strictEqual(model.release_stages.stage_preset, "canary-preset");
  assert.strictEqual(model.release_stages.current_stage, "canary-25");
  assert.strictEqual(model.release_stages.stage_checks.length, 2);
  assert.strictEqual(model.release_stages.guard.next_action, "promote");
});

