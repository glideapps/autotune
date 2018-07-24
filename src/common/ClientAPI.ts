export interface ClientContext {
    [key: string]: string | number;
}

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/startExperiments

export interface StartExperimentsRequest {
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
}

export interface StartExperimentsResultForExperiment {
    key: string;
}

export interface StartExperimentsResponse {
    experiments: { [name: string]: StartExperimentsResultForExperiment };
}

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/completeExperiments

export interface CompleteExperimentsRequest {
    appKey: string;
    experiments: {
        [instanceKey: string]: {
            pick: string;
            payoff: number;
        };
    };
}

export interface CompleteExperimentsResponse {}

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
