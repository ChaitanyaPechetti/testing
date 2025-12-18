const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { reloadEffectivePolicy } = require("../shared_libs/policy_resolution");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

const makeTempPolicyFile = (content) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "policy-"));
  const file = path.join(dir, "effective_policy.json");
  fs.writeFileSync(file, JSON.stringify(content), "utf8");
  return file;
};

run("reload_detects_snapshot_change", () => {
  const file = makeTempPolicyFile({ effective_policy: { a: 1 }, policy_version_ids: ["v1"] });
  const first = reloadEffectivePolicy({ filePath: file });
  fs.writeFileSync(file, JSON.stringify({ effective_policy: { a: 2 }, policy_version_ids: ["v2"] }));
  const second = reloadEffectivePolicy({ filePath: file });
  assert.notStrictEqual(first.snapshot_hash, second.snapshot_hash);
  assert.deepStrictEqual(second.policy_version_ids, ["v2"]);
});

run("reload_uses_last_known_on_invalid_json", () => {
  const file = makeTempPolicyFile({ effective_policy: { a: 1 }, policy_version_ids: ["v1"] });
  const first = reloadEffectivePolicy({ filePath: file });
  fs.writeFileSync(file, "{invalid json", "utf8");
  const second = reloadEffectivePolicy({ filePath: file, lastKnown: first });
  assert.deepStrictEqual(second.effective_policy, first.effective_policy);
  assert.strictEqual(second.snapshot_hash, first.snapshot_hash);
  assert.ok(second.error);
});
