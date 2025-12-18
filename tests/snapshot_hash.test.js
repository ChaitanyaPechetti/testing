const assert = require("assert");
const { computeSnapshotHash } = require("../shared_libs/policy_resolution");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("same_object_different_key_order_same_hash", () => {
  const a = { release_gate: { stage_checks: [{ id: "a", label: "A" }] }, risk_scoring: { weight: 1 } };
  const b = { risk_scoring: { weight: 1 }, release_gate: { stage_checks: [{ label: "A", id: "a" }] } };

  const hashA = computeSnapshotHash(a);
  const hashB = computeSnapshotHash(b);

  assert.strictEqual(hashA, hashB);
  assert.match(hashA, /^[a-f0-9]{64}$/);
});

run("leaf_change_changes_hash", () => {
  const base = { risk_scoring: { drivers: [{ id: "d1", enabled: true }] } };
  const modified = { risk_scoring: { drivers: [{ id: "d1", enabled: false }] } };

  const hashBase = computeSnapshotHash(base);
  const hashModified = computeSnapshotHash(modified);

  assert.notStrictEqual(hashBase, hashModified);
});

run("array_order_affects_hash", () => {
  const original = { release_gate: { stage_checks: [{ id: "a" }, { id: "b" }] } };
  const reordered = { release_gate: { stage_checks: [{ id: "b" }, { id: "a" }] } };

  const hashOriginal = computeSnapshotHash(original);
  const hashReordered = computeSnapshotHash(reordered);

  assert.notStrictEqual(hashOriginal, hashReordered);
});

run("hash_is_64_hex_chars", () => {
  const hash = computeSnapshotHash({ minimal: true });
  assert.strictEqual(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
});
