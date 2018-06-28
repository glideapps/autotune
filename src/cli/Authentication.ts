import { homedir } from "os";
import * as path from "path";

import * as storage from "node-persist";
import { decode } from "jsonwebtoken";
import { CognitoIdentityServiceProvider } from "aws-sdk";

const rot47 = require("caesar-salad").ROT47.Decipher();

const cognitoAccessKeyID = rot47.crypt("pzxpxd#xt*'&ts{q|(}\"");
const cognitoSecretAccessKey = rot47.crypt("xAC%<Gt;!)G+{:9s)Df*K23Hx@H:{'<:Z>+tKFe*");
export const clientID = "104m4anpa00b724preu1dco9vj";

export const cognito = new CognitoIdentityServiceProvider({
    region: "us-east-2",
    accessKeyId: cognitoAccessKeyID,
    secretAccessKey: cognitoSecretAccessKey
});

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    idToken: string;
};

export type UserInfo = {
    username: string;
    password?: string;
    tokens?: AuthTokens;
};

let storageInited = false;

async function initStorage(): Promise<void> {
    if (storageInited) return;
    await storage.init({ dir: path.join(homedir(), ".autotune") });
}

const userInfoKey = "userInfo";

export async function tryGetUserInfo(): Promise<UserInfo | undefined> {
    await initStorage();
    return await storage.getItem(userInfoKey);
}

export async function getUserInfo(): Promise<UserInfo> {
    const userInfo = await tryGetUserInfo();
    if (userInfo === undefined) {
        console.error('You\'re not logged in :-(.  Please use "login" to log in');
        console.error('or "signup" to sign up, if you haven\'t done so already.');
        return process.exit(1);
    }
    return userInfo;
}

export async function setUserInfo(info: UserInfo): Promise<void> {
    await initStorage();
    await storage.setItem(userInfoKey, info);
}

export async function authenticate(
    username: string,
    flow: string,
    parameters: CognitoIdentityServiceProvider.AuthParametersType,
    refreshToken?: string
): Promise<AuthTokens> {
    const response = await cognito
        .initiateAuth({
            ClientId: clientID,
            AuthFlow: flow,
            AuthParameters: parameters
        })
        .promise();

    if (
        response.AuthenticationResult === undefined ||
        typeof response.AuthenticationResult!.AccessToken !== "string" ||
        typeof response.AuthenticationResult!.IdToken !== "string" ||
        (refreshToken === undefined && typeof response.AuthenticationResult!.RefreshToken !== "string")
    ) {
        throw new Error(`Could not authenticate: ${JSON.stringify(response)}`);
    }

    if (refreshToken === undefined) {
        refreshToken = response.AuthenticationResult!.RefreshToken!;
    }

    const tokens: AuthTokens = {
        accessToken: response.AuthenticationResult!.AccessToken!,
        refreshToken,
        idToken: response.AuthenticationResult!.IdToken!
    };

    await setUserInfo({ username, tokens });

    return tokens;
}

export async function getIDToken(): Promise<string> {
    const userInfo = await getUserInfo();
    let tokens = userInfo.tokens;
    if (tokens === undefined) {
        console.error("Please log in and confirm your account first");
        return process.exit(1);
    }
    const decodedToken = decode(tokens.idToken);
    if (typeof decodedToken === "object" && decodedToken !== null && typeof decodedToken.exp === "number") {
        if (decodedToken.exp <= Date.now() / 1000 + 5) {
            // Token will be expired in 5 seconds - try to refresh
            tokens = await authenticate(
                userInfo.username,
                "REFRESH_TOKEN_AUTH",
                {
                    REFRESH_TOKEN: tokens.refreshToken
                },
                tokens.refreshToken
            );
        }
    }
    return tokens.idToken;
}
