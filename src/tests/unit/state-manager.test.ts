import { describe, it, expect } from 'vitest';
import { nextState, StateMachine } from '@/engine/state-manager';
import type { EngineState } from '@/engine/types';

describe('nextState transition table', () => {
  it('DISABLED --ENABLE--> ENABLING', () => {
    expect(nextState('DISABLED', 'ENABLE')).toBe('ENABLING');
  });
  it('ENABLING --SUCCESS--> ENABLED, --FAILURE--> ERROR', () => {
    expect(nextState('ENABLING', 'SUCCESS')).toBe('ENABLED');
    expect(nextState('ENABLING', 'FAILURE')).toBe('ERROR');
  });
  it('ENABLED --DISABLE--> DISABLING', () => {
    expect(nextState('ENABLED', 'DISABLE')).toBe('DISABLING');
  });
  it('DISABLING --SUCCESS--> DISABLED, --FAILURE--> ERROR', () => {
    expect(nextState('DISABLING', 'SUCCESS')).toBe('DISABLED');
    expect(nextState('DISABLING', 'FAILURE')).toBe('ERROR');
  });
  it('ERROR can recover via ENABLE / DISABLE / RESET', () => {
    expect(nextState('ERROR', 'ENABLE')).toBe('ENABLING');
    expect(nextState('ERROR', 'DISABLE')).toBe('DISABLING');
    expect(nextState('ERROR', 'RESET')).toBe('DISABLED');
  });
  it('is idempotent for redundant events', () => {
    expect(nextState('DISABLED', 'DISABLE')).toBe('DISABLED');
    expect(nextState('ENABLED', 'ENABLE')).toBe('ENABLED');
  });
  it('rejects invalid transitions', () => {
    expect(nextState('DISABLED', 'SUCCESS')).toBeNull();
    expect(nextState('ENABLED', 'SUCCESS')).toBeNull();
    expect(nextState('ENABLING', 'ENABLE')).toBeNull();
  });
});

describe('StateMachine', () => {
  it('applies valid transitions and notifies onChange', () => {
    const seen: EngineState[] = [];
    const sm = new StateMachine('DISABLED', (s) => seen.push(s));
    expect(sm.dispatch('ENABLE')).toBe(true);
    expect(sm.current).toBe('ENABLING');
    expect(sm.dispatch('SUCCESS')).toBe(true);
    expect(sm.current).toBe('ENABLED');
    expect(seen).toEqual(['ENABLING', 'ENABLED']);
  });

  it('ignores invalid transitions', () => {
    const sm = new StateMachine('DISABLED');
    expect(sm.dispatch('SUCCESS')).toBe(false);
    expect(sm.current).toBe('DISABLED');
  });

  it('handles enable → disable → enable without corruption', () => {
    const sm = new StateMachine('DISABLED');
    sm.dispatch('ENABLE');
    sm.dispatch('SUCCESS'); // ENABLED
    sm.dispatch('DISABLE');
    sm.dispatch('SUCCESS'); // DISABLED
    sm.dispatch('ENABLE');
    sm.dispatch('SUCCESS'); // ENABLED
    expect(sm.current).toBe('ENABLED');
  });
});
