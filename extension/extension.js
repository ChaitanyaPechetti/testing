// VS Code extension entry: presentation-only surfaces driven by receipts.
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
// In packaged VSIX, shared_libs lives alongside extension.js
const { safeLog } = require("./shared_libs/logging/safe_log");

const { getLastReceiptAsync } = require("./shared_libs/receipts/receipt_reader");
const { appendReceipt } = require("./shared_libs/receipts/receipt_writer");
const { reloadEffectivePolicy } = require("./shared_libs/policy_resolution/policy_loader");
const { writeSimulationReceipt } = require("./shared_libs/receipts/write_simulation_receipt");
const { formatRiskPill } = require("./shared_libs/ui/risk_status_pill");
const { formatDiagnostics } = require("./shared_libs/ui/risk_diagnostics");
const { buildRiskCardModel } = require("./shared_libs/ui/risk_card_model");
const { buildQuickFixActions } = require("./shared_libs/ui/risk_actions");
const { buildPolicyChangelogModel } = require("./shared_libs/ui/policy_changelog_model");

function activate(context) {
  const output = vscode.window.createOutputChannel("ZeroUI");
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = "Risk: —";
  status.tooltip = "No receipts found";
  status.command = "zeroui.openZeroUI";
  status.show();

  const diagnostics = vscode.languages.createDiagnosticCollection("ZeroUI Risk");

  let latestReceipt = null;
  let lastPolicySignature = null;
  let zeroUIViewProvider = null;

  const applyPill = (pill) => {
    status.text = pill.text;
    status.tooltip = pill.tooltip;
    status.show();
    if (pill.warning) safeLog(output, { event: "pill_warning", warning: pill.warning });
  };

  const applyDiagnostics = (receipt, workspace) => {
    if (!workspace || !receipt) {
      diagnostics.clear();
      return;
    }
    const entries = formatDiagnostics(receipt);
    const uri = vscode.Uri.file(path.join(workspace.uri.fsPath, "receipts.log"));
    const vscodeDiagnostics = entries.map((entry) => {
      const diag = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0),
        entry.message,
        entry.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : entry.severity === "warning"
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information
      );
      diag.source = entry.source || "ZeroUI";
      if (entry.code) {
        diag.code = { value: entry.code, target: vscode.Uri.parse("command:zeroui.showLastReceipt") };
      }
      return diag;
    });
    diagnostics.set(uri, vscodeDiagnostics);
  };

  const maybeNotifyPolicyChange = (receipt) => {
    if (!receipt) return;
    const signature = `${receipt.snapshot_hash || ""}:${(receipt.policy_version_ids || []).join(",")}`;
    if (lastPolicySignature && lastPolicySignature === signature) return;
    if (lastPolicySignature !== null && signature !== lastPolicySignature) {
      const versionLabel =
        (receipt.policy_version_ids && receipt.policy_version_ids[receipt.policy_version_ids.length - 1]) ||
        "policy updated";
      vscode.window
        .showInformationMessage(`Policy updated: ${versionLabel}`, "Open Changelog", "Re-run checks")
        .then((choice) => {
          if (choice === "Open Changelog") {
            vscode.commands.executeCommand("zeroUI.view.main.focus");
          }
          if (choice === "Re-run checks") {
            vscode.commands.executeCommand("zeroui.precommit");
          }
        });
    }
    lastPolicySignature = signature;
  };

  const refresh = async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      applyPill(formatRiskPill(null, { reason: "no_repo" }));
      diagnostics.clear();
      if (zeroUIViewProvider) zeroUIViewProvider.update(null);
      return;
    }
    const receiptPath = path.join(workspace.uri.fsPath, "receipts.log");
    try {
      const receipt = await getLastReceiptAsync({}, receiptPath);
      latestReceipt = receipt;
      const pill = formatRiskPill(receipt);
      applyPill(pill);
      applyDiagnostics(receipt, workspace);
      maybeNotifyPolicyChange(receipt);
      if (zeroUIViewProvider) zeroUIViewProvider.update(receipt);
    } catch (err) {
      safeLog(output, { event: "receipt_error", message: "Failed to load risk receipt", detail: err.message });
      applyPill(formatRiskPill(null));
      diagnostics.clear();
      if (zeroUIViewProvider) zeroUIViewProvider.update(null);
    }
  };

  let refreshTimer = null;
  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 150);
  };

  const watcher = vscode.workspace.createFileSystemWatcher("**/receipts.log");
  watcher.onDidCreate(scheduleRefresh, null, context.subscriptions);
  watcher.onDidChange(scheduleRefresh, null, context.subscriptions);
  watcher.onDidDelete(scheduleRefresh, null, context.subscriptions);
  context.subscriptions.push(watcher);

  const refreshCommand = vscode.commands.registerCommand("zeroui.refreshRiskPill", refresh);
  const precommitCommand = vscode.commands.registerCommand("zeroui.precommit", async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      vscode.window.showErrorMessage("ZeroUI: no workspace");
      return;
    }
    const policyPath = path.join(workspace.uri.fsPath, "effective_policy.json");
    const receiptPath = path.join(workspace.uri.fsPath, "receipts.log");
    try {
      const { snapshot_hash, policy_version_ids } = reloadEffectivePolicy({ filePath: policyPath });
      appendReceipt(
        {
          receipt_id: `precommit-${Date.now()}`,
          decision_type: "risk_score",
          snapshot_hash,
          policy_version_ids,
          timestamp: new Date().toISOString(),
          // Placeholder outputs_summary; replace with real evaluator output.
          outputs_summary: { band_id: "medium", band_label: "Medium" }
        },
        receiptPath
      );
      await refresh();
      vscode.window.showInformationMessage("ZeroUI: precommit receipt written");
    } catch (err) {
      safeLog(output, { event: "precommit_error", message: err.message });
      vscode.window.showErrorMessage("ZeroUI: failed to run precommit policy");
    }
  });
  const precommitRollback = vscode.commands.registerCommand("zeroui.precommitRollback", refresh);
  const openZeroUI = vscode.commands.registerCommand("zeroui.openZeroUI", async () => {
    // Ensure the explorer is visible so the view can be focused reliably.
    await vscode.commands.executeCommand("workbench.view.explorer");
    await vscode.commands.executeCommand("zeroUI.view.main.focus");
  });
  const seedDemoReceipt = vscode.commands.registerCommand("zeroui.seedDemoReceipt", async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      vscode.window.showErrorMessage("ZeroUI: no workspace");
      return;
    }
    const receiptPath = path.join(workspace.uri.fsPath, "receipts.log");
    try {
      writeSimulationReceipt({
        policy_snapshot: {
          snapshot_hash: "demo-snapshot",
          policy_version_ids: ["demo-policy-v1"],
          timestamping_mode: "client"
        },
        evaluation: {
          mode: "shadow",
          scenario_refs: ["demo-scenario"],
          result_refs: ["demo-result"]
        },
        actor: { user: "demo" },
        filePath: receiptPath
      });
      vscode.window.showInformationMessage("ZeroUI: demo receipt appended");
      scheduleRefresh();
    } catch (err) {
      safeLog(output, { event: "seed_demo_error", message: err.message });
      vscode.window.showErrorMessage("ZeroUI: failed to write demo receipt");
    }
  });

  const showLastReceipt = vscode.commands.registerCommand("zeroui.showLastReceipt", async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      vscode.window.showErrorMessage("ZeroUI: no workspace");
      return;
    }
    const receiptPath = path.join(workspace.uri.fsPath, "receipts.log");
    try {
      await fs.promises.access(receiptPath, fs.constants.R_OK);
    } catch (_) {
      vscode.window.showErrorMessage("ZeroUI: receipts.log not found");
      return;
    }
    try {
      const doc = await vscode.workspace.openTextDocument(receiptPath);
      const editor = await vscode.window.showTextDocument(doc, { preview: true });
      const lastLine = Math.max(doc.lineCount - 1, 0);
      const pos = new vscode.Position(lastLine, 0);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtEnd);
    } catch (err) {
      vscode.window.showErrorMessage("ZeroUI: failed to open receipts.log");
      safeLog(output, { event: "show_receipt_failed", message: err.message });
    }
  });

  const healthCheck = vscode.commands.registerCommand("zeroui.healthCheck", async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      vscode.window.showErrorMessage("ZeroUI: no workspace");
      return;
    }
    const receiptPath = path.join(workspace.uri.fsPath, "receipts.log");
    const result = { event: "health_check", receipt_id: null, message: "ok", detail: null };
    try {
      await fs.promises.access(receiptPath, fs.constants.R_OK);
      result.detail = receiptPath;
    } catch (err) {
      result.message = "receipts.log not readable";
      result.detail = err.message;
    }
    safeLog(output, result);
    vscode.window.showInformationMessage("ZeroUI health check complete");
  });

  class ZeroUIViewProvider {
    constructor() {
      this.view = null;
      this.currentReceipt = null;
    }
    resolveWebviewView(webviewView) {
      this.view = webviewView;
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.onDidReceiveMessage((message) => {
        if (message?.command === "refresh") refresh();
        if (message?.command === "openReceipt") vscode.commands.executeCommand("zeroui.showLastReceipt");
        if (message?.command === "askForHelp" && this.currentReceipt) {
          const outputs = this.currentReceipt.outputs_summary || {};
          const escalation = outputs.escalation_action;
          if (escalation && escalation.command_ref) {
            vscode.commands.executeCommand("zeroui.runPolicyAction", {
              command_id: escalation.command_ref,
              args: escalation.command_args || [],
              receipt_id: this.currentReceipt.receipt_id,
              action_id: escalation.action_id
            });
          }
        }
      });
      this.update(this.currentReceipt);
    }
    update(receipt) {
      this.currentReceipt = receipt;
      if (!this.view) return;
      const model = buildRiskCardModel(receipt);
      const policyModel = buildPolicyChangelogModel(receipt);
      this.view.webview.html = renderRiskCardHtml(model, policyModel);
    }
  }

  const renderRiskCardHtml = (model, policyModel) => {
    const drivers =
      model.drivers && model.drivers.length
        ? model.drivers
            .map(
              (d) =>
                `<li><strong>${escapeHtml(d.driver_id || "driver")}</strong>${
                  d.policy_ref ? ` <span class="ref">${escapeHtml(d.policy_ref)}</span>` : ""
                }</li>`
            )
            .join("")
        : "<li>No contributing drivers</li>";
    const actions =
      model.actions && model.actions.length
        ? model.actions
            .map(
              (a) =>
                `<li>${escapeHtml(a.action_id || "action")}${
                  a.label_ref ? ` — ${escapeHtml(a.label_ref)}` : ""
                }</li>`
            )
            .join("")
        : "<li>No next steps</li>";
    const ownership = model.ownership || {};
    const ownershipList =
      Object.keys(ownership).length > 0
        ? Object.entries(ownership)
            .map(([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(String(v))}</li>`)
            .join("")
        : "<li>None</li>";
    const rollbackMissing =
      model.rollback && model.rollback.missing && model.rollback.missing.length
        ? model.rollback.missing.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
        : "<li>None</li>";
    const stageChecks =
      model.release_stages?.stage_checks && model.release_stages.stage_checks.length
        ? model.release_stages.stage_checks
            .map(
              (c) =>
                `<li>${escapeHtml(c.id || "check")}: ${escapeHtml(c.result || "n/a")}${
                  c.ref ? ` <span class="ref">${escapeHtml(c.ref)}</span>` : ""
                }</li>`
            )
            .join("")
        : "<li>None</li>";
    const guard = model.release_stages?.guard || {};
    const guardLabel = guard.label || guard.state || "unknown";
    const evidenceTemplates =
      model.evidence_builder?.templates && model.evidence_builder.templates.length
        ? model.evidence_builder.templates
            .map(
              (t) =>
                `<li><strong>${escapeHtml(t.id)}</strong>${
                  t.label ? ` — ${escapeHtml(t.label)}` : ""
                }${t.fields ? ` [${escapeHtml(t.fields.join(", "))}]` : ""}${
                  t.example_ref ? ` (e.g. ${escapeHtml(t.example_ref)})` : ""
                }</li>`
            )
            .join("")
        : "<li>None</li>";
    const missingEvidence =
      model.evidence_builder?.missing && model.evidence_builder.missing.length
        ? model.evidence_builder.missing.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
        : "<li>None</li>";
    const flagIds =
      model.flag_control?.flag_ids && model.flag_control.flag_ids.length
        ? model.flag_control.flag_ids.map((f) => `<li>${escapeHtml(String(f))}</li>`).join("")
        : "<li>None</li>";
    const missingFlagMeta =
      model.flag_control?.missing_fields && model.flag_control.missing_fields.length
        ? model.flag_control.missing_fields.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
        : "<li>None</li>";
    const capabilityViolations =
      model.flag_control?.capability_violations && model.flag_control.capability_violations.length
        ? model.flag_control.capability_violations
            .map((v) => `<li>${escapeHtml(String(v))}</li>`)
            .join("")
        : "<li>None</li>";
    const flagRollback = model.flag_rollback || {};
    const rollbackActions =
      flagRollback.action_refs && flagRollback.action_refs.length
        ? flagRollback.action_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
        : "<li>None</li>";
    const rollbackEvidence =
      flagRollback.evidence_refs && flagRollback.evidence_refs.length
        ? flagRollback.evidence_refs.map((e) => `<li>${escapeHtml(String(e))}</li>`).join("")
        : "<li>None</li>";
    const flagVersioning = model.flag_versioning || {};
    const flagVersions =
      flagVersioning.flag_versions && flagVersioning.flag_versions.length
        ? flagVersioning.flag_versions
            .map(
              (v) =>
                `<li>${escapeHtml(String(v.flag_id || "flag"))} — v:${escapeHtml(
                  String(v.version_ref || "n/a")
                )} state:${escapeHtml(String(v.state_ref || "n/a"))}</li>`
            )
            .join("")
        : "<li>None</li>";
    const versionHistory =
      flagVersioning.version_history_refs && flagVersioning.version_history_refs.length
        ? flagVersioning.version_history_refs.map((h) => `<li>${escapeHtml(String(h))}</li>`).join("")
        : "<li>None</li>";
    const compatWarnings =
      flagVersioning.compat_warnings && flagVersioning.compat_warnings.length
        ? flagVersioning.compat_warnings.map((w) => `<li>${escapeHtml(String(w))}</li>`).join("")
        : "<li>None</li>";
    const flagRollout = model.flag_rollout || {};
    const rolloutHealth =
      flagRollout.rollout_health_refs && flagRollout.rollout_health_refs.length
        ? flagRollout.rollout_health_refs.map((h) => `<li>${escapeHtml(String(h))}</li>`).join("")
        : "<li>None</li>";
    const rolloutIncidents =
      flagRollout.rollout_incident_refs && flagRollout.rollout_incident_refs.length
        ? flagRollout.rollout_incident_refs.map((h) => `<li>${escapeHtml(String(h))}</li>`).join("")
        : "<li>None</li>";
    const rolloutAudit =
      flagRollout.rollout_audit_refs && flagRollout.rollout_audit_refs.length
        ? flagRollout.rollout_audit_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
        : "<li>None</li>";
    const rolloutAlerts =
      flagRollout.alert_refs && flagRollout.alert_refs.length
        ? flagRollout.alert_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
        : "<li>None</li>";
    const healthMetrics =
      flagRollout.health_metric_refs && flagRollout.health_metric_refs.length
        ? flagRollout.health_metric_refs.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
        : "<li>None</li>";
    const incidents =
      flagRollout.incident_refs && flagRollout.incident_refs.length
        ? flagRollout.incident_refs.map((i) => `<li>${escapeHtml(String(i))}</li>`).join("")
        : "<li>None</li>";
    const flagEvidence = model.flag_evidence || {};
    const evidenceLogs =
      flagEvidence.evidence_log_refs && flagEvidence.evidence_log_refs.length
        ? flagEvidence.evidence_log_refs.map((e) => `<li>${escapeHtml(String(e))}</li>`).join("")
        : "<li>None</li>";
    const auditTrail =
      flagEvidence.audit_trail_refs && flagEvidence.audit_trail_refs.length
        ? flagEvidence.audit_trail_refs.map((e) => `<li>${escapeHtml(String(e))}</li>`).join("")
        : "<li>None</li>";
    const stateHistory =
      flagEvidence.state_history_refs && flagEvidence.state_history_refs.length
        ? flagEvidence.state_history_refs.map((s) => `<li>${escapeHtml(String(s))}</li>`).join("")
        : "<li>None</li>";
    const rollbackReasons =
      flagEvidence.rollback_reason_refs && flagEvidence.rollback_reason_refs.length
        ? flagEvidence.rollback_reason_refs.map((r) => `<li>${escapeHtml(String(r))}</li>`).join("")
        : "<li>None</li>";
    const smokeChecks =
      model.preview?.smoke_check_results && model.preview.smoke_check_results.length
        ? model.preview.smoke_check_results
            .map(
              (s) =>
                `<li>${escapeHtml(s.id || "check")}: ${escapeHtml(s.result || "n/a")}${
                  s.ref ? ` <span class="ref">${escapeHtml(s.ref)}</span>` : ""
                }${s.rerun_allowed ? " (rerun allowed)" : ""}</li>`
            )
            .join("")
        : "<li>None</li>";
    const impactedTests =
      model.impacted_tests?.selected_tests && model.impacted_tests.selected_tests.length
        ? model.impacted_tests.selected_tests.map((t) => `<li>${escapeHtml(String(t))}</li>`).join("")
        : "<li>None</li>";
    const flakyTests =
      model.flaky_handling?.flaky_tests && model.flaky_handling.flaky_tests.length
        ? model.flaky_handling.flaky_tests.map((t) => `<li>${escapeHtml(String(t))}</li>`).join("")
        : "<li>None</li>";
    const deltaCov = model.delta_coverage || {};
    const privacyIndicator = model.privacy?.redacted
      ? `Redacted (${escapeHtml(model.privacy.role || "developer")})`
      : `View: ${escapeHtml(model.privacy?.role || "developer")}`;
    const maskedFields =
      model.privacy?.masked_fields && model.privacy.masked_fields.length
        ? model.privacy.masked_fields.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
        : "<li>None</li>";
    const simulation = model.simulation || {};
    const simScenarios =
      simulation.scenario_refs && simulation.scenario_refs.length
        ? simulation.scenario_refs.map((s) => `<li>${escapeHtml(JSON.stringify(s))}</li>`).join("")
        : "<li>None</li>";
    const simResults =
      simulation.result_refs && simulation.result_refs.length
        ? simulation.result_refs.map((r) => `<li>${escapeHtml(JSON.stringify(r))}</li>`).join("")
        : "<li>None</li>";
    const simThresholds =
      simulation.threshold_suggestion_refs && simulation.threshold_suggestion_refs.length
        ? simulation.threshold_suggestion_refs.map((t) => `<li>${escapeHtml(String(t))}</li>`).join("")
        : "<li>None</li>";
    const simActions =
      simulation.action_refs && simulation.action_refs.length
        ? simulation.action_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
        : "<li>None</li>";
    const missingApprovals =
      model.approvals?.missing && model.approvals.missing.length
        ? model.approvals.missing
            .map(
              (m) =>
                `<li>${escapeHtml(m.id || "approval")}${
                  m.missing_refs ? ` — missing: ${escapeHtml(JSON.stringify(m.missing_refs))}` : ""
                }</li>`
            )
            .join("")
        : "<li>None</li>";
    const requiredApprovals =
      model.approvals?.required && model.approvals.required.length
        ? model.approvals.required
            .map(
              (r) =>
                `<li>${escapeHtml(r.id || "approval")}${
                  r.approver_refs ? ` — approvers: ${escapeHtml(JSON.stringify(r.approver_refs))}` : ""
                }</li>`
            )
            .join("")
        : "<li>None</li>";
    const breakGlassScope =
      model.break_glass?.scope_refs && model.break_glass.scope_refs.length
        ? model.break_glass.scope_refs.map((s) => `<li>${escapeHtml(JSON.stringify(s))}</li>`).join("")
        : "<li>None</li>";

    const policyVersions =
      model.evidence.policy_version_ids && model.evidence.policy_version_ids.length
        ? model.evidence.policy_version_ids.map((v) => `<li>${escapeHtml(v)}</li>`).join("")
        : "<li>None</li>";

    const changelog =
      policyModel.changelog && policyModel.changelog.length
        ? policyModel.changelog.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")
        : "<li>No changelog entries</li>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); padding: 12px; }
    .card { border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 12px; background: var(--vscode-editorWidget-background); }
    .header { font-weight: bold; margin-bottom: 8px; }
    ul { padding-left: 16px; }
    .section { margin-top: 10px; }
    button { margin-right: 6px; }
    .ref { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
    .tabs { display: flex; gap: 8px; margin-bottom: 8px; }
    .tab { cursor: pointer; padding: 4px 8px; border: 1px solid var(--vscode-input-border); border-radius: 4px; }
    .tab.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .tabcontent { display: none; }
    .tabcontent.active { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tabs">
      <div class="tab active" data-tab="risk">Risk</div>
      <div class="tab" data-tab="policy">Policy</div>
    </div>
    <div id="risk" class="tabcontent active">
      <div class="section">
        <div><strong>Privacy</strong></div>
        <div>${privacyIndicator}</div>
        <div>Masked fields:</div>
        <ul>${maskedFields}</ul>
      </div>
      <div class="header">Risk: ${escapeHtml(model.band || "—")}</div>
      <div class="section">
        <div><strong>Why</strong></div>
        <ul>${drivers}</ul>
      </div>
      <div class="section">
        <div><strong>Next steps</strong></div>
        <ul>${actions}</ul>
      </div>
      <div class="section">
        <div><strong>Shadow Results (Simulation)</strong></div>
        <div>Mode: ${escapeHtml(simulation.mode || "shadow")}</div>
        <div>Scenarios:</div>
        <ul>${simScenarios}</ul>
        <div>Hypothetical results:</div>
        <ul>${simResults}</ul>
        <div>Threshold suggestions:</div>
        <ul>${simThresholds}</ul>
        <div>Policy action refs:</div>
        <ul>${simActions}</ul>
      </div>
      <div class="section">
        <div><strong>Ownership</strong></div>
        <ul>${ownershipList}</ul>
        ${model.owner_review_required ? "<div><em>Owner review required</em></div>" : ""}
      </div>
      <div class="section">
        <div><strong>Release Stages</strong></div>
        <div>Preset: ${escapeHtml(model.release_stages?.stage_preset || "unknown")}</div>
        <div>Current: ${escapeHtml(model.release_stages?.current_stage || "unknown")}</div>
        <div>Stage Checks:</div>
        <ul>${stageChecks}</ul>
        <div>Guard: ${escapeHtml(String(guardLabel))}${
          guard.breached === true ? " (breached)" : ""
        }${guard.next_action ? ` — Next: ${escapeHtml(String(guard.next_action))}` : ""}</div>
      </div>
      <div class="section">
        <div><strong>Evidence Builder</strong></div>
        <div>Required:</div>
        <ul>${missingEvidence}</ul>
        <div>Templates:</div>
        <ul>${evidenceTemplates}</ul>
      </div>
      <div class="section">
        <div><strong>Preview</strong></div>
        <div>Label: ${escapeHtml(model.preview?.label || "unknown")}</div>
        <div>Available: ${model.preview?.available ? "Yes" : "No"}</div>
        <div>Preview link template: ${escapeHtml(model.preview?.preview_url_template_ref || "n/a")}</div>
        <div>Smoke Checks:</div>
        <ul>${smokeChecks}</ul>
      </div>
      <div class="section">
        <div><strong>Impacted Tests</strong></div>
        <div>Strategy: ${escapeHtml(model.impacted_tests?.strategy_ref || "unknown")}</div>
        <div>Budget: ${escapeHtml(model.impacted_tests?.budget_ref || "n/a")} | Max duration: ${escapeHtml(model.impacted_tests?.max_duration_ref || "n/a")}</div>
        <div>Fallbacks: ${escapeHtml(model.impacted_tests?.fallbacks_ref || "n/a")}</div>
        <div>Selected tests:</div>
        <ul>${impactedTests}</ul>
      </div>
      <div class="section">
        <div><strong>Flaky Watchlist</strong></div>
        <div>Flaky tests:</div>
        <ul>${flakyTests}</ul>
      </div>
      <div class="section">
        <div><strong>Δ-coverage</strong></div>
        <div>Value: ${deltaCov.delta_coverage ?? "n/a"}</div>
        <div>Threshold ref: ${escapeHtml(deltaCov.threshold_ref || "n/a")}</div>
        <div>Cadence ref: ${escapeHtml(deltaCov.cadence_ref || "n/a")}</div>
        <div>Scaffold action: ${escapeHtml(deltaCov.scaffold_action_ref || "n/a")}</div>
        <div>Below threshold: ${deltaCov.below_threshold ? "Yes" : "No"}</div>
      </div>
      <div class="section">
        <div><strong>Approvals</strong></div>
        <div>Decision: ${escapeHtml(model.approvals?.decision || "unknown")}</div>
        <div>Required:</div>
        <ul>${requiredApprovals}</ul>
        <div>Missing:</div>
        <ul>${missingApprovals}</ul>
      </div>
      <div class="section">
        <div><strong>Break-glass</strong></div>
        <div>Status: ${model.break_glass?.active ? "ACTIVE" : "Inactive"}${
          model.break_glass?.expiry_ref ? ` (expires ${escapeHtml(String(model.break_glass.expiry_ref))})` : ""
        }</div>
        <div>Scope refs:</div>
        <ul>${breakGlassScope}</ul>
        <div>Post-hoc refs: ${
          model.break_glass?.post_hoc_refs && model.break_glass.post_hoc_refs.length
            ? escapeHtml(JSON.stringify(model.break_glass.post_hoc_refs))
            : "None"
        }</div>
      </div>
      <div class="section">
        <div><strong>Flag Control</strong></div>
        <div>Provider: ${escapeHtml(model.flag_control?.provider_id || "unknown")}</div>
        <div>Flag IDs:</div>
        <ul>${flagIds}</ul>
        <div>Missing metadata:</div>
        <ul>${missingFlagMeta}</ul>
        <div>Provider capability violations:</div>
        <ul>${capabilityViolations}</ul>
        <div>Stale: ${model.flag_control?.is_stale ? "Yes" : "No"}</div>
        <div>Enforcement: ${escapeHtml(model.flag_control?.enforcement_mode || "observe")}</div>
      </div>
      <div class="section">
        <div><strong>Feature Flag Rollback</strong></div>
        <div>Status: ${escapeHtml(flagRollback.status || "unknown")}${flagRollback.severity ? ` (severity ${escapeHtml(flagRollback.severity)})` : ""}</div>
        <div>Rollback actions:</div>
        <ul>${rollbackActions}</ul>
        <div>Rollback evidence refs:</div>
        <ul>${rollbackEvidence}</ul>
      </div>
      <div class="section">
        <div><strong>Feature Flag Versioning</strong></div>
        <div>Current version: ${escapeHtml(flagVersioning.current_version_ref || "unknown")}</div>
        <div>Target version: ${escapeHtml(flagVersioning.target_version_ref || "n/a")}</div>
        <div>Compatibility: ${escapeHtml(flagVersioning.compat_status || "unknown")}</div>
        <div>Warnings:</div>
        <ul>${compatWarnings}</ul>
        <div>Flag versions:</div>
        <ul>${flagVersions}</ul>
        <div>Version history refs:</div>
        <ul>${versionHistory}</ul>
        <div>Rollback to version: ${escapeHtml(flagVersioning.version_rollback_ref || "n/a")}</div>
      </div>
      <div class="section">
        <div><strong>Feature Flag Rollout</strong></div>
        <div>Mode: ${escapeHtml(flagRollout.rollout_mode || "n/a")} | Phase: ${escapeHtml(flagRollout.rollout_phase || "n/a")}</div>
        <div>Percent ref: ${escapeHtml(flagRollout.rollout_percent_ref || "n/a")}</div>
        <div>Status: ${escapeHtml(flagRollout.rollout_status || "unknown")}</div>
        <div>Health refs:</div>
        <ul>${rolloutHealth}</ul>
        <div>Incident refs:</div>
        <ul>${rolloutIncidents}</ul>
        <div>Health status: ${escapeHtml(flagRollout.health_status || "unknown")}</div>
        <div>Health metric refs:</div>
        <ul>${healthMetrics}</ul>
        <div>Incidents:</div>
        <ul>${incidents}</ul>
        <div>Audit refs:</div>
        <ul>${rolloutAudit}</ul>
        <div>Pause actions:</div>
        <ul>${
          flagRollout.pause_action_refs && flagRollout.pause_action_refs.length
            ? flagRollout.pause_action_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
            : "<li>None</li>"
        }</ul>
        <div>Rollback actions:</div>
        <ul>${
          flagRollout.rollout_rollback_action_refs && flagRollout.rollout_rollback_action_refs.length
            ? flagRollout.rollout_rollback_action_refs.map((a) => `<li>${escapeHtml(String(a))}</li>`).join("")
            : "<li>None</li>"
        }</ul>
        <div>Alerts:</div>
        <ul>${rolloutAlerts}</ul>
      </div>
      <div class="section">
        <div><strong>Feature Flag Evidence & Auditing</strong></div>
        <div>Compliance status: ${escapeHtml(flagEvidence.compliance_status || "unknown")}</div>
        <div>Missing evidence refs:</div>
        <ul>${
          flagEvidence.missing_evidence_refs && flagEvidence.missing_evidence_refs.length
            ? flagEvidence.missing_evidence_refs.map((m) => `<li>${escapeHtml(String(m))}</li>`).join("")
            : "<li>None</li>"
        }</ul>
        <div>Evidence logs:</div>
        <ul>${evidenceLogs}</ul>
        <div>Audit trail refs:</div>
        <ul>${auditTrail}</ul>
        <div>State history refs:</div>
        <ul>${stateHistory}</ul>
        <div>Rollback reason refs:</div>
        <ul>${rollbackReasons}</ul>
      </div>
      <div class="section">
        <div><strong>Rollback Ready?</strong> ${escapeHtml(model.rollback?.decision || "unknown")}</div>
        <div>Missing:</div>
        <ul>${rollbackMissing}</ul>
      </div>
      <div class="section">
        <div><strong>Evidence</strong></div>
        <div>Snapshot: ${escapeHtml(model.evidence.snapshot)}</div>
        <div>Receipt: ${escapeHtml(model.evidence.receipt_id)}</div>
        <div>Policy versions:</div>
        <ul>${policyVersions}</ul>
      </div>
      <div class="section">
        <button id="refresh">Refresh</button>
        <button id="open">Open Receipt</button>
        ${model.escalation_action ? '<button id="ask">Ask for help</button>' : ""}
      </div>
    </div>
    <div id="policy" class="tabcontent">
      <div class="header">Policy</div>
      <div class="section">
        <div><strong>Phase</strong>: ${escapeHtml(policyModel.phase || "unknown")}</div>
        <div><strong>Snapshot</strong>: ${escapeHtml(policyModel.snapshot)}</div>
        <div><strong>Policy versions</strong>:</div>
        <ul>${
          policyModel.policy_version_ids && policyModel.policy_version_ids.length
            ? policyModel.policy_version_ids.map((v) => `<li>${escapeHtml(v)}</li>`).join("")
            : "<li>None</li>"
        }</ul>
      </div>
      <div class="section">
        <div><strong>Changelog</strong></div>
        <ul>${changelog}</ul>
      </div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ command: 'refresh' }));
    document.getElementById('open').addEventListener('click', () => vscode.postMessage({ command: 'openReceipt' }));
    const ask = document.getElementById('ask');
    if (ask) ask.addEventListener('click', () => vscode.postMessage({ command: 'askForHelp' }));
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tabcontent').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
  </script>
</body>
</html>`;
  };

  const escapeHtml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  zeroUIViewProvider = new ZeroUIViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("zeroUI.view.main", zeroUIViewProvider)
  );

  const runPolicyAction = vscode.commands.registerCommand("zeroui.runPolicyAction", async (payload) => {
    if (!payload || !payload.command_id) return;
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(payload.command_id)) {
      safeLog(output, {
        event: "policy_action_skipped",
        receipt_id: payload.receipt_id || null,
        message: "Unknown command",
        detail: payload.command_id
      });
      return;
    }
    safeLog(output, {
      event: "policy_action_invoked",
      receipt_id: payload.receipt_id || null,
      message: payload.command_id
    });
    await vscode.commands.executeCommand(payload.command_id, ...(payload.args || []));
  });

  const runFeatureFlagAction = vscode.commands.registerCommand(
    "zeroui.runFeatureFlagAction",
    async (payload) => {
      if (!payload || !payload.command_id) return;
      const commands = await vscode.commands.getCommands(true);
      if (!commands.includes(payload.command_id)) {
        safeLog(output, {
          event: "ff_action_skipped",
          receipt_id: payload.receipt_id || null,
          message: "Unknown command",
          detail: payload.command_id
        });
        return;
      }
      safeLog(output, {
        event: "ff_action_invoked",
        receipt_id: payload.receipt_id || null,
        message: payload.command_id
      });
      await vscode.commands.executeCommand(payload.command_id, ...(payload.args || []));
    }
  );

  const rollbackFlagAction = vscode.commands.registerCommand(
    "zeroui.rollbackFlagAction",
    async (payload) => {
      if (!payload || !payload.command_id) return;
      const commands = await vscode.commands.getCommands(true);
      if (!commands.includes(payload.command_id)) {
        safeLog(output, {
          event: "ff_rollback_skipped",
          receipt_id: payload.receipt_id || null,
          message: "Unknown command",
          detail: payload.command_id
        });
        return;
      }
      safeLog(output, {
        event: "ff_rollback_invoked",
        receipt_id: payload.receipt_id || null,
        message: payload.command_id
      });
      await vscode.commands.executeCommand(payload.command_id, ...(payload.args || []));
    }
  );

  const copyRepoFingerprint = vscode.commands.registerCommand(
    "zeroui.copyRepoFingerprint",
    async (payload) => {
      const repoId =
        (payload && payload.repo_id) || (latestReceipt && latestReceipt.inputs_summary?.repo_id) || "unknown";
      const snapshot = (payload && payload.snapshot_hash) || (latestReceipt && latestReceipt.snapshot_hash) || "";
      const short = snapshot ? snapshot.slice(0, 8) : "unknown";
      const text = `${repoId}#${short}`;
      await vscode.env.clipboard.writeText(text);
      safeLog(output, { event: "fingerprint_copied", message: text });
    }
  );

  const quickFixProvider = {
    provideCodeActions: async () => {
      if (!latestReceipt) return [];
      const actions = buildQuickFixActions(latestReceipt);
      const extra = [
        {
          action_id: "copy_fingerprint",
          title: "Copy repo fingerprint",
          command_id: "zeroui.copyRepoFingerprint",
          args: [
            {
              repo_id:
                latestReceipt.inputs_summary?.repo_id ||
                latestReceipt.provenance?.repo_id ||
                "unknown",
              snapshot_hash: latestReceipt.snapshot_hash
            }
          ]
        }
      ];
      const commands = await vscode.commands.getCommands(true);
      const all = actions.concat(extra);
      return all
        .filter((a) => commands.includes(a.command_id))
        .map((a) => {
          const codeAction = new vscode.CodeAction(a.title, vscode.CodeActionKind.QuickFix);
          codeAction.command = {
            command: a.command_id === "zeroui.copyRepoFingerprint" ? a.command_id : "zeroui.runPolicyAction",
            title: a.title,
            arguments:
              a.command_id === "zeroui.copyRepoFingerprint"
                ? a.args
                : [
                    {
                      command_id: a.command_id,
                      args: a.args,
                      receipt_id: latestReceipt.receipt_id,
                      action_id: a.action_id
                    }
                  ]
          };
          return codeAction;
        });
    }
  };

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider({ scheme: "file" }, quickFixProvider)
  );

  context.subscriptions.push(
    refreshCommand,
    precommitCommand,
    precommitRollback,
    openZeroUI,
    seedDemoReceipt,
    showLastReceipt,
    healthCheck,
    status,
    output,
    diagnostics,
    runPolicyAction,
    runFeatureFlagAction,
    copyRepoFingerprint,
    rollbackFlagAction
  );

  refresh();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
