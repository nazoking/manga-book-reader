export interface Action extends Action.Seed {
  action(): void;
  isEnable: () => Promise<boolean>;
  /** generate an action that executes next If this action is disabled, */
  or(next: Action.Able): Action;
}
export module Action{
  /** action seed */
  export interface Seed {
    action(): void;
    isEnable?: () => Promise<boolean>;
  }
  /** What can be an action */
  export type Able = Seed | null | undefined | (() => void);
}
class Wrapper implements Action {
  constructor(private readonly internal: Action.Seed) {
    this.isEnable = Action.isEnable(internal);
  }
  isEnable: () => Promise<boolean>;
  async action() {
    if (await this.isEnable()) {
      this.internal.action();
    }
  }
  or(other: Action.Able) : Action{
    if (!other) return this;
    const a1 = Action.wrap(other);
    return new Wrapper({
      action: async () => {
        if (await this.isEnable()) return this.action();
        if (await a1.isEnable()) return a1.action();
        return false;
      },
      isEnable: async () => {
        return (await this.isEnable()) || (await a1.isEnable());
      },
    });
  }
}
export const Action = {
  NOP: undefined as any as Action,
  wrap(action: Action.Able): Action {
    if (!action) return Action.NOP;
    if (action instanceof Wrapper) return action;
    if (typeof action == "function")
      return new Wrapper({ action: () => action() });
    return new Wrapper(action);
  },
  isEnable(action: Action.Seed): (() => Promise<boolean>){
    return ("isEnable" in action) ? (() => action.isEnable!()) : (async () => true)
  },
  lazy(action: () => Action): Action{
    return new Wrapper({
      action: () => action().action(),
      isEnable: () => Action.isEnable(action())(),
    });
  }
};
Action.NOP = new Wrapper({ action: () => {} });
