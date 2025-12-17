const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { scanForPolicyLiterals, _internal } = require("../shared_libs/invariants/no_policy_literals");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

const createTempFile = (relativePath, contents) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "invariant-"));
  const fullPath = path.join(base, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents, "utf8");
  return { base, fullPath };
};

run("invariant_allows_known_safe_constants", () => {
  const { base } = createTempFile("shared_libs/safe.js", "const SCHEMA_VERSION = '1.0.0';\nconst ERROR_CODE = 'E01';");
  const hits = scanForPolicyLiterals([base]);
  assert.strictEqual(hits.length, 0);
});

run("invariant_flags_threshold_like_literals", () => {
  const { base, fullPath } = createTempFile("implementation/bad.js", "const risk_threshold = 10; // bad literal");
  const hits = scanForPolicyLiterals([base]);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].file, fullPath);
});

run("invariant_excludes_tests_and_schemas", () => {
  const { base } = createTempFile("tests/ignored.js", "const risk_threshold = 5;");
  const hits = scanForPolicyLiterals([base]);
  assert.strictEqual(hits.length, 0);
});

run("scanFile_respects_allowlist", () => {
  const { fullPath } = createTempFile("shared_libs/allowed.js", "const error_code_timeout = 504;");
  const hits = _internal.scanFile(fullPath);
  assert.strictEqual(hits.length, 0);
});
