const fs = require("fs");
const path = require("path");

const DEFAULT_SCAN_ROOTS = ["implementation", "shared_libs"];
const EXCLUDED_SEGMENTS = [
  "node_modules",
  ".git",
  "tests",
  "__tests__",
  "fixtures",
  "docs",
  ".schema.json",
  ".schema.",
  "schema.json"
];

const ALLOWLIST_PATTERNS = [
  /schema_version/i,
  /error_?code/i,
  /ERR_/,
  /POL-[A-Z0-9_-]+/,
  /policy_version_ids/,
  /snapshot_hash/
];

const SUSPICIOUS_NUMERIC =
  /(threshold|weight|band|retry|timeout|ttl|window|expiry|sla|guard|quarantine|confidence)[A-Za-z0-9_]*[^\n]*\b\d+(\.\d+)?/i;

const isExcluded = (filePath) =>
  EXCLUDED_SEGMENTS.some((seg) => filePath.includes(seg));

const shouldScanFile = (filePath) => {
  if (isExcluded(filePath)) return false;
  const ext = path.extname(filePath);
  return ext === ".js" || ext === ".ts";
};

const lineIsAllowlisted = (line) =>
  ALLOWLIST_PATTERNS.some((pattern) => pattern.test(line));

const scanFile = (filePath) => {
  const contents = fs.readFileSync(filePath, "utf8");
  const hits = [];
  contents.split(/\r?\n/).forEach((line, idx) => {
    if (!line.trim()) return;
    if (lineIsAllowlisted(line)) return;
    if (SUSPICIOUS_NUMERIC.test(line)) {
      hits.push({
        file: filePath,
        line: idx + 1,
        text: line.trim()
      });
    }
  });
  return hits;
};

const walk = (dir, acc) => {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcluded(full)) walk(full, acc);
      return;
    }
    if (shouldScanFile(full)) {
      acc.push(full);
    }
  });
};

const scanForPolicyLiterals = (roots = DEFAULT_SCAN_ROOTS) => {
  const files = [];
  roots.forEach((root) => walk(root, files));
  const violations = [];
  files.forEach((file) => {
    scanFile(file).forEach((hit) => violations.push(hit));
  });
  return violations;
};

module.exports = {
  scanForPolicyLiterals,
  _internal: {
    scanFile,
    shouldScanFile,
    lineIsAllowlisted,
    SUSPICIOUS_NUMERIC
  }
};
