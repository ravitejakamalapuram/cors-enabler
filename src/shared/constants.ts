import type { CorsSettings, ResourceType } from '@/engine/types';

/** chrome.storage.local keys. */
export const STORAGE_KEYS = {
  enabled: 'cors_enabled',
  rules: 'cors_rules',
  settings: 'cors_settings',
  state: 'cors_state',
  lastError: 'cors_last_error',
} as const;

/**
 * Dynamic rule id range reserved for this extension. declarativeNetRequest
 * dynamic rule ids must be positive integers; keeping them in a known range
 * lets us deterministically clear only our own rules.
 */
export const DNR_RULE_ID_BASE = 1000;
export const DNR_RULE_ID_MAX = 60000;

/** Chrome's documented limit for "unsafe" (modifyHeaders) dynamic rules. */
export const DNR_UNSAFE_RULE_LIMIT = 5000;

export const CORS_HEADERS = {
  allowOrigin: 'Access-Control-Allow-Origin',
  allowMethods: 'Access-Control-Allow-Methods',
  allowHeaders: 'Access-Control-Allow-Headers',
  allowCredentials: 'Access-Control-Allow-Credentials',
  exposeHeaders: 'Access-Control-Expose-Headers',
  maxAge: 'Access-Control-Max-Age',
  allowPrivateNetwork: 'Access-Control-Allow-Private-Network',
} as const;

export const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export const DEFAULT_ALLOW_HEADERS = [
  'Authorization',
  'Content-Type',
  'Accept',
  'Origin',
  'X-Requested-With',
  'X-CSRF-Token',
  'X-Api-Key',
];

export const DEFAULT_RESOURCE_TYPES: ResourceType[] = ['xmlhttprequest'];

/** Common local development origins auto-covered by presets. */
export const COMMON_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:4200',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

export const DEFAULT_SETTINGS: CorsSettings = {
  credentialsMode: false,
  credentialedOrigin: 'http://localhost:3000',
  allowPrivateNetwork: true,
  developerMode: false,
  logLevel: 'info',
  captureNetworkActivity: true,
  maxActivityEntries: 200,
};

export const GLOBAL_RULE_ID = 'global-cors';
