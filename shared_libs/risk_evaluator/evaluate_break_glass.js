// Policy-driven break-glass evaluator: ids/refs only, no clocks or network.
const evaluateBreakGlass = (inputs = {}, policy = {}) => {
  const rules = policy.break_glass_rules || [];
  const active = inputs.request_active === true;
  const rule = rules[0] || {};
  const expiry = active ? inputs.expiry_ts_ref || rule.expiry_rule_refs?.[0]?.rule_ref : null;
  const scope_refs = rule.scope_refs || [];
  const post_hoc_refs = rule.post_hoc_rule_refs || [];
  const banner_template_ref = rule.banner_template_ref;

  const decision = active ? "active" : "inactive";
  return {
    decision,
    active,
    expiry_ref: expiry,
    scope_refs,
    post_hoc_refs,
    banner_template_ref,
    severity: inputs.severity || null
  };
};

module.exports = { evaluateBreakGlass };

