const shortHash = (hash) => (hash && hash.length >= 8 ? hash.slice(0, 8) : "unknown");

// Build a sanitized model for policy changelog rendering from receipt + optional metadata.
// This is presentation-only: we do not compute diffs or infer phases.
const buildPolicyChangelogModel = (receipt, policyMeta = {}) => {
  if (!receipt || typeof receipt !== "object") {
    return {
      snapshot: "unknown",
      policy_version_ids: [],
      phase: policyMeta.phase || "unknown",
      changelog: []
    };
  }

  const versions = Array.isArray(receipt.policy_version_ids) ? receipt.policy_version_ids : [];
  const snapshot = shortHash(receipt.snapshot_hash);
  const phase =
    (receipt.outputs_summary && receipt.outputs_summary.phase) ||
    policyMeta.phase ||
    "unknown";

  // If local policy metadata has changelog entries, use them; otherwise empty list.
  const changelog = Array.isArray(policyMeta.changelog) ? policyMeta.changelog : [];

  return {
    snapshot,
    policy_version_ids: versions,
    phase,
    changelog
  };
};

module.exports = {
  buildPolicyChangelogModel
};


