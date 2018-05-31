import { startHTMLExperiments } from "./html";

const DEBUG = true;

export type OptionValue = string;

type CompleteExperimentsRequest = {
  appKey: string;
  experiments: {
    [key: string]: { pick: OptionValue; payoff: number };
  };
};

type StartExperimentsRequest = {
  appKey: string;
  experiments: {
    [experimentName: string]: { options: OptionValue[]; pick: OptionValue };
  };
};

type StartExperimentsResponse = {
  errorMessage?: string;
  experiments: {
    [experimentName: string]: { key: string };
  };
};

type OutcomesResponse = {
  [experimentName: string]: { bestOption: OptionValue; epsilon: number };
};

function api(path: string) {
  return `https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/${path}`;
}

function outcomesUrl(appKey: string) {
  return `https://s3.us-east-2.amazonaws.com/autotune-outcomes/${appKey}.json`;
}

const state: {
  appKey: string;
  experiments: { [name: string]: Experiment<OptionValue> };
  defaultCompletions: { [name: string]: Experiment<OptionValue> };
  queuedCompletedExperiments: { [name: string]: Experiment<OptionValue> };
  queuedStartedExperiments: { [name: string]: Experiment<OptionValue> };
  startExperimentsTimer?: number;
  completeExperimentsTimer?: number;
} = {
  appKey: "",
  experiments: {},
  defaultCompletions: {},
  queuedCompletedExperiments: {},
  queuedStartedExperiments: {}
};

function log(...args: any[]) {
  if (DEBUG) {
    console.log("AUTOTUNE", ...args);
  }
}

function getOwnPropertyValues<T>(x: { [name: string]: T }): T[] {
  return Object.getOwnPropertyNames(x).map(n => x[n]);
}

function mapObject<T, S>(
  x: { [name: string]: T },
  f: (v: T, k: string) => S
): { [name: string]: S } {
  let result: { [name: string]: S } = {};
  Object.getOwnPropertyNames(x).forEach(n => (result[n] = f(x[n], n)));
  return result;
}

function startExperiment(experiment: Experiment<OptionValue>): void {
  if (state.startExperimentsTimer !== undefined) {
    clearTimeout(state.startExperimentsTimer);
    state.startExperimentsTimer = undefined;
  }

  // 1. Enqueue the experiment for sending
  state.queuedStartedExperiments[experiment.name] = experiment;

  // 2. start a timer to send started queue
  state.startExperimentsTimer = <any>setTimeout(async () => {
    let experiments = mapObject(state.queuedStartedExperiments, e => ({
      options: e.options,
      pick: e.pick
    }));

    log("Starting experiments", experiments);

    state.queuedStartedExperiments = {};
    state.startExperimentsTimer = undefined;

    let response: StartExperimentsResponse;
    try {
      response = await http("POST", api("/startExperiments"), {
        appKey: state.appKey,
        experiments
      });
    } catch (e) {
      log("Failed to start experiments", e);
      return;
    }

    if (response.errorMessage !== undefined) {
      log("/startExperiments error", response);
      return;
    }

    log("/startExperiments response", response);

    if (response !== undefined) {
      // Assign keys of started experiments
      Object.getOwnPropertyNames(response.experiments).forEach(name => {
        let startedExperiment = state.experiments[name];
        if (startedExperiment !== undefined) {
          startedExperiment.key = response.experiments[name].key;
        }
      });
    }
  }, 100);
}

function completeExperiment(
  experiment: Experiment<OptionValue>,
  then: CompletionCallback | undefined
): void {
  if (state.completeExperimentsTimer !== undefined) {
    clearTimeout(state.completeExperimentsTimer);
    state.completeExperimentsTimer = undefined;
  }

  // 1. Enqueue the experiment for sending
  state.queuedCompletedExperiments[experiment.name] = experiment;

  // 2. start a timer to send completed queue
  state.completeExperimentsTimer = <any>setTimeout(async () => {
    const experiments = getOwnPropertyValues(state.queuedCompletedExperiments);

    state.queuedCompletedExperiments = {};
    state.completeExperimentsTimer = undefined;

    const experimentsByKey: CompleteExperimentsRequest["experiments"] = {};
    experiments.forEach(
      e => (experimentsByKey[e.key] = { pick: e.pick, payoff: e.payoff })
    );

    log("Completing experiments", experimentsByKey);

    try {
      await http("POST", api("/completeExperiments"), {
        appKey: state.appKey,
        experiments: experimentsByKey
      });
    } catch (e) {
      log("Failed to complete experiments", e);
    } finally {
      if (then !== undefined) {
        then();
      }
    }
  }, 10);
}

function http(
  method: "POST" | "GET",
  url: string,
  data: any = undefined
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      // TODO support node
      return reject("Not running in browser");
    }

    let request = new XMLHttpRequest();
    request.open(method, url, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onerror = () => reject(request.statusText);
    request.onreadystatechange = () => {
      if (request.readyState == 4)
        if (request.status == 200) {
          resolve(JSON.parse(request.responseText));
        } else {
          reject(`Request failed with status ${request.status}`);
        }
    };
    if (data !== undefined) {
      request.send(JSON.stringify(data));
    } else {
      request.send();
    }
  });
}

export async function initialize(appKey: string): Promise<{}> {
  log("Initialize", appKey);

  state.appKey = appKey;

  let outcomes: OutcomesResponse = {};
  try {
    outcomes = await http("GET", outcomesUrl(appKey));
  } catch (e) {
    log("ERROR getting outcomes", e);
  }

  log("Got outcomes", outcomes);

  Object.getOwnPropertyNames(outcomes).forEach(name => {
    // If there's already an experiment there, it's already running,
    // so don't overwrite it.
    if (state.experiments[name] !== undefined) return;

    const { bestOption, epsilon } = outcomes[name];
    state.experiments[name] = new Experiment(name, bestOption, epsilon);
  });

  startHTMLExperiments();

  // Why does this have to return a value?
  return {};
}

export function experiment<T extends OptionValue>(name: string): Experiment<T> {
  let ex = state.experiments[name] as Experiment<T>;
  if (ex === undefined) {
    ex = state.experiments[name] = new Experiment<T>(name);
  }
  return ex;
}

export class Experiment<T extends OptionValue> {
  payoff: number;
  pick?: T;
  options: T[];

  key?: string;

  constructor(
    public readonly name: string,
    readonly bestOption: T | undefined = undefined,
    readonly epsilon: number = 1
  ) {}

  private setValueAndStartExperiment(value: T): T {
    if (this.pick === undefined) {
      this.pick = value;
      startExperiment(this);
    }
    return this.pick;
  }

  async complete(payoff: number = 1, then: CompletionCallback | undefined) {
    this.payoff = payoff;
    completeExperiment(this, then);
  }

  // FIXME: This shouldn't be in here.  Maybe a CoinFlipExperiment subclass?
  flipCoin(): boolean {
    return this.oneOf("true" as any, "false" as any) === "true";
  }

  oneOf(...options: T[]): T {
    this.options = options;

    let one: T;
    if (this.bestOption === undefined || Math.random() < this.epsilon) {
      one = options[Math.floor(Math.random() * options.length)];
    } else {
      one = this.bestOption;
    }

    return this.setValueAndStartExperiment(one);
  }
}

export function flipCoin(experimentName: string): boolean {
  const ex = experiment(experimentName);
  state.defaultCompletions[experimentName] = ex;
  return ex.flipCoin();
}

export function oneOf<T extends OptionValue>(
  experimentName: string,
  options: T[]
): T {
  const ex = experiment<T>(experimentName);
  state.defaultCompletions[experimentName] = ex;
  return ex.oneOf(...options);
}

export type CompletionCallback = () => void;

export function complete(then?: CompletionCallback): void;
export function complete(
  score: number,
  then: () => CompletionCallback | undefined
): void;
export function complete(
  scoreOrThen: number | CompletionCallback | undefined,
  maybeThen?: CompletionCallback
): void {
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
  Object.getOwnPropertyNames(completions).forEach(name =>
    completions[name].complete(score, then)
  );
}
