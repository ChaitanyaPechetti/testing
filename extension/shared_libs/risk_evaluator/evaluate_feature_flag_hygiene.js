// Policy-driven feature flag hygiene evaluator: no provider SDK calls, ids/refs only.
const evaluateFeatureFlagHygiene = (inputs = {}, policy = {}) => {
  const meta = policy.feature_flag_meta || {};
  const hygiene = policy.feature_flag_hygiene || {};
  const requiredFields = meta.required_fields || [];
  const provided = inputs.flag_metadata || {};
  const missing_fields = requiredFields.filter((f) => !provided[f]);

  const providerId = provided.provider_id;
  const caps =
    (policy.feature_flag_provider_capabilities || []).find((c) => c.provider_id === providerId) || {};

  const capability_violations = [];
  if (provided.kill_path_ref && caps.supports_kill === false) capability_violations.push("kill_path_not_supported");
  if ((provided.owner_ref || provided.sla_seconds_ref || provided.kill_path_ref) && caps.supports_metadata === false) {
    capability_violations.push("metadata_not_supported");
  }

  // Staleness is policy-driven: only consider staleness when hygiene rules reference it.
  const isStale =
    Array.isArray(hygiene.stale_rule_refs) && hygiene.stale_rule_refs.length > 0
      ? inputs.is_stale === true
      : false;
  const hasIssues = missing_fields.length || capability_violations.length || isStale;
  const mode = hygiene.enforcement_mode || "observe";
  const decision =
    hasIssues && mode === "enforce" ? "block" : hasIssues && mode === "warn" ? "warn" : "pass";

  return {
    decision,
    missing_fields,
    capability_violations,
    is_stale: isStale,
    provider_id: providerId,
    required_fields: requiredFields,
    enforcement_mode: mode
  };
};

module.exports = { evaluateFeatureFlagHygiene };

