import type { EngineState } from '@/engine/types';

export type StateEvent = 'ENABLE' | 'DISABLE' | 'SUCCESS' | 'FAILURE' | 'RESET';

/**
 * Pure transition function for the engine state machine (spec §25). Returns the
 * next state, or `null` if the transition is invalid. Kept pure so the
 * transition table can be exhaustively unit tested.
 *
 *   DISABLED --ENABLE--> ENABLING --SUCCESS--> ENABLED
 *                                 --FAILURE--> ERROR
 *   ENABLED  --DISABLE-> DISABLING --SUCCESS-> DISABLED
 *                                  --FAILURE-> ERROR
 *   ERROR    --ENABLE--> ENABLING / --DISABLE--> DISABLING / --RESET--> DISABLED
 */
export function nextState(current: EngineState, event: StateEvent): EngineState | null {
  switch (current) {
    case 'DISABLED':
      if (event === 'ENABLE') return 'ENABLING';
      if (event === 'DISABLE') return 'DISABLED'; // idempotent
      return null;
    case 'ENABLING':
      if (event === 'SUCCESS') return 'ENABLED';
      if (event === 'FAILURE') return 'ERROR';
      return null;
    case 'ENABLED':
      if (event === 'DISABLE') return 'DISABLING';
      if (event === 'ENABLE') return 'ENABLED'; // idempotent
      return null;
    case 'DISABLING':
      if (event === 'SUCCESS') return 'DISABLED';
      if (event === 'FAILURE') return 'ERROR';
      return null;
    case 'ERROR':
      if (event === 'ENABLE') return 'ENABLING';
      if (event === 'DISABLE') return 'DISABLING';
      if (event === 'RESET') return 'DISABLED';
      return null;
    default:
      return null;
  }
}

/** Stateful wrapper that persists transitions via an injected callback. */
export class StateMachine {
  private state: EngineState;

  constructor(
    initial: EngineState = 'DISABLED',
    private readonly onChange?: (state: EngineState) => void,
  ) {
    this.state = initial;
  }

  get current(): EngineState {
    return this.state;
  }

  /** Attempt a transition. Returns true if it was applied. */
  dispatch(event: StateEvent): boolean {
    const next = nextState(this.state, event);
    if (next === null) return false;
    if (next !== this.state) {
      this.state = next;
      this.onChange?.(next);
    }
    return true;
  }

  set(state: EngineState): void {
    if (state !== this.state) {
      this.state = state;
      this.onChange?.(state);
    }
  }
}
