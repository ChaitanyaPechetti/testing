const assert = require("assert");
const { buildRiskCardModel } = require("../shared_libs/ui/risk_card_model");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("builds_model_with_band_and_drivers", () => {
  const receipt = {
    snapshot_hash: "a".repeat(64),
    policy_version_ids: ["v1"],
    receipt_id: "r1",
    outputs_summary: {
      band_label: "High",
      contributing_drivers: [{ driver_id: "d1", policy_ref: "p1" }],
      actions: [{ action_id: "a1", label_ref: "Do thing" }]
    }
  };
  const model = buildRiskCardModel(receipt);
  assert.strictEqual(model.band, "High");
  assert.strictEqual(model.drivers.length, 1);
  assert.strictEqual(model.actions.length, 1);
  assert.ok(model.evidence.snapshot);
});

run("omits_raw_paths_and_handles_missing_receipt", () => {
  const model = buildRiskCardModel(null);
  assert.strictEqual(model.band, "—");
  assert.deepStrictEqual(model.drivers, []);
});

run("includes rollback missing list", () => {
  const model = buildRiskCardModel({
    snapshot_hash: "a".repeat(64),
    outputs_summary: { decision: "warn", missing_requirements: ["r1", "r2"] }
  });
  assert.deepStrictEqual(model.rollback.missing, ["r1", "r2"]);
});
