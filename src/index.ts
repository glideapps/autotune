import { Client, CompletionCallback, Outcomes } from "./Client";
import { ClientConfig } from "./common/ClientConfig";
import { BrowserEnvironment } from "./BrowserEnvironment";

const env = new BrowserEnvironment();

let client: Client | undefined;

export function initialize(appKey: string, then: () => void, outcomes?: Outcomes): void {
    if (client !== undefined) {
        env.error("autotune initialized more than once");
        return;
    }
    client = new Client(env, appKey, then, outcomes);
}

if (typeof window !== "undefined" && typeof (window as any).autotuneConfig !== "undefined") {
    const config: ClientConfig = (window as any).autotuneConfig;
    initialize(
        config.appKey,
        () => {
            return;
        },
        config.outcomes
    );
}

export function flipCoin(experimentName: string): boolean {
    if (client === undefined) {
        env.error("autotune must be initialized before calling flipCoin");
        return true;
    }
    const ex = client.experiment(experimentName, ["true", "false"]);
    return ex.pick === "true";
}

export function oneOf(experimentName: string, options: string[]): string;
export function oneOf<T>(experimentName: string, options: { [label: string]: T }): T;
export function oneOf<T>(experimentName: string, options: string[] | { [label: string]: T }): T | string {
    const optionsIsArray = Object.prototype.toString.call(options) === "[object Array]";
    let optionNames: string[];
    if (optionsIsArray) {
        optionNames = options as string[];
    } else {
        optionNames = Object.getOwnPropertyNames(options);
    }

    let pick: string;
    if (client === undefined) {
        env.error("autotune must be initialized before calling oneOf");
        pick = optionNames[0];
    } else {
        const ex = client.experiment(experimentName, optionNames);
        pick = ex.pick;
    }

    if (optionsIsArray) {
        return pick;
    } else {
        return (options as { [label: string]: T })[pick];
    }
}

export function complete(then?: CompletionCallback): void;
export function complete(score: number, then: () => CompletionCallback | undefined): void;
export function complete(scoreOrThen: number | CompletionCallback | undefined, maybeThen?: CompletionCallback): void {
    if (client === undefined) {
        env.error("autotune must be initialized before calling complete");
        return;
    }

    let score: number;
    if (typeof scoreOrThen === "number") {
        score = scoreOrThen;
    } else {
        score = 1;
    }

    let then: CompletionCallback | undefined;
    if (typeof scoreOrThen === "function") {
        then = scoreOrThen;
    } else {
        then = maybeThen;
    }

    client.completeDefaults(score, then);
}
