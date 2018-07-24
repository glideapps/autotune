import { Outcome, Tree } from "../common/ClientConfig";

export type BestOption = {
    option?: string;
    epsilon?: number;
};

export function lookupBestOption(ctx: { [key: string]: string | number }, outcome: Outcome | undefined): BestOption {
    if (outcome === undefined) {
        return {};
    }
    const options = outcome.options;

    function find(t: Tree): BestOption {
        if (t.best !== undefined) {
            return { option: options[t.best], epsilon: t.eps };
        }
        if (t.at === undefined || t.op === undefined || t.v === undefined) {
            return {};
        }
        let ctxV = ctx[t.at];
        if (typeof t.v === "string") {
            if (typeof ctxV !== "string") ctxV = "null";
        } else {
            if (typeof ctxV !== "number") ctxV = 0;
        }
        let result: boolean;
        switch (t.op) {
            case "lt":
                result = ctxV < t.v;
                break;
            case "eq":
                result = ctxV === t.v;
                break;
            default:
                return {};
        }
        const branch = result ? t.l : t.r;
        if (branch === undefined) return {};
        return find(branch);
    }

    return find(outcome.tree);
}
