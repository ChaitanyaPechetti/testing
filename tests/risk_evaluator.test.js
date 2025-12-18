const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { evaluateRiskBand, PolicyEvaluationError } = require("../shared_libs/risk_evaluator");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

const makePolicy = (weightsToBandThreshold, boundaries) => ({
  risk_scoring: {
    drivers: [
      { id: "driver_a", weight: weightsToBandThreshold.driver_a },
      { id: "driver_b", weight: weightsToBandThreshold.driver_b }
    ],
    bands: boundaries
  }
});

const makeExecutors = () => ({
  evaluateDriver: (driver, inputs) => {
    const value = inputs.signal_map[driver.id] || 0;
    const weighted = (driver.weight || 0) * value;
    return {
      contributes: value > 0,
      score_ref: String(weighted)
    };
  },
  aggregateScores: (driverResults) =>
    driverResults.reduce((acc, item) => {
      const score = item.evaluated && item.evaluated.score_ref ? Number(item.evaluated.score_ref) : 0;
      return acc + score;
    }, 0),
  selectBand: ({ aggregate, bands }) => {
    const sorted = [...bands].sort((a, b) => Number(a.boundary) - Number(b.boundary));
    const picked = sorted.find((band) => aggregate <= Number(band.boundary)) || sorted[sorted.length - 1];
    return { id: picked.id, label: picked.label };
  }
});

run("same_inputs_same_policy_same_band", () => {
  const policy = makePolicy(
    { driver_a: 1, driver_b: 1 },
    [
      { id: "low", label: "Low", boundary: 2 },
      { id: "high", label: "High", boundary: 99 }
    ]
  );
  const executors = makeExecutors();
  const inputs = { signal_map: { driver_a: 1, driver_b: 1 } };
  const first = evaluateRiskBand(inputs, policy, executors);
  const second = evaluateRiskBand(inputs, policy, executors);
  assert.strictEqual(first.band_id, "low");
  assert.strictEqual(second.band_id, "low");
});

run("changing_policy_changes_band_without_code_change", () => {
  const basePolicy = makePolicy(
    { driver_a: 1, driver_b: 1 },
    [
      { id: "low", label: "Low", boundary: 2 },
      { id: "high", label: "High", boundary: 99 }
    ]
  );
  const alteredPolicy = makePolicy(
    { driver_a: 10, driver_b: 10 },
    [
      { id: "low", label: "Low", boundary: 2 },
      { id: "high", label: "High", boundary: 99 }
    ]
  );
  const executors = makeExecutors();
  const inputs = { signal_map: { driver_a: 1, driver_b: 1 } };
  const base = evaluateRiskBand(inputs, basePolicy, executors);
  const altered = evaluateRiskBand(inputs, alteredPolicy, executors);
  assert.notStrictEqual(base.band_id, altered.band_id);
});

run("driver_with_no_match_does_not_contribute", () => {
  const policy = makePolicy(
    { driver_a: 1, driver_b: 1 },
    [
      { id: "low", label: "Low", boundary: 2 },
      { id: "high", label: "High", boundary: 99 }
    ]
  );
  const executors = makeExecutors();
  const inputs = { signal_map: { driver_a: 0, driver_b: 0 } };
  const result = evaluateRiskBand(inputs, policy, executors);
  assert.strictEqual(result.contributing_drivers.length, 0);
});

run("band_selection_uses_policy_boundaries_only", () => {
  const policy = makePolicy(
    { driver_a: 5, driver_b: 5 },
    [
      { id: "low", label: "Low", boundary: 20 },
      { id: "high", label: "High", boundary: 25 }
    ]
  );
  const executors = makeExecutors();
  const inputs = { signal_map: { driver_a: 3, driver_b: 3 } };
  const result = evaluateRiskBand(inputs, policy, executors);
  assert.strictEqual(result.band_id, "high");
});

run("policy_refs_can_swap_driver_evaluator", () => {
  const policy = {
    risk_scoring: {
      drivers: [
        { id: "driver_a", matcher_ref: "always_on" },
        { id: "driver_b", matcher_ref: "always_off" }
      ],
      bands: [
        { id: "low", label: "Low", boundary: 0 },
        { id: "high", label: "High", boundary: 1 }
      ]
    }
  };

  const evaluators = {
    always_on: (driver, inputs) => ({
      contributes: true,
      score_ref: inputs.signal_map[driver.id] ? "1" : "1"
    }),
    always_off: () => ({
      contributes: false
    })
  };

  const executors = {
    resolveDriver: (driver) => evaluators[driver.matcher_ref],
    aggregateScores: (driverResults) =>
      driverResults.reduce((acc, item) => {
        const score = item.evaluated && item.evaluated.score_ref ? Number(item.evaluated.score_ref) : 0;
        return acc + score;
      }, 0),
    selectBand: ({ aggregate, bands }) => {
      const sorted = [...bands].sort((a, b) => Number(a.boundary) - Number(b.boundary));
      const picked = sorted.find((band) => aggregate <= Number(band.boundary)) || sorted[sorted.length - 1];
      return { id: picked.id, label: picked.label };
    }
  };

  const inputs = { signal_map: { driver_a: 1, driver_b: 1 } };
  const result = evaluateRiskBand(inputs, policy, executors);
  assert.strictEqual(result.band_id, "high");

  const swappedPolicy = {
    risk_scoring: {
      drivers: [
        { id: "driver_a", matcher_ref: "always_off" },
        { id: "driver_b", matcher_ref: "always_off" }
      ],
      bands: policy.risk_scoring.bands
    }
  };
  const swappedResult = evaluateRiskBand(inputs, swappedPolicy, executors);
  assert.strictEqual(swappedResult.band_id, "low");
});

run("no_literals_in_evaluator", () => {
  const file = path.join(__dirname, "..", "shared_libs", "risk_evaluator", "evaluate_risk_band.js");
  const content = fs.readFileSync(file, "utf8");
  const digits = /[0-9]/;
  assert.strictEqual(digits.test(content), false, "Evaluator should not embed numeric literals");
});

run("throws_on_missing_policy_structures", () => {
  let threw = false;
  try {
    evaluateRiskBand({}, {}, {});
  } catch (err) {
    threw = err instanceof PolicyEvaluationError;
  }
  assert.ok(threw, "Should throw typed error when policy missing");
});
