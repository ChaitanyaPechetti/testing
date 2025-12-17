// Formats diagnostics from a risk receipt without embedding any policy logic.
// Accepts receipt fields only and provides VS Code-friendly diagnostic descriptors.
const shortHash = (hash) => (hash && hash.length >= 8 ? hash.slice(0, 8) : "unknown");

const mapSeverity = (severity) => {
  if (!severity) return "information";
  const lower = String(severity).toLowerCase();
  if (lower === "error") return "error";
  if (lower === "warning" || lower === "warn") return "warning";
  return "information";
};

const formatDiagnostics = (receipt) => {
  if (!receipt) return [];
  const outputs = receipt.outputs_summary || {};
  if (receipt.decision_type === "simulation") {
    return [
      {
        message: "Simulation results available (shadow mode)",
        severity: "information",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }
  if (receipt.decision_type === "release_gate") {
    const stageChecks = outputs.stage_checks || [];
    const failing = stageChecks.filter((c) =>
      ["fail", "failed", "block", "blocked"].includes(String(c.result || "").toLowerCase())
    );
    if (failing.length) {
      return [
        {
          message: "Stage check failed",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.guard_breached === true || outputs.guard_window?.breached === true) {
      return [
        {
          message: "Guard window breached",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (receipt.decision_type === "evidence_check") {
    if (outputs.missing_evidence && outputs.missing_evidence.length) {
      return [
        {
          message: "Evidence missing",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (receipt.decision_type === "feature_flag_gate") {
    if (outputs.missing_fields && outputs.missing_fields.length) {
      return [
        {
          message: "Feature flag metadata missing",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.capability_violations && outputs.capability_violations.length) {
      return [
        {
          message: "Flag cannot be toggled — provider capability violation",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.rollback_status && outputs.rollback_status !== "success") {
      return [
        {
          message: "Feature flag rollback required",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.compat_status && String(outputs.compat_status).toLowerCase() === "fail") {
      return [
        {
          message: "Incompatible flag state",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.rollout_status && ["blocked", "fail", "failed"].includes(String(outputs.rollout_status).toLowerCase())) {
      return [
        {
          message: "Feature flag rollout blocked",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.health_status && ["unhealthy", "at-risk", "atrisk"].includes(String(outputs.health_status).toLowerCase())) {
      return [
        {
          message: "Flag unhealthy",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.incident_status && String(outputs.incident_status).toLowerCase() !== "resolved") {
      return [
        {
          message: "Flag under investigation",
          severity: outputs.incident_severity || outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.compliance_status && String(outputs.compliance_status).toLowerCase() === "fail") {
      return [
        {
          message: "Compliance alert: missing or invalid evidence",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    if (outputs.missing_evidence_refs && outputs.missing_evidence_refs.length) {
      return [
        {
          message: "Evidence missing for feature flag",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (receipt.decision_type === "approval_gate" && outputs.missing_approvals?.length) {
    return [
      {
        message: "Missing approval",
        severity: outputs.severity || "warning",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }
  if (receipt.decision_type === "break_glass") {
    if (outputs.active) {
      return [
        {
          message: `Break-glass active${outputs.expiry_ref ? ` (expires ${outputs.expiry_ref})` : ""}`,
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (receipt.decision_type === "impacted_tests") {
    return [
      {
        message: "Impacted tests selected",
        severity: outputs.severity || "information",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }
  if (receipt.decision_type === "flaky_handling" && outputs.flaky_tests?.length) {
    return [
      {
        message: "Flaky tests handled (retry/quarantine/ticket)",
        severity: outputs.severity || "warning",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }
  if (receipt.decision_type === "delta_coverage") {
    if (outputs.below_threshold === true) {
      return [
        {
          message: "Δ-coverage below threshold",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (outputs.redacted === true) {
    return [
      {
        message: "Redaction applied by policy",
        severity: "information",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }
  if (receipt.decision_type === "preview_gate") {
    if (outputs.preview_available === false) {
      return [
        {
          message: "Preview unavailable",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
    const failing = (outputs.smoke_check_results || []).filter((r) =>
      ["fail", "failed", "block", "blocked"].includes(String(r.result || "").toLowerCase())
    );
    if (failing.length) {
      return [
        {
          message: "Smoke checks failed",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  if (receipt.decision_type === "release_gate" && Array.isArray(outputs.missing_requirements)) {
    if (outputs.missing_requirements.length) {
      return [
        {
          message: "Rollback plan missing required items",
          severity: outputs.severity || "warning",
          code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
          source: "ZeroUI"
        }
      ];
    }
  }
  const band = outputs.band_label || outputs.band_id;

  // If we have no band or drivers, emit a minimal info diagnostic.
  if (!band && !(outputs.contributing_drivers && outputs.contributing_drivers.length)) {
    return [
      {
        message: "Risk computed; details unavailable (see receipt)",
        severity: "information",
        code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
        source: "ZeroUI"
      }
    ];
  }

  const drivers = outputs.contributing_drivers || [];
  const driverSummary =
    drivers.length > 0
      ? drivers
          .map((d) => {
            const ref = d.policy_ref || d.score_ref || d.driver_id;
            return ref || "driver";
          })
          .join(", ")
      : "no drivers";

  const severity = mapSeverity(outputs.severity);

  const diags = [
    {
      message: `Risk: ${band || "Unknown"} — ${driverSummary}`,
      severity,
      code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
      source: "ZeroUI",
      snapshot: shortHash(receipt.snapshot_hash)
    }
  ];

  if (outputs.owner_review_required === true || receipt.owner_review_required === true) {
    diags.push({
      message: "Owner review required",
      severity: "warning",
      code: receipt.receipt_id || shortHash(receipt.snapshot_hash),
      source: "ZeroUI"
    });
  }

  return diags;
};

module.exports = {
  formatDiagnostics
};
