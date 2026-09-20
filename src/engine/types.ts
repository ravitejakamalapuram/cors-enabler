/**
 * Core domain types for the CORS Engine.
 *
 * These types are 100% framework-agnostic. Nothing here imports React or
 * touches the `chrome.*` namespace, which keeps the engine reusable and unit
 * testable in a plain Node/jsdom environment.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Subset of Chrome's declarativeNetRequest ResourceType we care about. */
export type ResourceType =
  | 'main_frame'
  | 'sub_frame'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'object'
  | 'xmlhttprequest'
  | 'ping'
  | 'csp_report'
  | 'media'
  | 'websocket'
  | 'webtransport'
  | 'webbundle'
  | 'other';

export type RuleMode = 'global' | 'domain' | 'origin';

/**
 * Internal, browser-agnostic representation of a CORS rule. It is deliberately
 * close to what declarativeNetRequest can actually express (see network-adapter).
 */
export interface CorsRule {
  id: string;
  enabled: boolean;
  name: string;
  mode: RuleMode;
  /** Hostnames / host:port / wildcard patterns this rule applies to. Empty = all. */
  requestDomains?: string[];
  resourceTypes?: ResourceType[];
  /** Allowed origins. First entry is used for the ACAO header (Chrome cannot echo dynamically). */
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  exposeHeaders?: string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  allowPrivateNetwork?: boolean;
  priority?: number;
  createdAt: number;
  updatedAt: number;
}

export type CorsRuleInput = Partial<Omit<CorsRule, 'id' | 'createdAt' | 'updatedAt'>> & {
  name: string;
};

export interface CorsSettings {
  /** When true, rules emit ACAC:true and a specific origin (never `*`). */
  credentialsMode: boolean;
  /** Origin used for credentialed responses (must be specific, not `*`). */
  credentialedOrigin: string;
  /** Emit Access-Control-Allow-Private-Network:true (localhost/PNA scenarios). */
  allowPrivateNetwork: boolean;
  developerMode: boolean;
  logLevel: LogLevel;
  captureNetworkActivity: boolean;
  maxActivityEntries: number;
}

export type EngineState = 'DISABLED' | 'ENABLING' | 'ENABLED' | 'DISABLING' | 'ERROR';

export interface EngineStatus {
  state: EngineState;
  enabled: boolean;
}

export interface CorsStatus {
  state: EngineState;
  enabled: boolean;
  ruleCount: number;
  installedRuleIds: number[];
  protectedDomains: number;
  requestModification: boolean;
  responseModification: boolean;
  credentialsMode: boolean;
  developerMode: boolean;
  lastError?: EngineError | null;
}

export type ErrorCode =
  | 'RULE_INSTALL_FAILED'
  | 'RULE_LIMIT_REACHED'
  | 'INVALID_DOMAIN'
  | 'INVALID_ORIGIN'
  | 'PERMISSION_REQUIRED'
  | 'UNSUPPORTED_REQUEST'
  | 'UNSUPPORTED_CORS_CASE'
  | 'INVALID_CREDENTIALED_WILDCARD'
  | 'CHROME_API_ERROR'
  | 'INVALID_STATE_TRANSITION'
  | 'VALIDATION_FAILED'
  | 'RULE_NOT_FOUND'
  | 'UNKNOWN';

export interface EngineError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  details?: unknown;
  recoverable: boolean;
}

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface DiagnosticCheck {
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface DiagnosticRequestInput {
  url: string;
  method?: string;
  origin?: string;
  withCredentials?: boolean;
  requestHeaders?: string[];
  statusCode?: number;
  hasAcao?: boolean;
}

export interface DiagnosticResult {
  request: DiagnosticRequestInput;
  matchedRule: CorsRule | null;
  isPreflight: boolean;
  checks: DiagnosticCheck[];
  verdict: 'supported' | 'partial' | 'unsupported';
  summary: string;
  limitations: string[];
}

export interface NetworkActivityEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  type: string;
  ruleId: number;
  tabId: number;
}

export interface CorsEngineOptions {
  credentialsMode?: boolean;
  credentialedOrigin?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  origins: string[];
  domains: string[];
  credentials: boolean;
}

/** Serialisable snapshot of the extension configuration for backup/restore. */
export interface ExportedConfig {
  schema: 'cors-enabler/v1';
  exportedAt: number;
  enabled: boolean;
  rules: CorsRule[];
  settings: CorsSettings;
}

/** A single header mutation, mirrors chrome.declarativeNetRequest.ModifyHeaderInfo. */
export interface HeaderSpec {
  header: string;
  operation: 'set' | 'remove' | 'append';
  value?: string;
}

/** Result of validating a rule. */
export interface ValidationResult {
  valid: boolean;
  errors: EngineError[];
}

/** Abstraction over the Chrome networking layer so the engine is testable. */
export interface NetworkAdapter {
  sync(rules: CorsRule[], settings: CorsSettings): Promise<{ installedIds: number[] }>;
  clear(): Promise<void>;
  getInstalledIds(): Promise<number[]>;
}

/**
 * Base contract every network extension engine implements (see ARCHITECTURE.md).
 * Lifecycle methods resolve with the engine status so callers can react without
 * a second round-trip. Concrete engines may return a richer status subtype.
 */
export interface NetworkExtensionEngine {
  initialize(): Promise<void>;
  enable(): Promise<EngineStatus>;
  disable(): Promise<EngineStatus>;
  getStatus(): Promise<EngineStatus>;
  dispose(): Promise<void>;
}
