import type {
  CorsRule,
  CorsRuleInput,
  CorsSettings,
  CorsStatus,
  DiagnosticRequestInput,
  DiagnosticResult,
  EngineError,
  NetworkActivityEntry,
} from '@/engine/types';

/**
 * Typed messaging contract between the UI (popup/options) and the service
 * worker. Every message has an explicit type and payload — no untyped
 * `{ action: 'something' }` blobs (spec §24).
 */
export type ExtensionMessage =
  | { type: 'CORS_ENABLE'; payload?: { credentialsMode?: boolean; credentialedOrigin?: string } }
  | { type: 'CORS_DISABLE' }
  | { type: 'CORS_STATUS' }
  | { type: 'CORS_GET_RULES' }
  | { type: 'CORS_ADD_RULE'; payload: CorsRuleInput }
  | { type: 'CORS_UPDATE_RULE'; payload: { id: string; rule: Partial<CorsRuleInput> } }
  | { type: 'CORS_REMOVE_RULE'; payload: { id: string } }
  | { type: 'CORS_DUPLICATE_RULE'; payload: { id: string } }
  | { type: 'CORS_TOGGLE_RULE'; payload: { id: string; enabled: boolean } }
  | { type: 'CORS_CLEAR_RULES' }
  | { type: 'CORS_APPLY_PRESET'; payload: { presetId: string } }
  | { type: 'CORS_GET_SETTINGS' }
  | { type: 'CORS_UPDATE_SETTINGS'; payload: Partial<CorsSettings> }
  | { type: 'CORS_DIAGNOSE'; payload: DiagnosticRequestInput }
  | { type: 'CORS_NETWORK_ACTIVITY' }
  | { type: 'CORS_CLEAR_ACTIVITY' };

export type MessageResult<T extends ExtensionMessage['type']> = {
  CORS_ENABLE: CorsStatus;
  CORS_DISABLE: CorsStatus;
  CORS_STATUS: CorsStatus;
  CORS_GET_RULES: CorsRule[];
  CORS_ADD_RULE: { id: string; rules: CorsRule[] };
  CORS_UPDATE_RULE: CorsRule[];
  CORS_REMOVE_RULE: CorsRule[];
  CORS_DUPLICATE_RULE: CorsRule[];
  CORS_TOGGLE_RULE: CorsRule[];
  CORS_CLEAR_RULES: CorsRule[];
  CORS_APPLY_PRESET: CorsRule[];
  CORS_GET_SETTINGS: CorsSettings;
  CORS_UPDATE_SETTINGS: CorsSettings;
  CORS_DIAGNOSE: DiagnosticResult;
  CORS_NETWORK_ACTIVITY: NetworkActivityEntry[];
  CORS_CLEAR_ACTIVITY: NetworkActivityEntry[];
}[T];

export interface MessageEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: EngineError;
}

/** Send a typed message to the service worker and unwrap the response. */
export async function sendMessage<M extends ExtensionMessage>(
  message: M,
): Promise<MessageResult<M['type']>> {
  const res = (await chrome.runtime.sendMessage(message)) as MessageEnvelope<
    MessageResult<M['type']>
  >;
  if (!res || !res.ok) {
    throw (
      res?.error ?? {
        code: 'UNKNOWN',
        message: 'No response from service worker',
        userMessage:
          'The extension background service did not respond. Try reloading the extension.',
        recoverable: true,
      }
    );
  }
  return res.data as MessageResult<M['type']>;
}

/** Runtime guard used by the service worker to validate inbound messages. */
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}
