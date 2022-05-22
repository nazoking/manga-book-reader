export interface Action extends Action.Seed {
    action(): void;
    isEnable: () => Promise<boolean>;
    /** この action が disabled なら next を実行する action を生成 */
    or(next: Action.Able): Action;
}
export declare module Action {
    /** 基本的な action */
    interface Seed {
        action(): void;
        isEnable?: () => Promise<boolean>;
    }
    /** action になり得るもの */
    type Able = Seed | null | undefined | (() => void);
}
export declare const Action: {
    NOP: Action;
    wrap(action: Action.Able): Action;
    isEnable(action: Action.Seed): (() => Promise<boolean>);
    lazy(action: () => Action): Action;
};
//# sourceMappingURL=Action.d.ts.map