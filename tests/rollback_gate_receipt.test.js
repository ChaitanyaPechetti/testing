const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { writeRollbackGateReceipt } = require("../shared_libs/receipts/write_rollback_gate_receipt");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("writes rollback receipt with missing refs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-"));
  const filePath = path.join(dir, "receipts.log");
  const result = writeRollbackGateReceipt({
    repo_id: "repo",
    actor: { actor_type: "user" },
    inputs: { branch: "main" },
    evaluation: {
      decision: "warn",
      missing_requirements: ["r1"],
      severity: "warning",
      mode: "warn",
      evidence_refs: []
    },
    policy_snapshot: {
      snapshot_hash: "a".repeat(64),
      policy_version_ids: ["v1"],
      timestamping_mode: "client"
    },
    filePath
  });
  assert.ok(result.receipt_id);
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
  const rec = JSON.parse(lines[0]);
  assert.strictEqual(rec.outputs_summary.missing_requirements[0], "r1");
  assert.strictEqual(rec.snapshot_hash, "a".repeat(64));
});

