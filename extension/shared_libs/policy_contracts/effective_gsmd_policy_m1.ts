// Read-only Effective GSMD Policy contract for Module 1 (Release Failures & Rollbacks)
// Fields-only: references and structure without embedded literals or defaults.

export type RefId = { readonly ref_id: string };
export type TemplateRef = { readonly template_ref: string };
export type BindingRef = { readonly binding_ref: string };
export type SelectorRef = { readonly selector_ref: string };
export type EvidenceRef = { readonly evidence_ref: string };
export type LinkRef = { readonly link_ref: string };
export type RuleRef = { readonly rule_ref: string };
export type SchemaRef = { readonly schema_ref: string };
export type CommandRef = { readonly command_ref: string };
export type PolicyRef = { readonly policy_ref: string };
export type VersionRef = { readonly version_ref: string };
export type ThresholdRef = { readonly threshold_ref: string };

export interface RiskDriver {
  readonly id: string;
  readonly label?: string;
  readonly enabled?: boolean;
  readonly weight_ref?: string;
  readonly weight?: number;
  readonly evidence_selector_refs?: ReadonlyArray<SelectorRef>;
  readonly message_template_refs?: ReadonlyArray<TemplateRef>;
}

export interface RiskBand {
  readonly id: string;
  readonly label?: string;
  readonly min_ref?: string;
  readonly max_ref?: string;
  readonly boundary_ref?: string;
}

export interface RiskAction {
  readonly action_id: string;
  readonly label?: string;
  readonly command_ref: CommandRef["command_ref"];
  readonly args_schema_ref?: SchemaRef["schema_ref"];
  readonly applies_when_refs?: ReadonlyArray<RuleRef>;
}

export interface RiskScoring {
  readonly drivers: ReadonlyArray<RiskDriver>;
  readonly bands: ReadonlyArray<RiskBand>;
  readonly params?: {
    readonly actions: ReadonlyArray<RiskAction>;
  };
}

export interface StageCheck {
  readonly id: string;
  readonly label?: string;
  readonly criticality?: string;
  readonly block_when_refs?: ReadonlyArray<RuleRef>;
  readonly evidence_refs?: ReadonlyArray<SelectorRef>;
}

export interface ReleasePreviewConfig {
  readonly selector_refs?: ReadonlyArray<SelectorRef>;
  readonly template_refs?: ReadonlyArray<TemplateRef>;
  readonly binding_refs?: ReadonlyArray<BindingRef>;
}

export interface ReleaseSmokesConfig {
  readonly scenario_refs?: ReadonlyArray<RefId>;
  readonly evidence_refs?: ReadonlyArray<SelectorRef>;
}

export interface ReleaseGate {
  readonly rollback_requirements?: ReadonlyArray<{
    readonly id: string;
    readonly label?: string;
    readonly required_evidence_refs?: ReadonlyArray<EvidenceRef>;
    readonly applies_when_refs?: ReadonlyArray<RuleRef>;
  }>;
  readonly mode?: "observe" | "warn" | "enforce";
  readonly severity_map?: Record<string, string>;
  readonly stage_checks: ReadonlyArray<StageCheck>;
  readonly previews?: ReleasePreviewConfig;
  readonly smokes?: ReleaseSmokesConfig;
}

export interface StagePreset {
  readonly preset_id: string;
  readonly name?: string;
  readonly stages: ReadonlyArray<{
    readonly stage_id: string;
    readonly label?: string;
    readonly promotability_rule_refs?: ReadonlyArray<RuleRef>;
  }>;
  readonly binding_ref?: BindingRef["binding_ref"];
}

export interface GuardWindow {
  readonly activation_rule_refs?: ReadonlyArray<RuleRef>;
  readonly timer_fields?: {
    readonly start_ref?: string;
    readonly duration_ref?: string;
    readonly end_ref?: string;
  };
  readonly breach_rule_refs?: ReadonlyArray<RuleRef>;
  readonly allowed_action_refs?: ReadonlyArray<RefId>;
}

export interface MetricSignalDefinition {
  readonly signal_id: string;
  readonly query_ref?: string;
  readonly link_ref?: LinkRef["link_ref"];
  readonly selector_ref?: SelectorRef["selector_ref"];
}

export interface MetricThresholdDefinition {
  readonly threshold_id: string;
  readonly signal_ref: RefId["ref_id"];
  readonly comparator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  readonly value_ref: ThresholdRef["threshold_ref"];
  readonly severity?: string;
}

export interface MetricSignalBlock {
  readonly signals: ReadonlyArray<MetricSignalDefinition>;
  readonly thresholds: ReadonlyArray<MetricThresholdDefinition>;
}

export interface ObservabilityRequirement {
  readonly correlation_template_refs?: ReadonlyArray<TemplateRef>;
  readonly evidence_link_template_refs?: ReadonlyArray<LinkRef>;
  readonly minimum_requirement_refs?: ReadonlyArray<RefId>;
  readonly evidence_templates?: ReadonlyArray<EvidenceTemplate>;
}

export interface ReceiptsPolicy {
  readonly required_fields: ReadonlyArray<string>;
  readonly timestamping_mode: "client" | "server" | "hybrid";
  readonly evidence_requirements?: {
    readonly evidence_selector_refs?: ReadonlyArray<SelectorRef>;
    readonly attachment_schema_refs?: ReadonlyArray<SchemaRef>;
    readonly required_evidence_refs?: ReadonlyArray<string>;
    readonly templates?: ReadonlyArray<EvidenceTemplate>;
  };
}

export interface EvidenceTemplate {
  readonly id: string;
  readonly label?: string;
  readonly fields?: ReadonlyArray<string>;
  readonly example_ref?: string;
}

export interface PrivacyProfileView {
  readonly masking_strategy_refs?: ReadonlyArray<RefId>;
  readonly redaction_rule_refs?: ReadonlyArray<RuleRef>;
  readonly link_template_refs?: ReadonlyArray<TemplateRef>;
}

export interface PrivacyProfile {
  readonly redaction_rules?: ReadonlyArray<RuleRef>;
  readonly developer_view?: PrivacyProfileView;
  readonly auditor_view?: PrivacyProfileView;
  readonly masking_strategy_refs?: ReadonlyArray<RefId>;
}

export interface FeatureFlagProviderCapability {
  readonly provider_id: string;
  readonly supports_kill?: boolean;
  readonly supports_metadata?: boolean;
  readonly supports_audit?: boolean;
}

export interface FeatureFlagMeta {
  readonly provider_refs?: ReadonlyArray<RefId>;
  readonly capability_matrix_refs?: ReadonlyArray<RefId>;
  readonly required_fields?: ReadonlyArray<string>;
  readonly kill_path_ref?: string;
  readonly owner_ref?: string;
  readonly sla_seconds_ref?: string;
}

export interface FeatureFlagHygiene {
  readonly stale_rule_refs?: ReadonlyArray<RuleRef>;
  readonly enforcement_mode?: "observe" | "warn" | "enforce";
}

export interface OverrideGovernance {
  readonly approver_set_refs?: ReadonlyArray<RefId>;
  readonly expiry_rule_refs?: ReadonlyArray<RuleRef>;
  readonly scope_constraint_refs?: ReadonlyArray<RuleRef>;
}

export interface ApprovalMatrixEntry {
  readonly scope_ref: RefId["ref_id"];
  readonly approver_refs: ReadonlyArray<RefId>;
  readonly escalation_rule_refs?: ReadonlyArray<RuleRef>;
}

export interface ApprovalMatrix {
  readonly entries: ReadonlyArray<ApprovalMatrixEntry>;
}

export interface SecretsDetector {
  readonly detector_id: string;
  readonly version_ref?: VersionRef["version_ref"];
  readonly confidence_threshold_ref?: ThresholdRef["threshold_ref"];
  readonly remediation_link_ref?: LinkRef["link_ref"];
}

export interface SecretsDetection {
  readonly detectors: ReadonlyArray<SecretsDetector>;
}

export interface FeatureFlagHygiene {
  readonly sla_ref?: RefId["ref_id"];
  readonly owner_ref?: BindingRef["binding_ref"];
  readonly kill_path_ref?: PolicyRef["policy_ref"];
  readonly stale_rule_refs?: ReadonlyArray<RuleRef>;
  readonly provider_capability_refs?: ReadonlyArray<RefId>;
}

export interface FeatureFlagMeta {
  readonly provider_refs?: ReadonlyArray<RefId>;
  readonly capability_matrix_refs?: ReadonlyArray<RefId>;
  readonly tagging_rule_refs?: ReadonlyArray<RuleRef>;
}

export interface ApprovalRequirement {
  readonly id: string;
  readonly approver_refs?: ReadonlyArray<RefId>;
  readonly scope_refs?: ReadonlyArray<RefId>;
  readonly dual_control?: boolean;
}

export interface BreakGlassRule {
  readonly scope_refs?: ReadonlyArray<RefId>;
  readonly expiry_rule_refs?: ReadonlyArray<RuleRef>;
  readonly post_hoc_rule_refs?: ReadonlyArray<RuleRef>;
  readonly banner_template_ref?: string;
}

export interface ActuationControl {
  readonly kill_switch_rule_refs?: ReadonlyArray<RuleRef>;
  readonly allowed_action_refs?: ReadonlyArray<RefId>;
  readonly attestation_rule_refs?: ReadonlyArray<RuleRef>;
}

export interface PreviewEnvironment {
  readonly available?: boolean;
  readonly label?: string;
  readonly preview_url_template_ref?: string;
}

export interface PreviewSmokeCheck {
  readonly id: string;
  readonly ref?: string;
  readonly enforcement_mode?: "observe" | "warn" | "enforce";
  readonly retry_rule_refs?: ReadonlyArray<RuleRef>;
  readonly rerun_allowed?: boolean;
}

export interface TestingImpactedSelection {
  readonly strategy_ref?: string;
  readonly max_duration_ref?: string;
  readonly budget_ref?: string;
  readonly fallbacks_ref?: string;
}

export interface TestingFlakyHandling {
  readonly retry_policy_ref?: string;
  readonly quarantine_policy_ref?: string;
  readonly ticketing_action_ref?: string;
}

export interface TestingDeltaCoverage {
  readonly threshold_ref?: string;
  readonly cadence_ref?: string;
  readonly scaffold_action_ref?: string;
}

export interface TestingConfig {
  readonly impacted_selection?: TestingImpactedSelection;
  readonly flaky_handling?: TestingFlakyHandling;
  readonly delta_coverage?: TestingDeltaCoverage;
}

export interface DbMigrationPolicy {
  readonly step_requirements?: ReadonlyArray<PolicyRef>;
  readonly contract_ref?: PolicyRef["policy_ref"];
  readonly expiry_rule_refs?: ReadonlyArray<RuleRef>;
  readonly grace_period_ref?: RefId["ref_id"];
}

export interface ApiCompatPolicy {
  readonly contract_test_requirement_refs?: ReadonlyArray<PolicyRef>;
  readonly expiry_rule_refs?: ReadonlyArray<RuleRef>;
  readonly grace_period_ref?: RefId["ref_id"];
}

export interface FreezeWindow {
  readonly window_id: string;
  readonly timezone?: string;
  readonly start_ref?: string;
  readonly end_ref?: string;
  readonly elevation_rule_refs?: ReadonlyArray<RuleRef>;
  readonly block_rule_refs?: ReadonlyArray<RuleRef>;
}

export interface FreezeWindowPolicy {
  readonly windows: ReadonlyArray<FreezeWindow>;
}

export interface RcaTemplateSection {
  readonly section_id: string;
  readonly label?: string;
  readonly placeholder_template_ref?: TemplateRef["template_ref"];
}

export interface RcaTemplate {
  readonly sections: ReadonlyArray<RcaTemplateSection>;
  readonly publication_link_ref?: LinkRef["link_ref"];
}

export interface NudgeProfile {
  readonly digest_cadence_ref?: RefId["ref_id"];
  readonly bundling_rule_refs?: ReadonlyArray<RuleRef>;
  readonly mmm_tagging_rule_refs?: ReadonlyArray<RuleRef>;
}

export interface RegistryBindings {
  readonly owner_ref?: BindingRef["binding_ref"];
  readonly on_call_ref?: BindingRef["binding_ref"];
  readonly runbook_link_ref?: LinkRef["link_ref"];
  readonly dashboard_link_ref?: LinkRef["link_ref"];
  readonly template_refs?: ReadonlyArray<TemplateRef>;
}

export interface EffectiveGsmdPolicyM1 {
  readonly risk_scoring: RiskScoring;
  readonly release_gate: ReleaseGate;
  readonly stage_preset: StagePreset;
  readonly guard_window: GuardWindow;
  readonly metric_signal: MetricSignalBlock;
  readonly observability_requirement: ObservabilityRequirement;
  readonly receipts_policy: ReceiptsPolicy;
  readonly privacy_profile: PrivacyProfile;
  readonly override_governance: OverrideGovernance;
  readonly approval_matrix: ApprovalMatrix;
  readonly secrets_detection: SecretsDetection;
  readonly feature_flag_hygiene: FeatureFlagHygiene;
  readonly feature_flag_provider_capabilities?: ReadonlyArray<FeatureFlagProviderCapability>;
  readonly feature_flag_meta: FeatureFlagMeta;
  readonly preview_environment?: PreviewEnvironment;
  readonly preview_smoke_checks?: ReadonlyArray<PreviewSmokeCheck>;
  readonly approval_requirements?: ReadonlyArray<ApprovalRequirement>;
  readonly break_glass_rules?: ReadonlyArray<BreakGlassRule>;
  readonly actuation_controls?: ReadonlyArray<ActuationControl>;
  readonly testing?: TestingConfig;
  readonly db_migration: DbMigrationPolicy;
  readonly api_compat: ApiCompatPolicy;
  readonly freeze_window: FreezeWindowPolicy;
  readonly rca_template: RcaTemplate;
  readonly nudge_profile: NudgeProfile;
  readonly bindings: RegistryBindings;
}
