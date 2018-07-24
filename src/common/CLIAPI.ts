import { ExperimentCounts } from "./ExperimentCounts";

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

// POST to https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/getCounts

export type GetCountsRequest = {
    appKey: string;
};

export type GetCountsResponse = { [key: string]: ExperimentCounts };
