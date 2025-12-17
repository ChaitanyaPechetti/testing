const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { appendReceipt } = require("../shared_libs/receipts/receipt_writer");
const { getLastReceipt, streamReceipts } = require("../shared_libs/receipts/receipt_reader");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "receipts-reader-"));
const logPath = path.join(tmpDir, "receipts.log");

const resetLog = () => {
  if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
};

const writeRaw = (line) => fs.appendFileSync(logPath, line, "utf8");

const run = (name, fn) => {
  resetLog();
  fn();
  console.log(`✓ ${name}`);
};

run("skips_invalid_json_lines", () => {
  writeRaw("{\"snapshot_hash\":\"" + "a".repeat(64) + "\",\"policy_version_ids\":[\"v1\"],\"repo_id\":\"r1\"}\n");
  writeRaw("{invalid-json\n");
  const receipts = streamReceipts(logPath);
  assert.strictEqual(receipts.length, 1);
});

run("ignores_trailing_partial_line", () => {
  writeRaw("{\"snapshot_hash\":\"" + "a".repeat(64) + "\",\"policy_version_ids\":[\"v1\"],\"repo_id\":\"r1\"}");
  const last = getLastReceipt({}, logPath);
  assert.strictEqual(last, null);
  appendReceipt({ snapshot_hash: "b".repeat(64), policy_version_ids: ["v2"], repo_id: "r1" }, logPath);
  const latest = getLastReceipt({}, logPath);
  assert.strictEqual(latest.snapshot_hash, "b".repeat(64));
});

run("filters_by_repo_id", () => {
  appendReceipt({ snapshot_hash: "a".repeat(64), policy_version_ids: ["v1"], repo_id: "r1" }, logPath);
  appendReceipt({ snapshot_hash: "b".repeat(64), policy_version_ids: ["v2"], repo_id: "r2" }, logPath);
  const r1 = getLastReceipt({ repo_id: "r1" }, logPath);
  assert.strictEqual(r1.snapshot_hash, "a".repeat(64));
});

run("returns_latest_by_timestamp_when_present", () => {
  appendReceipt({
    snapshot_hash: "a".repeat(64),
    policy_version_ids: ["v1"],
    repo_id: "r1",
    timestamp: "2024-01-01T00:00:00Z"
  }, logPath);
  appendReceipt({
    snapshot_hash: "b".repeat(64),
    policy_version_ids: ["v2"],
    repo_id: "r1",
    timestamp: "2024-02-01T00:00:00Z"
  }, logPath);
  const latest = getLastReceipt({ repo_id: "r1" }, logPath);
  assert.strictEqual(latest.snapshot_hash, "b".repeat(64));
});

run("falls_back_to_last_line_when_no_timestamp", () => {
  appendReceipt({ snapshot_hash: "a".repeat(64), policy_version_ids: ["v1"], repo_id: "r1" }, logPath);
  appendReceipt({ snapshot_hash: "b".repeat(64), policy_version_ids: ["v2"], repo_id: "r1" }, logPath);
  const latest = getLastReceipt({ repo_id: "r1" }, logPath);
  assert.strictEqual(latest.snapshot_hash, "b".repeat(64));
});

run("handles_truncation_rotation", () => {
  appendReceipt({ snapshot_hash: "a".repeat(64), policy_version_ids: ["v1"], repo_id: "r1" }, logPath);
  const rotated = path.join(tmpDir, "receipts.log.1");
  fs.renameSync(logPath, rotated);
  appendReceipt({ snapshot_hash: "b".repeat(64), policy_version_ids: ["v2"], repo_id: "r1" }, logPath);
  const latest = getLastReceipt({ repo_id: "r1" }, logPath);
  assert.strictEqual(latest.snapshot_hash, "b".repeat(64));
});
