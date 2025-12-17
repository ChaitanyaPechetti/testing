const shortHash = (hash) => (hash && hash.length >= 8 ? hash.slice(0, 8) : "unknown");

// Build a sanitized model for the Zero UI risk card from a receipt.
// Only uses receipt fields; removes raw file paths and limits to ids/refs.
const buildRiskCardModel = (receipt) => {
  if (!receipt || typeof receipt !== "object") {
    return {
      band: "—",
      drivers: [],
      actions: [],
      evidence: { snapshot: "unknown", receipt_id: "n/a", policy_version_ids: [] }
    };
  }

  const outputs = receipt.outputs_summary || {};
  const drivers = (outputs.contributing_drivers || []).map((d) => ({
    driver_id: d.driver_id,
    policy_ref: d.policy_ref || d.score_ref
  }));

  const actions = (outputs.actions || []).map((a) => ({
    action_id: a.action_id,
    label_ref: a.label_ref || a.label,
    command_ref: a.command_ref
  }));

  const stageChecks = (outputs.stage_checks || []).map((c) => ({
    id: c.id,
    result: c.result,
    ref: c.policy_ref || c.check_ref
  }));

  const releaseStages = {
    stage_preset: outputs.stage_preset || outputs.stage_preset_name,
    current_stage: outputs.current_stage,
    stage_checks: stageChecks,
    guard: outputs.guard_window || {
      state: outputs.guard_state,
      breached: outputs.guard_breached,
      next_action: outputs.guard_next_action,
      label: outputs.guard_label
    }
  };

  const evidenceBuilder = {
    required: outputs.required_evidence || [],
    missing: outputs.missing_evidence || [],
    templates: outputs.templates || []
  };

  const flagControl = {
    flag_ids: outputs.flag_ids || outputs.flags || [],
    missing_fields: outputs.missing_fields || [],
    capability_violations: outputs.capability_violations || [],
    is_stale: outputs.is_stale === true,
    provider_id: outputs.provider_id,
    required_fields: outputs.required_fields || [],
    enforcement_mode: outputs.enforcement_mode
  };

  const preview = {
    available: outputs.preview_available === true,
    label: outputs.preview_label,
    preview_url_template_ref: outputs.preview_url_template_ref,
    smoke_check_results: outputs.smoke_check_results || []
  };

  const approvals = {
    missing: outputs.missing_approvals || [],
    required: outputs.required || [],
    decision: outputs.decision,
    severity: outputs.severity
  };

  const breakGlass = {
    decision: outputs.decision,
    active: outputs.active === true,
    expiry_ref: outputs.expiry_ref,
    scope_refs: outputs.scope_refs || [],
    post_hoc_refs: outputs.post_hoc_refs || [],
    banner_template_ref: outputs.banner_template_ref
  };

  const impacted = {
    strategy_ref: outputs.strategy_ref,
    max_duration_ref: outputs.max_duration_ref,
    budget_ref: outputs.budget_ref,
    fallbacks_ref: outputs.fallbacks_ref,
    selected_tests: outputs.selected_tests || []
  };

  const flaky = {
    flaky_tests: outputs.flaky_tests || [],
    retry_actions: outputs.retry_actions || [],
    quarantine_actions: outputs.quarantine_actions || [],
    ticket_actions: outputs.ticket_actions || []
  };

  const deltaCoverage = {
    delta_coverage: outputs.delta_coverage,
    threshold_ref: outputs.threshold_ref,
    cadence_ref: outputs.cadence_ref,
    scaffold_action_ref: outputs.scaffold_action_ref,
    below_threshold: outputs.below_threshold === true
  };

  const privacy = {
    role: outputs.privacy_role || "developer",
    redacted: outputs.redacted === true,
    masked_fields: outputs.masked_fields || [],
    visibility_label: outputs.visibility_label
  };

  return {
    band: outputs.band_label || outputs.band_id || "Unknown",
    drivers,
    actions,
    ownership: outputs.ownership_refs || {},
    owner_review_required: outputs.owner_review_required === true,
    escalation_action: outputs.escalation_action || null,
    rollback: {
      decision: outputs.decision,
      missing: outputs.missing_requirements || []
    },
    release_stages: releaseStages,
    evidence_builder: evidenceBuilder,
    flag_control: flagControl,
    preview,
    approvals,
    break_glass: breakGlass,
    impacted_tests: impacted,
    flaky_handling: flaky,
    delta_coverage: deltaCoverage,
    privacy,
    evidence: {
      snapshot: shortHash(receipt.snapshot_hash),
      receipt_id: receipt.receipt_id || "n/a",
      policy_version_ids: receipt.policy_version_ids || []
    }
  };
};

module.exports = {
  buildRiskCardModel
};
