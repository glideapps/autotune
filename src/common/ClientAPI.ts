export type ClientContext = { [key: string]: string | number };

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/startExperiments

export type StartExperimentsRequest = {
    appKey: string;
    version: 2;
    experiments: {
        [name: string]: {
            instanceKey?: string;
            options: string[];
            pick: string;
            pickedBest: boolean;
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

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/deleteAppKey

export type DeleteAppKeyRequest = {
    appKey: string;
};

export type DeleteAppKeyResponse = {
    // FIXME: remove these two
    username: string;
    appKey: string;
};

export function s3Url(path: string) {
    return `https://s3.us-east-2.amazonaws.com/js.autotune.xyz/${path}`;
}

export function outcomesUrl(appKey: string) {
    return s3Url(`${appKey}.json`);
}

export function clientUrl(appKey: string) {
    return s3Url(`${appKey}.js`);
}

function apiURL(path: string) {
    return `https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/${path}`;
}

export const startExperimentsURL = apiURL("startExperiments");
export const completeExperimentsURL = apiURL("completeExperiments");
