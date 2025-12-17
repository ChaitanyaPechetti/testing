const { execFileSync } = require("child_process");
const path = require("path");

/**
 * @typedef {Object} StagedFileEntry
 * @property {string} path
 * @property {string} ext
 * @property {string} change_type
 */
/**
 * @typedef {Object} StagedDiff
 * @property {number} loc_added
 * @property {number} loc_deleted
 * @property {number} loc_total
 * @property {number} file_count
 * @property {StagedFileEntry[]} files
 */
/**
 * @typedef {Object} RiskInputsM1
 * @property {string} repo_id
 * @property {string|null} branch
 * @property {StagedDiff} staged_diff
 * @property {string[]} path_signals
 * @property {string[]} dependency_signals
 * @property {Object|null} coverage_delta_meta
 * @property {string[]} recent_incident_refs
 * @property {string} timestamp
 * @property {boolean} no_git
 * @property {string} [git_error]
 */

// Policy-neutral manifest list: records presence only, never reads contents.
// Canonical set of dependency manifest filenames we treat as signals without reading contents.
const DEFAULT_DEPENDENCY_MANIFESTS = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "requirements.txt",
  "requirements-dev.txt",
  "pyproject.toml",
  "poetry.lock",
  "Pipfile"
]);

// Thin git wrapper keeps execution contained and mockable for tests.
// Default git runner kept as a thin wrapper so tests can inject a fake runner.
const defaultGitRunner = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8"
  });

// Parse `git diff --cached --numstat` output into numeric additions/deletions per path.
// Binary rows are normalized to zeros and flagged; no content is read.
const parseNumstat = (text) => {
  const entries = [];
  if (!text) return entries;
  text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .forEach((line) => {
      const parts = line.split("\t");
      if (parts.length < 3) return;
      const [added, deleted, filePath] = parts;
      entries.push({
        path: filePath,
        added: added === "-" ? 0 : parseInt(added, 10),
        deleted: deleted === "-" ? 0 : parseInt(deleted, 10),
        binary: added === "-" && deleted === "-"
      });
    });
  return entries;
};

// Parse `git diff --cached --name-status` to map file path to change code (A/M/D/R).
// Renames record the destination path only; upstream policy matchers decide semantics.
const parseNameStatus = (text) => {
  const map = new Map();
  if (!text) return map;
  text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .forEach((line) => {
      const parts = line.split("\t");
      if (!parts.length) return;
      const code = parts[0];
      const type = code[0];
      if (type === "R" && parts.length >= 3) {
        map.set(parts[2], "R");
      } else if (parts.length >= 2) {
        map.set(parts[1], type);
      }
    });
  return map;
};

// Merge numstat and name-status data into a single per-file view used by staged_diff.
// Keeps just metadata (path/ext/change type); never touches file contents.
const buildFilesStats = (numstatEntries, nameStatusMap) => {
  const filesSet = new Set();
  numstatEntries.forEach((entry) => filesSet.add(entry.path));
  nameStatusMap.forEach((_, filePath) => filesSet.add(filePath));

  const files = [];
  filesSet.forEach((filePath) => {
    const entry = numstatEntries.find((item) => item.path === filePath);
    const changeType = nameStatusMap.get(filePath) || "M";
    files.push({
      path: filePath,
      ext: path.extname(filePath) || "",
      change_type: changeType,
      added: entry ? entry.added : 0,
      deleted: entry ? entry.deleted : 0,
      binary: entry ? entry.binary : false
    });
  });
  return files;
};

// Assemble staged diff summary numbers and sanitized file descriptors (no content).
// Aggregates LOC for reporting only; any scoring happens elsewhere.
const captureStagedDiff = (numstatText, nameStatusText) => {
  const numstatEntries = parseNumstat(numstatText);
  const nameStatusMap = parseNameStatus(nameStatusText);
  const files = buildFilesStats(numstatEntries, nameStatusMap);
  const locAdded = files.reduce((sum, file) => sum + (file.added || 0), 0);
  const locDeleted = files.reduce((sum, file) => sum + (file.deleted || 0), 0);
  return {
    loc_added: locAdded,
    loc_deleted: locDeleted,
    loc_total: locAdded + locDeleted,
    file_count: files.length,
    files: files.map(({ path: filePath, ext, change_type }) => ({ path: filePath, ext, change_type }))
  };
};

// Dependency signals are filenames only; we never read the manifest contents here.
// Policy-driven logic can interpret them later without leaking file data.
const detectDependencySignals = (files) => {
  const signals = new Set();
  files.forEach(({ path: filePath }) => {
    const base = path.basename(filePath);
    if (DEFAULT_DEPENDENCY_MANIFESTS.has(base)) {
      signals.add(base);
    }
  });
  return Array.from(signals);
};

const collectRiskInputs = (repoPath, scope = {}, options = {}) => {
  const runner = options.gitRunner || defaultGitRunner;
  const branch = scope.branch || null;
  const repoId = scope.repo_id || path.basename(repoPath);
  const timestamp = new Date().toISOString();

  // Base payload is fully JSON-serializable and policy-neutral; downstream logic scores it.
  const result = {
    repo_id: repoId,
    branch,
    staged_diff: {
      loc_added: 0,
      loc_deleted: 0,
      loc_total: 0,
      file_count: 0,
      files: []
    },
    path_signals: scope.path_signals || [],
    dependency_signals: [],
    coverage_delta_meta: null,
    recent_incident_refs: [],
    timestamp,
    no_git: false
  };

  let numstatText = "";
  let nameStatusText = "";
  try {
    numstatText = runner(["diff", "--cached", "--numstat"], repoPath);
    nameStatusText = runner(["diff", "--cached", "--name-status"], repoPath);
  } catch (err) {
    result.no_git = true;
    result.git_error = err.message;
    return result;
  }

  const stagedDiff = captureStagedDiff(numstatText, nameStatusText);
  result.staged_diff = stagedDiff;
  result.dependency_signals = detectDependencySignals(stagedDiff.files);
  return result;
};

module.exports = {
  collectRiskInputs,
  DEFAULT_DEPENDENCY_MANIFESTS,
  _internal: {
    parseNumstat,
    parseNameStatus,
    buildFilesStats,
    captureStagedDiff
  }
};
