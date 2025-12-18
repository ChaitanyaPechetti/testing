const assert = require("assert");
const { applyPrivacyView } = require("../shared_libs/privacy/apply_privacy_view");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("masks configured fields", () => {
  const receipt = { receipt_id: "r1", snapshot_hash: "a".repeat(64), secret: "s", ok: "v" };
  const policy = {
    receipts_policy: {
      visibility: {
        developer: {
          visible_fields: ["receipt_id"],
          masked_fields: ["secret"]
        }
      }
    }
  };
  const res = applyPrivacyView(receipt, policy, "developer");
  assert.strictEqual(res.redacted, true);
  assert.ok(!res.view.secret || res.view.secret === "[masked]");
  assert.strictEqual(res.view.ok, undefined);
  assert.strictEqual(res.view.receipt_id, "r1");
});

