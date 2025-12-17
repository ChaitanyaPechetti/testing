const fs = require("fs");
const path = require("path");
const assert = require("assert");

const schemaPath = path.join(
  __dirname,
  "..",
  "shared_libs",
  "policy_contracts",
  "m1_receipt.schema.json"
);

const schemaRaw = fs.readFileSync(schemaPath, "utf8");
assert.ok(schemaRaw.length > 0, "Schema file should not be empty");

const schema = JSON.parse(schemaRaw);
assert.strictEqual(schema.$schema, "https://json-schema.org/draft/2020-12/schema");

const serialized = JSON.stringify(schema);
assert.strictEqual(
  serialized.includes("\"default\""),
  false,
  "Schema must not contain defaults"
);

const DECISION_TYPES = new Set(schema.properties.decision_type.enum);

const validateReceipt = (receipt) => {
  assert.ok(receipt && typeof receipt === "object", "Receipt must be an object");
  const { snapshot_hash, timestamping_mode, policy_version_ids, decision_type } = receipt;
  assert.ok(typeof snapshot_hash === "string", "snapshot_hash required");
  assert.ok(/^[a-f0-9]{64}$/.test(snapshot_hash), "snapshot_hash must be 64 hex chars");

  assert.ok(typeof timestamping_mode === "string", "timestamping_mode required");
  assert.ok(
    ["client", "server", "hybrid"].includes(timestamping_mode) ||
      /^[A-Za-z0-9._-]+$/.test(timestamping_mode),
    "timestamping_mode invalid"
  );

  assert.ok(Array.isArray(policy_version_ids), "policy_version_ids required");
  assert.ok(policy_version_ids.length > 0, "policy_version_ids cannot be empty");
  policy_version_ids.forEach((id) => assert.ok(typeof id === "string", "version ids must be string"));
  const unique = new Set(policy_version_ids);
  assert.strictEqual(unique.size, policy_version_ids.length, "policy_version_ids must be unique");

  assert.ok(typeof decision_type === "string", "decision_type required");
  assert.ok(DECISION_TYPES.has(decision_type), "decision_type not allowed");

  if (receipt.evidence_refs) {
    assert.ok(Array.isArray(receipt.evidence_refs), "evidence_refs must be array");
    receipt.evidence_refs.forEach((item) => {
      assert.ok(item && typeof item === "object", "evidence entry must be object");
      assert.ok(typeof item.kind === "string", "evidence.kind required");
      assert.ok(typeof item.uri_or_id === "string", "evidence.uri_or_id required");
    });
  }
};

// minimal valid receipt
const minimalReceipt = {
  snapshot_hash: "a".repeat(64),
  timestamping_mode: "client",
  policy_version_ids: ["v1"],
  decision_type: "release_gate",
  actor: { actor_type: "user", principal_id: "p1" },
  inputs_summary: {},
  outputs_summary: {}
};

validateReceipt(minimalReceipt);
console.log("✓ minimal receipt is valid");

let failed = false;
try {
  validateReceipt({
    timestamping_mode: "client",
    policy_version_ids: ["v1"],
    decision_type: "release_gate"
  });
  failed = true;
} catch (err) {
  console.log("✓ missing snapshot_hash rejected");
}
assert.strictEqual(failed, false, "Missing snapshot_hash should fail");

failed = false;
try {
  validateReceipt({
    snapshot_hash: "nothex",
    timestamping_mode: "client",
    policy_version_ids: ["v1"],
    decision_type: "release_gate"
  });
  failed = true;
} catch (err) {
  console.log("✓ bad snapshot_hash rejected");
}
assert.strictEqual(failed, false, "Bad snapshot_hash should fail");
