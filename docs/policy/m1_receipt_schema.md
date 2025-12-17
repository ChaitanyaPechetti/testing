# Module 1 Receipt Schema

This schema describes receipts emitted for Module 1 decisions. It is additive and does not change any existing required fields (none existed previously).

## Top-level fields

- `snapshot_hash` (required): SHA-256 hex of the effective policy snapshot; pattern `^[a-f0-9]{64}$`.
- `timestamping_mode` (required): `client` | `server` | `hybrid` (future-friendly alphanumeric).
- `policy_version_ids` (required): ordered, unique list of contributing policy version IDs (lowest → highest precedence).
- `decision_type` (required): one of `risk_score`, `release_gate`, `stage_check`, `observability_gate`, `secrets_scan`, `override`, `freeze_check`, `impacted_tests`, `flaky_handling`, `coverage_delta`, `flag_hygiene`, `db_migration_check`, `api_compat_check`, `rca_draft`, `nudge_digest`.
- `actor` / `provenance` (optional): IDs for principal/repo/branch/session plus resolver metadata.
- `inputs_summary` / `outputs_summary` (optional): policy-driven metadata only; no raw logs or PII.
- `evidence_refs` (optional): references only (`kind`, `uri_or_id`, optional label/template_ref); no embedded evidence bodies.
- `error` (optional): `code`, `message_ref`, `policy_ref`, `details` metadata.
- `redaction_applied` / `evidence_visibility` (optional): indicate masking state without embedding sensitive payload.

## Privacy

- Evidence is link/ID only; schema disallows arbitrary extra fields within evidence refs.
- Redaction flags allow auditors to understand masking without including raw content.

## Location

- Schema file: `shared_libs/policy_contracts/m1_receipt.schema.json`.
- Tests: `tests/m1_receipt_schema.test.js` validate JSON, absence of defaults, and basic fixtures.
