const assert = require("assert");
const { resolveEffectivePolicyM1 } = require("../shared_libs/policy_resolution");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("scope_precedence_applied_correctly", () => {
  const fragments = [
    {
      scope: "base",
      priority: 0,
      updated_at: "2024-01-01T00:00:00Z",
      version_id: "base-1",
      policy: { gate: { enabled: false } }
    },
    {
      scope: "org",
      priority: 0,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "org-1",
      policy: { gate: { enabled: true } }
    },
    {
      scope: "repo",
      priority: 0,
      updated_at: "2024-01-03T00:00:00Z",
      version_id: "repo-1",
      policy: { gate: { enabled: "repo" } }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.strictEqual(result.effective_policy.gate.enabled, "repo");
  assert.deepStrictEqual(result.policy_version_ids, ["base-1", "org-1", "repo-1"]);
});

run("priority_tie_break", () => {
  const fragments = [
    {
      scope: "repo",
      priority: 1,
      updated_at: "2024-02-01T00:00:00Z",
      version_id: "repo-low",
      policy: { feature: { toggle: "low" } }
    },
    {
      scope: "repo",
      priority: 5,
      updated_at: "2024-02-01T00:00:00Z",
      version_id: "repo-high",
      policy: { feature: { toggle: "high" } }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.strictEqual(result.effective_policy.feature.toggle, "high");
  assert.deepStrictEqual(result.policy_version_ids, ["repo-low", "repo-high"]);
});

run("updated_at_tie_break", () => {
  const fragments = [
    {
      scope: "repo",
      priority: 3,
      updated_at: "2024-02-01T00:00:00Z",
      version_id: "older",
      policy: { rollout: { mode: "old" } }
    },
    {
      scope: "repo",
      priority: 3,
      updated_at: "2024-02-02T00:00:00Z",
      version_id: "newer",
      policy: { rollout: { mode: "new" } }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.strictEqual(result.effective_policy.rollout.mode, "new");
  assert.deepStrictEqual(result.policy_version_ids, ["older", "newer"]);
});

run("version_id_final_tie_break_stability", () => {
  const fragments = [
    {
      scope: "branch",
      priority: 2,
      updated_at: "2024-03-01T00:00:00Z",
      version_id: "v002",
      policy: { value: 2 }
    },
    {
      scope: "branch",
      priority: 2,
      updated_at: "2024-03-01T00:00:00Z",
      version_id: "v001",
      policy: { value: 1 }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.strictEqual(result.effective_policy.value, 1);
  assert.deepStrictEqual(result.policy_version_ids, ["v002", "v001"]);
});

run("arrays_are_replaced_not_merged", () => {
  const fragments = [
    {
      scope: "org",
      priority: 0,
      updated_at: "2024-01-01T00:00:00Z",
      version_id: "org-array",
      policy: { bands: ["org"] }
    },
    {
      scope: "repo",
      priority: 0,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "repo-array",
      policy: { bands: ["repo"] }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.deepStrictEqual(result.effective_policy.bands, ["repo"]);
});

run("policy_version_ids_order_is_stable", () => {
  const fragments = [
    {
      scope: "base",
      priority: 0,
      updated_at: "2024-01-01T00:00:00Z",
      version_id: "base-keep",
      policy: { a: 1 }
    },
    {
      scope: "org",
      priority: 0,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "org-nochange",
      policy: { a: 1 }
    },
    {
      scope: "branch",
      priority: 0,
      updated_at: "2024-01-03T00:00:00Z",
      version_id: "branch-apply",
      policy: { b: 2 }
    },
    {
      scope: "session",
      priority: 0,
      updated_at: "2024-01-04T00:00:00Z",
      version_id: "session-apply",
      policy: { c: 3 }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.deepStrictEqual(result.effective_policy, { a: 1, b: 2, c: 3 });
  assert.deepStrictEqual(result.policy_version_ids, [
    "base-keep",
    "branch-apply",
    "session-apply"
  ]);
});

run("policy_version_ids_are_deduped_in_apply_order", () => {
  const fragments = [
    {
      scope: "base",
      priority: 0,
      updated_at: "2024-01-01T00:00:00Z",
      version_id: "dup",
      policy: { a: 1 }
    },
    {
      scope: "branch",
      priority: 1,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "dup",
      policy: { a: 2 }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.deepStrictEqual(result.effective_policy, { a: 2 });
  assert.deepStrictEqual(result.policy_version_ids, ["dup"]);
});

run("policy_version_ids_contributing_only", () => {
  const fragments = [
    {
      scope: "base",
      priority: 0,
      updated_at: "2024-01-01T00:00:00Z",
      version_id: "base",
      policy: { a: 1 }
    },
    {
      scope: "org",
      priority: 0,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "org",
      policy: { a: 1 }
    }
  ];

  const result = resolveEffectivePolicyM1(fragments);
  assert.deepStrictEqual(result.effective_policy, { a: 1 });
  assert.deepStrictEqual(result.policy_version_ids, ["base"]);
});

run("policy_version_ids_stable_across_runs", () => {
  const fragments = [
    {
      scope: "org",
      priority: 1,
      updated_at: "2024-01-02T00:00:00Z",
      version_id: "org-1",
      policy: { a: { b: 1 } }
    },
    {
      scope: "org",
      priority: 2,
      updated_at: "2024-01-03T00:00:00Z",
      version_id: "org-2",
      policy: { a: { b: 2 } }
    }
  ];

  const first = resolveEffectivePolicyM1(fragments);
  const second = resolveEffectivePolicyM1(fragments);

  assert.deepStrictEqual(first.policy_version_ids, second.policy_version_ids);
  assert.deepStrictEqual(first.effective_policy, second.effective_policy);
});
