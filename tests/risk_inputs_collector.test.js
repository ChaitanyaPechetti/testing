const assert = require("assert");

const { collectRiskInputs, _internal } = require("../shared_libs/risk_inputs");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("parse_numstat_correctly", () => {
  const text = "10\t5\tfoo.js\n-\t-\tbar.bin\n";
  const entries = _internal.parseNumstat(text);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].added, 10);
  assert.strictEqual(entries[0].deleted, 5);
  assert.strictEqual(entries[1].added, 0);
  assert.strictEqual(entries[1].deleted, 0);
});

run("parse_name_status_and_build_files", () => {
  const nameStatus = "A\tfoo.js\nR100\told.js\tnew.js\n";
  const parsedMap = _internal.parseNameStatus(nameStatus);
  const files = _internal.buildFilesStats(
    [{ path: "foo.js", added: 1, deleted: 0, binary: false }],
    parsedMap
  );
  const renamed = files.find((f) => f.path === "new.js");
  assert.strictEqual(renamed.change_type, "R");
});

run("collect_handles_binary_and_renames", () => {
  const runner = (args) => {
    if (args.includes("--numstat")) {
      return "10\t5\tfoo.js\n-\t-\tbar.bin\n";
    }
    if (args.includes("--name-status")) {
      return "A\tfoo.js\nR100\tbar.bin\tbar.bin\n";
    }
    return "";
  };
  const result = collectRiskInputs("/repo", { repo_id: "repo" }, { gitRunner: runner });
  assert.strictEqual(result.staged_diff.file_count, 2);
  assert.strictEqual(result.staged_diff.loc_added, 10);
  assert.strictEqual(result.staged_diff.loc_deleted, 5);
  assert.deepStrictEqual(result.dependency_signals, []);
});

run("collect_handles_no_staged_changes", () => {
  const runner = () => "";
  const result = collectRiskInputs("/repo", { repo_id: "repo" }, { gitRunner: runner });
  assert.strictEqual(result.staged_diff.file_count, 0);
});

run("collect_handles_no_git", () => {
  const runner = () => {
    throw new Error("not a git repo");
  };
  const result = collectRiskInputs("/repo", { repo_id: "repo" }, { gitRunner: runner });
  assert.strictEqual(result.no_git, true);
  assert.strictEqual(result.staged_diff.file_count, 0);
});
