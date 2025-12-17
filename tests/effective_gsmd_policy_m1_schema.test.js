const fs = require("fs");
const path = require("path");
const assert = require("assert");

const schemaPath = path.join(
  __dirname,
  "..",
  "shared_libs",
  "policy_contracts",
  "effective_gsmd_policy_m1.schema.json"
);

const rawSchema = fs.readFileSync(schemaPath, "utf-8");
assert.ok(rawSchema && rawSchema.length > 0, "Schema file is empty");

let parsedSchema;
assert.doesNotThrow(() => {
  parsedSchema = JSON.parse(rawSchema);
}, "Schema is not valid JSON");

assert.ok(parsedSchema && typeof parsedSchema === "object", "Schema is not an object");
assert.ok(parsedSchema.$schema, "Schema is missing $schema declaration");

const serialized = JSON.stringify(parsedSchema);
assert.strictEqual(
  serialized.includes("\"default\""),
  false,
  "Schema must not contain any default fields"
);

const expectedKeys = [
  "risk_scoring",
  "release_gate",
  "stage_preset",
  "guard_window",
  "metric_signal",
  "observability_requirement",
  "receipts_policy",
  "privacy_profile",
  "override_governance",
  "approval_matrix",
  "secrets_detection",
  "feature_flag_hygiene",
  "feature_flag_meta",
  "db_migration",
  "api_compat",
  "freeze_window",
  "rca_template",
  "nudge_profile",
  "bindings"
];

expectedKeys.forEach((key) => {
  assert.ok(
    parsedSchema.properties && parsedSchema.properties[key],
    `Schema is missing top-level key: ${key}`
  );
});

console.log("effective_gsmd_policy_m1.schema.json checks passed");
