import { CompleteExperimentsRequest, outcomesUrl, ClientContext, StartExperimentsRequest } from "./common/ClientAPI";
import { Outcome } from "./common/ClientConfig";

import { Convert, SerializedState } from "./common/models";

import { Environment } from "./Environment";

import { uuidv4, mapObject, getOwnPropertyValues } from "./util";
import { debounce } from "./debounce";
import { lookupBestOption } from "./DecisionTree";

export type Outcomes = { [experimentKey: string]: Outcome };

const SESSION_EXPIRES_AFTER = 24 /* hours */ * (60 * 60 * 1000) /* milliseconds/ hour */;

export function apiURL(path: string) {
    return `https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/${path}`;
}

export class ExperimentOptions {
    constructor(readonly bestOption: string | undefined = undefined, readonly epsilon: number = 1) {}
}

export type CompletionCallback = () => void;

export class Client {
    private serialized: SerializedState;
    private readonly experimentOptions: { [name: string]: ExperimentOptions } = {};
    private readonly experiments: { [name: string]: Experiment } = {};
    private readonly defaultCompletions: { [name: string]: Experiment } = {};
    private queuedCompletedExperiments: { [name: string]: Experiment } = {};
    private queuedStartedExperiments: { [name: string]: Experiment } = {};

    // The Client was preinitialized if outcomes were available ahead of time.
    // For example, when outcomes are loaded with the client. We want to know this
    // because we do some extra magic when preinitialized, like starting HTML
    // experiments and autocompletion.
    private preinitialized: boolean = false;

    constructor(
        private readonly environment: Environment,
        private readonly appKey: string,
        then: (c: Client) => void,
        outcomes?: Outcomes
    ) {
        this.log("Initialize", appKey);

        this.preinitialized = outcomes !== undefined;

        this.serialized = {
            lastInitialized: 0,
            experimentPicks: {}
        };

        try {
            const stateString = environment.getLocalStorage(this.storageKey("state"));
            if (stateString !== undefined) {
                this.serialized = Convert.toSerializedState(stateString);
            }
        } catch {}

        const now = new Date().getTime();
        const beginNewSession = now - this.serialized.lastInitialized > SESSION_EXPIRES_AFTER;

        if (beginNewSession) {
            this.log("Starting a new session");
            this.serialized.experimentPicks = {};
        }

        this.serialized.lastInitialized = now;
        this.serializeStateDebounced();

        if (outcomes !== undefined) {
            this.finishInit(outcomes);
            return;
        }

        environment.http(
            "GET",
            outcomesUrl(appKey),
            undefined,
            o => {
                this.log("Got outcomes", o);
                this.finishInit(o);
                then(this);
            },
            e => {
                this.error("Could not get outcomes", e);
                this.finishInit({});
                then(this);
            }
        );
    }

    log(...args: any[]): void {
        this.environment.log(...args);
    }

    private error(...args: any[]): void {
        this.environment.error(...args);
    }

    private serializeStateDebounced = debounce(() => {
        this.log("Writing state", this.serialized);
        try {
            const stateString = Convert.serializedStateToJson(this.serialized);
            this.environment.setLocalStorage(this.storageKey("state"), stateString);
        } catch (e) {
            this.error("Could not save state:", e.message);
        }
    }, 100);

    private clientContext: ClientContext | undefined;
    private getClientContext(): ClientContext {
        if (this.clientContext === undefined) {
            this.clientContext = { tzo: this.environment.getTimeZoneOffset() };
            const lang = this.environment.getLocalLanguage();
            if (lang !== undefined) {
                this.clientContext.lang = lang;
            }
        }
        return this.clientContext;
    }

    private startExperiment(theExperiment: Experiment): void {
        this.queuedStartedExperiments[theExperiment.name] = theExperiment;
        this.startExperimentsDebounced();
    }

    private startExperimentsDebounced = debounce(() => {
        let experiments = mapObject(this.queuedStartedExperiments, e => ({
            instanceKey: e.key,
            options: e.optionNames,
            pick: e.pick,
            pickedBest: e.pickedBest
        }));

        this.log("Starting experiments", experiments);

        this.queuedStartedExperiments = {};

        const data: StartExperimentsRequest = {
            version: 2,
            appKey: this.appKey,
            experiments,
            ctx: this.getClientContext()
        };
        this.environment.http(
            "POST",
            apiURL("startExperiments"),
            data,
            () => {
                return;
            },
            e => this.error("Failed to start experiments", e)
        );
    }, 100);

    completeExperiment(theExperiment: Experiment, then: CompletionCallback | undefined): void {
        this.queuedCompletedExperiments[theExperiment.name] = theExperiment;
        this.completeExperimentsDebounced(then);
    }

    private completeExperimentsDebounced = debounce((then: CompletionCallback | undefined) => {
        const experiments = getOwnPropertyValues(this.queuedCompletedExperiments);

        this.queuedCompletedExperiments = {};

        const experimentsByKey: CompleteExperimentsRequest["experiments"] = {};
        for (const e of experiments) {
            if (e.payoff !== undefined) {
                experimentsByKey[e.key] = { pick: e.pick, payoff: e.payoff };
            }
        }

        this.log("Completing experiments", experimentsByKey);

        function callThen() {
            if (then !== undefined) {
                then();
            }
        }

        this.environment.http(
            "POST",
            apiURL("completeExperiments"),
            {
                version: 1,
                appKey: this.appKey,
                experiments: experimentsByKey
            },
            () => callThen(),
            e => {
                this.error("Failed to complete experiments", e);
                callThen();
            }
        );
    }, 10);

    completeDefaults(score: number, then: CompletionCallback | undefined): void {
        const completions = this.defaultCompletions;
        Object.getOwnPropertyNames(completions).forEach(name => completions[name].complete(score, then));
    }

    private finishInit(outcomes: Outcomes): void {
        try {
            const ctx = this.getClientContext();
            Object.getOwnPropertyNames(outcomes).forEach(name => {
                // If there are already options there, the experiment is already running,
                // so don't overwrite them.
                if (this.experimentOptions[name] !== undefined) return;

                const { option, epsilon } = lookupBestOption(ctx, outcomes[name]);
                this.experimentOptions[name] = new ExperimentOptions(option, epsilon);
            });

            if (this.preinitialized) {
                this.environment.startHTMLExperiments();
                this.environment.autocomplete(payoff => this.completeDefaults(payoff, undefined));
            }
        } catch (e) {
            this.error("Couldn't finish init", e);
        }
    }

    experiment(name: string, optionNames: string[]): Experiment {
        let ex = this.experiments[name];
        if (ex !== undefined) return ex;
        let options = this.experimentOptions[name];
        if (options === undefined) {
            options = this.experimentOptions[name] = new ExperimentOptions();
        }
        ex = this.experiments[name] = new Experiment(this, name, optionNames, options);

        this.defaultCompletions[name] = ex;
        this.startExperiment(ex);
        return ex;
    }

    private storageKey(path: string): string {
        return `autotune.v1.${this.appKey}.${path}`;
    }

    loadPick(name: string): string | undefined {
        return this.serialized.experimentPicks[name];
    }

    savePick(name: string, pick: string) {
        this.serialized.experimentPicks[name] = pick;
        this.serializeStateDebounced();
    }
}

export class Experiment {
    readonly key: string;

    readonly pick: string;
    readonly pickedBest: boolean;

    payoff?: number;

    constructor(
        private readonly client: Client,
        readonly name: string,
        readonly optionNames: string[],
        readonly options: ExperimentOptions
    ) {
        this.key = uuidv4();

        const { bestOption, epsilon } = this.options;

        const savedPick = this.client.loadPick(this.name);
        if (savedPick !== undefined && optionNames.indexOf(savedPick) !== -1) {
            this.pick = savedPick;
            this.pickedBest = savedPick === bestOption;
        } else {
            const pickRandom =
                bestOption === undefined ||
                // The best option may have been removed from the option set
                optionNames.indexOf(bestOption) === -1 ||
                Math.random() < epsilon;

            let pick: string;
            if (pickRandom || bestOption === undefined) {
                pick = optionNames[Math.floor(Math.random() * optionNames.length)];
            } else {
                pick = bestOption;
            }

            this.client.savePick(this.name, pick);
            this.pick = pick;
            this.pickedBest = !pickRandom;
        }
    }

    complete(payoff: number = 1, then: CompletionCallback | undefined) {
        this.payoff = payoff;
        this.client.completeExperiment(this, then);
    }
}
