class PolicyEvaluationError extends Error {
  constructor(message, policy_ref) {
    super(message);
    this.name = "PolicyEvaluationError";
    this.policy_ref = policy_ref;
  }
}

const ensureArrayPresent = (value, ref) => {
  if (!Array.isArray(value)) {
    throw new PolicyEvaluationError("Expected array", ref);
  }
  const hasAny = value.some(() => true);
  if (!hasAny) {
    throw new PolicyEvaluationError("Array is empty", ref);
  }
  return value;
};

// Pure, policy-driven evaluator: executors supply all semantics via policy references.
const evaluateRiskBand = (inputs, policy, executors) => {
  if (!policy || typeof policy !== "object") {
    throw new PolicyEvaluationError("Policy missing", "policy");
  }
  if (!executors || typeof executors !== "object") {
    throw new PolicyEvaluationError("Executors missing", "executors");
  }
  const riskScoring = policy.risk_scoring;
  if (!riskScoring || typeof riskScoring !== "object") {
    throw new PolicyEvaluationError("risk_scoring missing", "risk_scoring");
  }
  const drivers = ensureArrayPresent(riskScoring.drivers || [], "risk_scoring.drivers");
  const bands = ensureArrayPresent(riskScoring.bands || [], "risk_scoring.bands");

  const driverResults = [];
  const contributing = [];

  drivers.forEach((driver) => {
    // Allow policy to pick the concrete driver evaluator via refs (e.g., matcher_ref).
    const driverEvaluator =
      executors.resolveDriver && typeof executors.resolveDriver === "function"
        ? executors.resolveDriver(driver, riskScoring, policy)
        : executors.evaluateDriver;
    const evaluated =
      driverEvaluator && typeof driverEvaluator === "function"
        ? driverEvaluator(driver, inputs, policy)
        : null;
    const contributes = evaluated && evaluated.contributes === true;
    driverResults.push({ driver, evaluated });
    if (contributes) {
      contributing.push({
        driver_id: driver.id,
        score_ref: evaluated.score_ref,
        evidence_ref: evaluated.evidence_ref,
        policy_ref: evaluated.policy_ref || driver.policy_ref
      });
    }
  });

  const aggregate =
    executors.aggregateScores && typeof executors.aggregateScores === "function"
      ? executors.aggregateScores(driverResults, riskScoring)
      : null;

  const band =
    executors.selectBand && typeof executors.selectBand === "function"
      ? executors.selectBand({ aggregate, bands, risk_scoring: riskScoring, inputs })
      : null;

  if (!band || !band.id) {
    throw new PolicyEvaluationError("Band selection failed", "risk_scoring.bands");
  }

  return {
    band_id: band.id,
    band_label: band.label,
    contributing_drivers: contributing,
    aggregate
  };
};

module.exports = {
  evaluateRiskBand,
  PolicyEvaluationError
};
