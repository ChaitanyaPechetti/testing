const assert = require("assert");
const { buildPolicyChangelogModel } = require("../shared_libs/ui/policy_changelog_model");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("policy_changelog_model_sanitizes_and_renders_versions", () => {
  const receipt = { snapshot_hash: "a".repeat(64), policy_version_ids: ["v1", "v2"] };
  const meta = { phase: "observe", changelog: ["v2: updated gates"] };
  const model = buildPolicyChangelogModel(receipt, meta);
  assert.strictEqual(model.snapshot, "aaaaaaaa");
  assert.deepStrictEqual(model.policy_version_ids, ["v1", "v2"]);
  assert.strictEqual(model.phase, "observe");
  assert.strictEqual(model.changelog.length, 1);
});

run("policy_changelog_model_handles_missing_receipt", () => {
  const model = buildPolicyChangelogModel(null, {});
  assert.strictEqual(model.snapshot, "unknown");
  assert.deepStrictEqual(model.policy_version_ids, []);
});
