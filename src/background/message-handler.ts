import type { CorsEngine } from '@/engine/cors-engine';
import type { ExtensionMessage, MessageEnvelope } from '@/shared/messages';
import type { EngineError } from '@/engine/types';

function toError(e: unknown): EngineError {
  if (e && typeof e === 'object' && 'code' in e && 'userMessage' in e) return e as EngineError;
  return {
    code: 'UNKNOWN',
    message: String(e),
    userMessage: 'An unexpected error occurred in the CORS engine.',
    details: e,
    recoverable: true,
  };
}

/**
 * Routes a typed message to the engine and wraps the result in an envelope.
 * All engine access from the UI funnels through here (spec §24) — the UI never
 * touches chrome.declarativeNetRequest directly.
 */
export async function handleMessage(
  engine: CorsEngine,
  message: ExtensionMessage,
): Promise<MessageEnvelope<unknown>> {
  try {
    const data = await dispatch(engine, message);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

async function dispatch(engine: CorsEngine, message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'CORS_ENABLE':
      return engine.enable(message.payload);
    case 'CORS_DISABLE':
      return engine.disable();
    case 'CORS_STATUS':
      return engine.getStatus();
    case 'CORS_GET_RULES':
      return engine.getRules();
    case 'CORS_ADD_RULE':
      return engine.addRule(message.payload);
    case 'CORS_UPDATE_RULE':
      return engine.updateRule(message.payload.id, message.payload.rule);
    case 'CORS_REMOVE_RULE':
      return engine.removeRule(message.payload.id);
    case 'CORS_DUPLICATE_RULE':
      return engine.duplicateRule(message.payload.id);
    case 'CORS_TOGGLE_RULE':
      return engine.toggleRule(message.payload.id, message.payload.enabled);
    case 'CORS_CLEAR_RULES':
      return engine.clearRules();
    case 'CORS_APPLY_PRESET':
      return engine.applyPreset(message.payload.presetId);
    case 'CORS_GET_SETTINGS':
      return engine.getSettings();
    case 'CORS_UPDATE_SETTINGS':
      return engine.updateSettings(message.payload);
    case 'CORS_DIAGNOSE':
      return engine.diagnose(message.payload);
    case 'CORS_NETWORK_ACTIVITY':
      return engine.getActivity();
    case 'CORS_CLEAR_ACTIVITY':
      return engine.clearActivity();
    default: {
      const exhaustive: never = message;
      throw {
        code: 'UNSUPPORTED_REQUEST',
        message: `Unknown message: ${JSON.stringify(exhaustive)}`,
        userMessage: 'The extension received an unsupported command.',
        recoverable: true,
      };
    }
  }
}
