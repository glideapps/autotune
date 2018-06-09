// GET to https://s3.us-east-2.amazonaws.com/autotune-outcomes/$APP_KEY.json
export type Outcomes = {
    [experimentName: string]: {
        epsilon: number;
        bestOption: string;
    };
};

// The full clients, including the config, are generated at
// GET to https://js.autotune.xyz.s3.us-east-2.amazonaws.com/$APP_KEY.json
export type ClientConfig = {
    appKey: string;
    outcomes: Outcomes;
};

export type ClientContext = { [key: string]: string | number };

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/startExperiments

export type StartExperimentsRequest = {
    appKey: string;
    experiments: {
        [name: string]: {
            instanceKey?: string;
            options: string[];
            pick: string;
        };
    };
    ctx?: ClientContext;
};

export type StartExperimentsResultForExperiment = { key: string };

export type StartExperimentsResponse = {
    experiments: { [name: string]: StartExperimentsResultForExperiment };
};

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/completeExperiments

export type CompleteExperimentsRequest = {
    appKey: string;
    experiments: {
        [instanceKey: string]: {
            pick: string;
            payoff: number;
        };
    };
};

export type CompleteExperimentsResponse = {};

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/listApps

export type ListAppsRequest = {};

export type ListAppsResponse = {
    appKeys: string[];
};

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/listExperiments

export type ListExperimentsRequest = {
    appKey: string;
};

export type ListExperimentsResultForExperiment = {
    started: string; // date-time
    counts: { [option: string]: { completed: number; payoff: number } };
};

export type ListExperimentsResponse = {
    experiments: {
        [name: string]: ListExperimentsResultForExperiment;
    };
};

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/createAppKey

export type CreateAppKeyRequest = {
    name: string;
};

export type CreateAppKeyResponse = {
    appKey: string;
};
