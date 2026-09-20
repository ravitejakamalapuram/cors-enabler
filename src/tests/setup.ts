// Minimal chrome stub so any accidental module-level reference doesn't crash
// the pure-engine unit tests. Individual tests inject their own mocks.
import { vi } from 'vitest';

const stub = {
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  declarativeNetRequest: {
    getDynamicRules: vi.fn().mockResolvedValue([]),
    updateDynamicRules: vi.fn().mockResolvedValue(undefined),
  },
  runtime: { sendMessage: vi.fn() },
};

(globalThis as unknown as { chrome: unknown }).chrome ??= stub;
