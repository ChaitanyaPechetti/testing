const assert = require("assert");
const { buildQuickFixActions } = require("../shared_libs/ui/risk_actions");

const run = (name, fn) => {
  fn();
  console.log(`✓ ${name}`);
};

run("quickfixes_from_receipt_actions", () => {
  const receipt = {
    outputs_summary: {
      actions: [
        { action_id: "a1", label_ref: "Run Scan", command_ref: "test.scan" },
        { action_id: "a2", command_ref: "test.other" }
      ]
    }
  };
  const actions = buildQuickFixActions(receipt);
  assert.strictEqual(actions.length, 2);
  assert.strictEqual(actions[0].title, "Run Scan");
  assert.strictEqual(actions[1].title, "a2");
});

run("no_actions_when_receipt_empty", () => {
  const actions = buildQuickFixActions({});
  assert.strictEqual(actions.length, 0);
});

run("skips_unknown_command_ids", () => {
  const receipt = {
    outputs_summary: {
      actions: [{ action_id: "a1" }]
    }
  };
  const actions = buildQuickFixActions(receipt);
  assert.strictEqual(actions.length, 0);
});
