const fs = require("fs");
const path = require("path");
const { computeSnapshotHash } = require("./effective_policy_resolver");

const DEFAULT_POLICY_PATH =
  process.env.EFFECTIVE_POLICY_PATH || path.join(process.cwd(), "effective_policy.json");

const readJsonFile = (filePath) => {
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
};

const normalizePolicyPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("policy payload must be an object");
  }

  // Accept either wrapped ({ effective_policy, policy_version_ids }) or raw policy object.
  const effective_policy = payload.effective_policy || payload;
  const policy_version_ids = Array.isArray(payload.policy_version_ids)
    ? payload.policy_version_ids
    : [];

  if (!effective_policy || typeof effective_policy !== "object") {
    throw new Error("effective_policy must be an object");
  }

  const snapshot_hash = computeSnapshotHash(effective_policy);
  return { effective_policy, policy_version_ids, snapshot_hash };
};

const reloadEffectivePolicy = (opts = {}) => {
  const filePath = opts.filePath || DEFAULT_POLICY_PATH;
  const lastKnown = opts.lastKnown;

  try {
    const payload = readJsonFile(filePath);
    const normalized = normalizePolicyPayload(payload);
    return { ...normalized, source_path: filePath };
  } catch (err) {
    if (lastKnown) {
      return { ...lastKnown, source_path: filePath, error: err };
    }
    throw err;
  }
};

module.exports = {
  reloadEffectivePolicy,
  normalizePolicyPayload,
  DEFAULT_POLICY_PATH
};
