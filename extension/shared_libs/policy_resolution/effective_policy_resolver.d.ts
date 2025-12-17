export type PolicyScope = "base" | "org" | "repo" | "branch" | "actor" | "session" | string;

export interface PolicyFragment {
  scope?: PolicyScope;
  priority?: number;
  updated_at?: string;
  version_id?: string;
  source?: string;
  policy?: Record<string, any>;
}

export interface ResolutionTraceEntry {
  scope?: PolicyScope;
  priority: number;
  updated_at: string;
  version_id?: string;
  source?: string;
  applied: boolean;
}

export interface ResolutionResult {
  effective_policy: Record<string, any>;
  policy_version_ids: string[];
  snapshot_hash: string;
  resolution_trace: ResolutionTraceEntry[];
}

export const SCOPE_PRECEDENCE: Record<string, number>;
export function resolveEffectivePolicyM1(fragments?: PolicyFragment[]): ResolutionResult;
export function computeSnapshotHash(effective_policy: Record<string, any>): string;
export function canonicalStringify(value: any, path?: string): string;
