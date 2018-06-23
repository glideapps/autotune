import { CompleteExperimentsRequest, outcomesUrl, ClientContext } from "./common/ClientAPI";
import { ClientConfig, Outcome, Tree } from "./common/ClientConfig";

import { startHTMLExperiments } from "./html";

import { Convert, SerializedState } from "./common/models";

import {
    http,
    uuidv4,
    log,
    error,
    mapObject,
    getOwnPropertyValues,
    getLocalLanguage,
    getTimeZoneOffset,
    debounce
} from "./util";

export type Outcomes = { [experimentKey: string]: Outcome };

let clientContext: ClientContext | undefined;
function getClientContext(): ClientContext {
    if (clientContext === undefined) {
        clientContext = { tzo: getTimeZoneOffset() };
        const lang = getLocalLanguage();
        if (lang !== undefined) {
            clientContext.lang = lang;
        }
    }
    return clientContext;
}

const SESSION_EXPIRES_AFTER = 24 /* hours */ * (60 * 60 * 1000) /* milliseconds/ hour */;

function api(path: string) {
    return `https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/${path}`;
}

const defaultSerializedState: SerializedState = {
    lastInitialized: 0,
    experimentPicks: {}
};

export class ExperimentOptions {
    constructor(
        readonly optionNames: string[],
        readonly bestOption: string | undefined = undefined,
        readonly epsilon: number = 1
    ) {}
}

const state: {
    appKey: string;
    serialized: SerializedState;
    experimentOptions: { [name: string]: ExperimentOptions };
    experiments: { [name: string]: Experiment };
    defaultCompletions: { [name: string]: Experiment };
    queuedCompletedExperiments: { [name: string]: Experiment };
    queuedStartedExperiments: { [name: string]: Experiment };
} = {
    appKey: "",
    experiments: {},
    experimentOptions: {},
    defaultCompletions: {},
    queuedCompletedExperiments: {},
    queuedStartedExperiments: {},
    serialized: defaultSerializedState
};

const serializeStateDebounced = debounce(() => {
    log("Writing state", state.serialized);
    try {
        localStorage[storageKey("state")] = Convert.serializedStateToJson(state.serialized);
    } catch (e) {
        error("Could not save state:", e.message);
    }
}, 100);

function startExperiment(theExperiment: Experiment): void {
    state.queuedStartedExperiments[theExperiment.name] = theExperiment;
    startExperimentsDebounced();
}

const startExperimentsDebounced = debounce(() => {
    let experiments = mapObject(state.queuedStartedExperiments, e => ({
        instanceKey: e.key,
        options: e.options,
        pick: e.pick,
        pickedBest: e.pickedBest
    }));

    log("Starting experiments", experiments);

    state.queuedStartedExperiments = {};

    http(
        "POST",
        api("/startExperiments"),
        {
            version: 2,
            appKey: state.appKey,
            experiments,
            ctx: getClientContext()
        },
        () => {
            return;
        },
        e => error("Failed to start experiments", e)
    );
}, 100);

function completeExperiment(theExperiment: Experiment, then: CompletionCallback | undefined): void {
    state.queuedCompletedExperiments[theExperiment.name] = theExperiment;
    completeExperimentsDebounced(then);
}

const completeExperimentsDebounced = debounce((then: CompletionCallback | undefined) => {
    const experiments = getOwnPropertyValues(state.queuedCompletedExperiments);

    state.queuedCompletedExperiments = {};

    const experimentsByKey: CompleteExperimentsRequest["experiments"] = {};
    for (const e of experiments) {
        if (e.payoff !== undefined) {
            experimentsByKey[e.key] = { pick: e.pick, payoff: e.payoff };
        }
    }

    log("Completing experiments", experimentsByKey);

    function callThen() {
        if (then !== undefined) {
            then();
        }
    }

    http(
        "POST",
        api("/completeExperiments"),
        {
            version: 1,
            appKey: state.appKey,
            experiments: experimentsByKey
        },
        () => callThen(),
        e => {
            error("Failed to complete experiments", e);
            callThen();
        }
    );
}, 10);

type BestOption = {
    option?: string;
    epsilon?: number;
};

function lookupBestOption(outcome: Outcome | undefined): BestOption {
    if (outcome === undefined) {
        return {};
    }
    const options = outcome.options;

    const ctx = getClientContext();

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

function finishInit(outcomes: Outcomes): void {
    try {
        Object.getOwnPropertyNames(outcomes).forEach(name => {
            // If there are already options there, the experiment is already running,
            // so don't overwrite them.
            if (state.experimentOptions[name] !== undefined) return;

            const { option, epsilon } = lookupBestOption(outcomes[name]);
            state.experimentOptions[name] = new ExperimentOptions(outcomes[name].options, option, epsilon);
        });

        startHTMLExperiments();
    } catch (e) {
        error("Couldn't finish init", e);
    }
}

export function initialize(appKey: string, then: () => void, outcomes?: Outcomes): void {
    if (state.appKey !== "") {
        log("Initialized more than once");
        return;
    }

    log("Initialize", appKey);
    state.appKey = appKey;

    try {
        state.serialized = Convert.toSerializedState(localStorage[storageKey("state")]);
    } catch (e) {
        state.serialized = defaultSerializedState;
    }

    const now = new Date().getTime();
    const beginNewSession = now - state.serialized.lastInitialized > SESSION_EXPIRES_AFTER;

    if (beginNewSession) {
        log("Starting a new session");
        state.serialized.experimentPicks = {};
    }

    state.serialized.lastInitialized = now;
    serializeStateDebounced();

    if (outcomes !== undefined) {
        finishInit(outcomes);
        return;
    }

    http(
        "GET",
        outcomesUrl(appKey),
        undefined,
        o => {
            log("Got outcomes", o);
            finishInit(o);
            then();
        },
        e => {
            error("Could not get outcomes", e);
            finishInit({});
            then();
        }
    );
}

function experiment(name: string, optionNames: string[]): Experiment {
    let ex = state.experiments[name];
    if (ex !== undefined) return ex;
    let options = state.experimentOptions[name];
    if (options === undefined) {
        options = state.experimentOptions[name] = new ExperimentOptions(optionNames);
    }
    ex = state.experiments[name] = new Experiment(name, options);
    return ex;
}

function storageKey(path: string): string {
    return `autotune.v1.${state.appKey}.${path}`;
}

export class Experiment {
    private static loadPick(name: string): string | undefined {
        return state.serialized.experimentPicks[name];
    }

    private static savePick(name: string, pick: string) {
        state.serialized.experimentPicks[name] = pick;
        serializeStateDebounced();
    }

    readonly key: string;

    readonly pick: string;
    readonly pickedBest: boolean;

    payoff?: number;

    constructor(readonly name: string, readonly options: ExperimentOptions) {
        this.key = uuidv4();

        const { optionNames, bestOption } = this.options;

        const savedPick = Experiment.loadPick(this.name);
        if (savedPick !== undefined && optionNames.indexOf(savedPick) !== -1) {
            this.pick = savedPick;
            this.pickedBest = savedPick === bestOption;
        } else {
            const pickRandom =
                bestOption === undefined ||
                // The best option may have been removed from the option set
                optionNames.indexOf(bestOption) === -1 ||
                Math.random() < this.options.epsilon;

            let pick: string;
            if (pickRandom || bestOption === undefined) {
                pick = optionNames[Math.floor(Math.random() * optionNames.length)];
            } else {
                pick = bestOption;
            }

            Experiment.savePick(this.name, pick);
            this.pick = pick;
            this.pickedBest = !pickRandom;
        }
        startExperiment(this);
    }

    complete(payoff: number = 1, then: CompletionCallback | undefined) {
        this.payoff = payoff;
        completeExperiment(this, then);
    }
}

export function flipCoin(experimentName: string): boolean {
    const ex = experiment(experimentName, ["true", "false"]);
    state.defaultCompletions[experimentName] = ex;
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

    const ex = experiment(experimentName, optionNames);
    state.defaultCompletions[experimentName] = ex;

    const pick = ex.pick;

    if (optionsIsArray) {
        return pick;
    } else {
        return (options as { [label: string]: T })[pick];
    }
}

export type CompletionCallback = () => void;

export function complete(then?: CompletionCallback): void;
export function complete(score: number, then: () => CompletionCallback | undefined): void;
export function complete(scoreOrThen: number | CompletionCallback | undefined, maybeThen?: CompletionCallback): void {
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

    const completions = state.defaultCompletions;
    Object.getOwnPropertyNames(completions).forEach(name => completions[name].complete(score, then));
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
