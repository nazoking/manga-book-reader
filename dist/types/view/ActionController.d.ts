import { SpreadPages } from "../page/SpreadPages";
import { Viewer } from "./Viewer";
import { Action } from "./Action";
export declare class ActionController {
    readonly view: Viewer;
    current: SpreadPages;
    readonly keys: {
        [key: string]: string | Action.Seed;
    };
    readonly clicks: {
        [key: string]: string | Action.Seed;
    };
    readonly actions: {
        [key: string]: Action;
    };
    readonly draws: {
        [key: string]: string | Action.Seed;
    };
    private static defaultActions;
    constructor(view: Viewer, current: SpreadPages, actions?: {
        [key: string]: Action.Able;
    }, defaultActions?: (this: ActionController) => {
        [key: string]: Action.Able;
    });
    addActions(actions: {
        [key: string]: Action.Able;
    }): void;
    addAction(name: string, action: Action.Able): void;
    getAction(action: string | Action.Able): Action | undefined;
    doAction(action: string | Action.Able): void;
    setCurrent(page: Promise<SpreadPages>): Promise<void>;
}
//# sourceMappingURL=ActionController.d.ts.map