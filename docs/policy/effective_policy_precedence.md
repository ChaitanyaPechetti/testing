# GSMD Effective Policy Precedence (Module 1)

This document defines the deterministic precedence and tie-break rules used to produce the Module 1 GSMD effective policy snapshot. The resolver produces:

- `effective_policy`: deep-merged snapshot
- `policy_version_ids`: ordered list of fragments that contributed at least one surviving key
- `resolution_trace`: ordered trace of evaluated fragments and whether they applied

## Precedence order

Highest precedence wins, applied last:

1. Session
2. Actor
3. Branch
4. Repo
5. Org
6. Base

## Tie-breaks within the same scope

1. Higher `priority` wins (larger number applied later).
2. If `priority` ties, later `updated_at` wins (ISO timestamp, compared lexicographically).
3. If `updated_at` ties, lexicographically smaller `version_id` wins (applied last for determinism).

Missing `priority` defaults to `0`; missing `updated_at` defaults to empty string for sorting.

## Merge strategy

- Objects: deep-merge; winners override only at leaf keys.
- Arrays: replaced wholesale by the higher-precedence fragment (no concatenation).
- Nulls: treated as values (no delete semantics).

## Policy version ordering

- `policy_version_ids` are ordered by application (from lowest precedence to highest) using the same resolver tie-breaks (scope specificity, then priority, updated_at, version_id).
- The list includes only fragments that changed the effective snapshot (contributing-only) and is de-duplicated while preserving first-application order.
- `resolution_trace` records every considered fragment and whether it applied.

## Determinism

Given the same inputs, sorting and merge rules above guarantee the same snapshot, version ordering, and trace. This resolver is pure and does not read external state. Use `resolveEffectivePolicyM1` from `shared_libs/policy_resolution` for both extension and agent flows.

## Snapshot hash

- `snapshot_hash` is computed from the resolved `effective_policy` only, after precedence is applied.
- Serialization is canonical JSON: UTF-8, object keys sorted lexicographically, arrays kept in-place, no whitespace changes, standard JSON escaping, and finite numbers only.
- Hash algorithm: SHA-256 (hex lowercase).
- Excludes volatile resolver artifacts (`resolution_trace`, `policy_version_ids`, timestamps) by hashing only the effective snapshot.

## Reloading effective policy

- Use `reloadEffectivePolicy({ filePath?, lastKnown? })` from `shared_libs/policy_resolution` to load an already-resolved effective snapshot from disk (default `effective_policy.json` in CWD or `EFFECTIVE_POLICY_PATH`).
- On success, returns `{ effective_policy, policy_version_ids, snapshot_hash, source_path }`.
- On read/parse failure, returns `lastKnown` (if provided) plus the error for logging, so callers can continue using the previous snapshot without crashing.
