import { CompleteExperimentsRequest, outcomesUrl, ClientContext } from "./common/ClientAPI";
import { Outcome } from "./common/ClientConfig";

import { startHTMLExperiments } from "./html";

import { Convert, SerializedState } from "./common/models";

import { Environment } from "./Environment";

import { uuidv4, mapObject, getOwnPropertyValues } from "./util";
import { debounce } from "./debounce";
import { lookupBestOption } from "./DecisionTree";

export type Outcomes = { [experimentKey: string]: Outcome };

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

export type CompletionCallback = () => void;

export class Client {
    private readonly state: {
        appKey: string;
        serialized: SerializedState;
        experimentOptions: { [name: string]: ExperimentOptions };
        experiments: { [name: string]: Experiment };
        defaultCompletions: { [name: string]: Experiment };
        queuedCompletedExperiments: { [name: string]: Experiment };
        queuedStartedExperiments: { [name: string]: Experiment };
    };

    constructor(private readonly environment: Environment, appKey: string, then: () => void, outcomes?: Outcomes) {
        this.log("Initialize", appKey);

        this.state = {
            appKey: appKey,
            experiments: {},
            experimentOptions: {},
            defaultCompletions: {},
            queuedCompletedExperiments: {},
            queuedStartedExperiments: {},
            serialized: defaultSerializedState
        };

        try {
            const stateString = environment.getLocalStorage(this.storageKey("state"));
            if (stateString !== undefined) {
                this.state.serialized = Convert.toSerializedState(stateString);
            }
        } catch {}

        const now = new Date().getTime();
        const beginNewSession = now - this.state.serialized.lastInitialized > SESSION_EXPIRES_AFTER;

        if (beginNewSession) {
            this.log("Starting a new session");
            this.state.serialized.experimentPicks = {};
        }

        this.state.serialized.lastInitialized = now;
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
                then();
            },
            e => {
                this.error("Could not get outcomes", e);
                this.finishInit({});
                then();
            }
        );
    }

    private log(...args: any[]): void {
        this.environment.log(...args);
    }

    private error(...args: any[]): void {
        this.environment.error(...args);
    }

    private serializeStateDebounced = debounce(() => {
        this.log("Writing state", this.state.serialized);
        try {
            const stateString = Convert.serializedStateToJson(this.state.serialized);
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
        this.state.queuedStartedExperiments[theExperiment.name] = theExperiment;
        this.startExperimentsDebounced();
    }

    private startExperimentsDebounced = debounce(() => {
        let experiments = mapObject(this.state.queuedStartedExperiments, e => ({
            instanceKey: e.key,
            options: e.options,
            pick: e.pick,
            pickedBest: e.pickedBest
        }));

        this.log("Starting experiments", experiments);

        this.state.queuedStartedExperiments = {};

        this.environment.http(
            "POST",
            api("/startExperiments"),
            {
                version: 2,
                appKey: this.state.appKey,
                experiments,
                ctx: this.getClientContext()
            },
            () => {
                return;
            },
            e => this.error("Failed to start experiments", e)
        );
    }, 100);

    completeExperiment(theExperiment: Experiment, then: CompletionCallback | undefined): void {
        this.state.queuedCompletedExperiments[theExperiment.name] = theExperiment;
        this.completeExperimentsDebounced(then);
    }

    private completeExperimentsDebounced = debounce((then: CompletionCallback | undefined) => {
        const experiments = getOwnPropertyValues(this.state.queuedCompletedExperiments);

        this.state.queuedCompletedExperiments = {};

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
            api("/completeExperiments"),
            {
                version: 1,
                appKey: this.state.appKey,
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
        const completions = this.state.defaultCompletions;
        Object.getOwnPropertyNames(completions).forEach(name => completions[name].complete(score, then));
    }

    private finishInit(outcomes: Outcomes): void {
        try {
            Object.getOwnPropertyNames(outcomes).forEach(name => {
                // If there are already options there, the experiment is already running,
                // so don't overwrite them.
                if (this.state.experimentOptions[name] !== undefined) return;

                const { option, epsilon } = lookupBestOption(this.getClientContext(), outcomes[name]);
                this.state.experimentOptions[name] = new ExperimentOptions(outcomes[name].options, option, epsilon);
            });

            startHTMLExperiments();
        } catch (e) {
            this.error("Couldn't finish init", e);
        }
    }

    experiment(name: string, optionNames: string[]): Experiment {
        let ex = this.state.experiments[name];
        if (ex !== undefined) return ex;
        let options = this.state.experimentOptions[name];
        if (options === undefined) {
            options = this.state.experimentOptions[name] = new ExperimentOptions(optionNames);
        }
        ex = this.state.experiments[name] = new Experiment(this, name, options);
        this.state.defaultCompletions[name] = ex;
        this.startExperiment(ex);
        return ex;
    }

    private storageKey(path: string): string {
        return `autotune.v1.${this.state.appKey}.${path}`;
    }

    loadPick(name: string): string | undefined {
        return this.state.serialized.experimentPicks[name];
    }

    savePick(name: string, pick: string) {
        this.state.serialized.experimentPicks[name] = pick;
        this.serializeStateDebounced();
    }
}

export class Experiment {
    readonly key: string;

    readonly pick: string;
    readonly pickedBest: boolean;

    payoff?: number;

    constructor(private readonly client: Client, readonly name: string, readonly options: ExperimentOptions) {
        this.key = uuidv4();

        const { optionNames, bestOption } = this.options;

        const savedPick = this.client.loadPick(this.name);
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
