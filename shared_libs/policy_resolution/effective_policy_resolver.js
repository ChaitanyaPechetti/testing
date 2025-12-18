// Deterministic GSMD-effective policy resolver for Module 1.
// Applies precedence and tie-break rules and returns a merged snapshot plus trace.

const crypto = require("crypto");

const SCOPE_PRECEDENCE = {
  base: 0,
  org: 1,
  repo: 2,
  branch: 3,
  actor: 4,
  session: 5
};

const normalizePriority = (priority) => (typeof priority === "number" ? priority : 0);
const normalizeUpdatedAt = (updated_at) => (typeof updated_at === "string" ? updated_at : "");
const scopeRank = (scope) =>
  Object.prototype.hasOwnProperty.call(SCOPE_PRECEDENCE, scope) ? SCOPE_PRECEDENCE[scope] : 0;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]" && value !== null;

const canonicalStringify = (value, path = "root") => {
  const type = typeof value;

  if (value === null) return "null";
  if (type === "boolean") return value ? "true" : "false";
  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number at ${path}`);
    }
    return Number(value).toString();
  }
  if (type === "string") return JSON.stringify(value);
  if (type === "bigint") {
    throw new Error(`Unsupported bigint at ${path}`);
  }
  if (type === "undefined" || type === "function" || type === "symbol") {
    throw new Error(`Unsupported type '${type}' at ${path}`);
  }
  if (Array.isArray(value)) {
    const items = value.map((item, idx) => canonicalStringify(item, `${path}[${idx}]`));
    return `[${items.join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new Error(`Unsupported object type at ${path}`);
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => {
    const v = canonicalStringify(value[key], `${path}.${key}`);
    return `${JSON.stringify(key)}:${v}`;
  });
  return `{${entries.join(",")}}`;
};

const computeSnapshotHash = (effective_policy) => {
  const canonicalJson = canonicalStringify(effective_policy);
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i += 1) {
      if (keysA[i] !== keysB[i]) return false;
      if (!deepEqual(a[keysA[i]], b[keysA[i]])) return false;
    }
    return true;
  }
  return false;
};

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) {
    const copy = {};
    Object.keys(value).forEach((key) => {
      copy[key] = cloneValue(value[key]);
    });
    return copy;
  }
  return value;
};

const deepMerge = (base, overlay) => {
  const safeBase = isPlainObject(base) ? base : {};
  const result = { ...safeBase };
  let changed = false;

  Object.keys(overlay || {}).forEach((key) => {
    const overlayVal = overlay[key];
    const existingVal = safeBase[key];

    if (Array.isArray(overlayVal)) {
      if (!deepEqual(existingVal, overlayVal)) {
        result[key] = cloneValue(overlayVal);
        changed = true;
      }
      return;
    }

    if (isPlainObject(overlayVal) && isPlainObject(existingVal)) {
      const nested = deepMerge(existingVal, overlayVal);
      result[key] = nested.merged;
      if (nested.changed) changed = true;
      return;
    }

    if (isPlainObject(overlayVal)) {
      if (!deepEqual(existingVal, overlayVal)) changed = true;
      result[key] = cloneValue(overlayVal);
      return;
    }

    if (!deepEqual(existingVal, overlayVal)) {
      result[key] = overlayVal;
      changed = true;
    }
  });

  return { merged: changed ? result : safeBase, changed };
};

const compareFragments = (a, b) => {
  const scopeDiff = scopeRank(a.scope) - scopeRank(b.scope);
  if (scopeDiff !== 0) return scopeDiff;

  const priorityDiff = normalizePriority(a.priority) - normalizePriority(b.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const aUpdated = normalizeUpdatedAt(a.updated_at);
  const bUpdated = normalizeUpdatedAt(b.updated_at);
  if (aUpdated < bUpdated) return -1;
  if (aUpdated > bUpdated) return 1;

  const aVersion = a.version_id || "";
  const bVersion = b.version_id || "";
  if (aVersion === bVersion) return 0;
  return aVersion < bVersion ? 1 : -1; // lexicographically smaller wins → applied last
};

const resolveEffectivePolicyM1 = (fragments = []) => {
  const sorted = [...fragments].sort(compareFragments);
  let effective = {};
  const policyVersionIds = [];
  const seenVersionIds = new Set();
  const resolutionTrace = [];

  sorted.forEach((fragment) => {
    const policy = fragment.policy || {};
    const mergeResult = deepMerge(effective, policy);
    const applied = mergeResult.changed;

    resolutionTrace.push({
      scope: fragment.scope,
      priority: normalizePriority(fragment.priority),
      updated_at: normalizeUpdatedAt(fragment.updated_at),
      version_id: fragment.version_id,
      source: fragment.source,
      applied
    });

    if (applied) {
      effective = mergeResult.merged;
      if (fragment.version_id && !seenVersionIds.has(fragment.version_id)) {
        seenVersionIds.add(fragment.version_id);
        policyVersionIds.push(fragment.version_id);
      }
    }
  });

  return {
    effective_policy: effective,
    policy_version_ids: policyVersionIds,
    snapshot_hash: computeSnapshotHash(effective),
    resolution_trace: resolutionTrace
  };
};

module.exports = {
  resolveEffectivePolicyM1,
  computeSnapshotHash,
  canonicalStringify,
  SCOPE_PRECEDENCE,
  compareFragments,
  deepMerge,
  deepEqual
};
