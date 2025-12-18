// Policy-driven preview/smoke evaluator: no network, refs/ids only.
const evaluatePreviewSmokes = (inputs = {}, policy = {}) => {
  const preview = policy.preview_environment || {};
  const smokes = policy.preview_smoke_checks || [];
  const available = inputs.preview_available === true && preview.available !== false;

  const smoke_results = smokes.map((s) => ({
    id: s.id,
    ref: s.ref,
    result: inputs.smoke_results?.[s.id]?.result || "unknown",
    rerun_allowed: s.rerun_allowed === true
  }));

  const failing = smoke_results.filter((r) =>
    ["fail", "failed", "block", "blocked"].includes(String(r.result || "").toLowerCase())
  );
  const mode = smokes[0]?.enforcement_mode || "observe";
  const hasIssues = !available || failing.length > 0;
  const decision =
    hasIssues && mode === "enforce" ? "block" : hasIssues && mode === "warn" ? "warn" : "pass";

  return {
    decision,
    severity: inputs.severity || null,
    preview_available: available,
    preview_label: preview.label,
    preview_url_template_ref: preview.preview_url_template_ref,
    smoke_check_results: smoke_results,
    enforcement_mode: mode
  };
};

module.exports = { evaluatePreviewSmokes };

