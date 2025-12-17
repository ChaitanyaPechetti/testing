const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { appendReceipt, readReceiptsSafe } = require("../shared_libs/receipts");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "receipts-"));
const logPath = path.join(tmpDir, "receipts.log");

const resetLog = () => {
  if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
};

const run = (name, fn) => {
  resetLog();
  fn();
  console.log(`✓ ${name}`);
};

run("append_writes_one_line_per_call", () => {
  appendReceipt({ id: 1 }, logPath);
  appendReceipt({ id: 2 }, logPath);
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  assert.strictEqual(lines.length, 2);
});

run("fsync_called_or_equivalent", () => {
  let called = 0;
  const original = fs.fsyncSync;
  fs.fsyncSync = (...args) => {
    called += 1;
    return original.apply(fs, args);
  };
  try {
    appendReceipt({ id: "fsync" }, logPath);
    assert.ok(called >= 1, "fsyncSync should be called at least once");
  } finally {
    fs.fsyncSync = original;
  }
});

run("survives_partial_write", () => {
  fs.writeFileSync(logPath, '{"id":1'); // partial line, no newline
  appendReceipt({ id: 2 }, logPath);
  const receipts = readReceiptsSafe(logPath);
  assert.deepStrictEqual(receipts, [{ id: 2 }]);
});

run("rotation_safe_reopen", () => {
  appendReceipt({ id: 1 }, logPath);
  const rotated = path.join(tmpDir, "receipts.log.1");
  fs.renameSync(logPath, rotated); // simulate rotation
  appendReceipt({ id: 2 }, logPath);

  const newFile = fs.readFileSync(logPath, "utf8").trim().split("\n");
  const oldFile = fs.readFileSync(rotated, "utf8").trim().split("\n");
  assert.strictEqual(newFile.length, 1);
  assert.strictEqual(oldFile.length, 1);
});

run("no_mutation_of_existing_lines", () => {
  appendReceipt({ id: 1 }, logPath);
  const before = fs.readFileSync(logPath, "utf8");
  appendReceipt({ id: 2 }, logPath);
  const after = fs.readFileSync(logPath, "utf8");
  assert.ok(after.startsWith(before));
});
