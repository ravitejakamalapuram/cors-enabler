import { COMMON_DEV_ORIGINS } from '@/shared/constants';
import type { CorsRuleInput, Preset } from '@/engine/types';

/**
 * Presets are pure data → they produce CorsRuleInput objects. They never touch
 * the networking engine directly (spec §18).
 */
export const PRESETS: Preset[] = [
  {
    id: 'local-development',
    name: 'Local Development',
    description: 'Broad localhost coverage for any dev server on any port.',
    origins: COMMON_DEV_ORIGINS,
    domains: ['localhost', '127.0.0.1'],
    credentials: false,
  },
  {
    id: 'react-vite',
    name: 'React / Vite',
    description: 'Vite dev server (5173) talking to a local API on 3000/8080.',
    origins: ['http://localhost:5173'],
    domains: ['localhost:3000', 'localhost:8080'],
    credentials: false,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Next.js dev server on 3000 with an API on 8080.',
    origins: ['http://localhost:3000'],
    domains: ['localhost:8080', 'localhost:4000'],
    credentials: false,
  },
  {
    id: 'angular',
    name: 'Angular',
    description: 'Angular CLI dev server on 4200.',
    origins: ['http://localhost:4200'],
    domains: ['localhost:3000', 'localhost:8080'],
    credentials: false,
  },
  {
    id: 'localhost-credentials',
    name: 'localhost (with cookies)',
    description: 'Credentialed requests from localhost:3000 (uses a specific origin).',
    origins: ['http://localhost:3000'],
    domains: ['localhost:8080'],
    credentials: true,
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Turn a preset into a rule input the engine can persist. */
export function presetToRuleInput(preset: Preset): CorsRuleInput {
  return {
    name: preset.name,
    enabled: true,
    mode: 'domain',
    requestDomains: preset.domains,
    allowedOrigins: preset.origins,
    allowCredentials: preset.credentials,
    resourceTypes: ['xmlhttprequest'],
    priority: 2,
  };
}
