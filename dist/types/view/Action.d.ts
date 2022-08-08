export interface Action extends Action.Seed {
    action(): void;
    isEnable: () => Promise<boolean>;
    /** generate an action that executes next If this action is disabled, */
    or(next: Action.Able): Action;
}
export declare namespace Action {
    /** action seed */
    interface Seed {
        action(): void;
        isEnable?: () => Promise<boolean>;
    }
    /** What can be an action */
    type Able = Seed | null | undefined | (() => void);
}
export declare const Action: {
    NOP: Action;
    wrap(action: Action.Able): Action;
    isEnable(action: Action.Seed): () => Promise<boolean>;
    lazy(action: () => Action): Action;
};
//# sourceMappingURL=Action.d.ts.map