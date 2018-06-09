import { homedir } from "os";
import * as path from "path";

import * as request from "request-promise";
import * as yargs from "yargs";
import * as storage from "node-persist";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { decode } from "jsonwebtoken";

import { CreateAppKeyRequest, CreateAppKeyResponse } from "../common/ClientAPI";
import { User, Application } from "./Query";

const cognitoAccessKeyID = "AKIAI2GRN6DCKCABTKGQ";
const cognitoSecretAccessKey = "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";
const clientID = "104m4anpa00b724preu1dco9vj";

const cognito = new CognitoIdentityServiceProvider({
    region: "us-east-2",
    accessKeyId: cognitoAccessKeyID,
    secretAccessKey: cognitoSecretAccessKey
});

type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    idToken: string;
};

type UserInfo = {
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

async function tryGetUserInfo(): Promise<UserInfo | undefined> {
    await initStorage();
    return await storage.getItem(userInfoKey);
}

async function getUserInfo(): Promise<UserInfo> {
    const userInfo = await tryGetUserInfo();
    if (userInfo === undefined) {
        console.error('You\'re not logged in :-(.  Please use "login" to log in');
        console.error('or "create-account" to sign up, if you haven\'t done so already.');
        return process.exit(1);
    }
    return userInfo;
}

async function setUserInfo(info: UserInfo): Promise<void> {
    await initStorage();
    await storage.setItem(userInfoKey, info);
}

async function cmdSignup(_args: yargs.Arguments, email: string, password: string): Promise<void> {
    let response;

    try {
        response = await cognito
            .signUp({
                ClientId: clientID,
                Username: email,
                Password: password,
                UserAttributes: [{ Name: "email", Value: email }]
            })
            .promise();
    } catch (e) {
        if (e.code === "UsernameExistsException") {
            console.error(`An account already exists for ${email}`);
        } else {
            console.error(`Could not sign up: ${e.message}`);
        }
        return;
    }

    if (response.UserConfirmed) {
        console.log("User creation confirmed");
    } else {
        console.log(`Confirmation code sent to ${response.CodeDeliveryDetails!.Destination}`);
        console.log('Please use the "confirm" command with the code');
    }
    await setUserInfo({ username: email, password });
}

async function createDemoApp() {
    const appKey = await createApp("My sample autotune app");
    console.log("");
    console.log("We've created a sample app for you to start with! Add this script tag:");
    console.log("");
    console.log(`  <script src="//s3.us-east-2.amazonaws.com/autotune-clients/${appKey}.js"></script>`);
    console.log("");
    console.log("Then create an experiment:");
    console.log("");
    console.log(`  <autotune>`);
    console.log(`    <h1>The glass is half full</h1>`);
    console.log(`    <h1>The glass is half empty</h1>`);
    console.log(`  <autotune>`);
    console.log("");
    console.log("Finally, add the autotune attribute to links that you want users to click:");
    console.log("");
    console.log(`  <a href="/buy" autotune>Buy now</a>`);
    console.log("");
}

async function cmdConfirm(_args: yargs.Arguments, email: string | undefined, code: string): Promise<void> {
    let password: string | undefined = undefined;
    if (email === undefined) {
        const userInfo = await getUserInfo();
        email = userInfo.username;
        password = userInfo.password;
    }
    await cognito
        .confirmSignUp({
            ClientId: clientID,
            Username: email,
            ConfirmationCode: code
        })
        .promise();
    console.log("User creation confirmed");
    if (password !== undefined) {
        await authenticateWithPassword(email, password);
        await createDemoApp();
    } else {
        console.log("Please login to start using autotune");
    }
}

async function authenticate(
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

async function authenticateWithPassword(email: string, password: string): Promise<void> {
    await authenticate(email, "USER_PASSWORD_AUTH", {
        USERNAME: email,
        PASSWORD: password
    });
}

async function cmdLogin(_args: yargs.Arguments, email: string, password: string): Promise<void> {
    await authenticateWithPassword(email, password);
    console.log("You're now logged in.");
}

async function makeAuthHeaders(): Promise<{ [name: string]: string }> {
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
    return {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Authorization: tokens.idToken
    };
}

async function requestWithAuth<T>(endpoint: string, body: T): Promise<any> {
    let url: string;
    if (endpoint.startsWith("https://")) {
        url = endpoint;
    } else {
        url = "https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/" + endpoint;
    }
    const requestOptions = {
        method: "POST",
        url,
        headers: await makeAuthHeaders(),
        body,
        json: true
    };

    /* tslint:disable:await-promise */
    return await request(requestOptions);
    /* tslint:enable */
}

async function createApp(name: string): Promise<string> {
    const body: CreateAppKeyRequest = { name };
    const result: CreateAppKeyResponse = await requestWithAuth("createAppKey", body);
    return result.appKey;
}

async function cmdCreateApp(_args: yargs.Arguments, name: string): Promise<void> {
    const appKey = await createApp(name);
    console.log(`App key: ${appKey}`);
}

const graphQLQueryAll =
    "query {\n    viewer {\n        username\n        applications {\n            name\n            key\n            experiments {\n                name\n                started\n                epsilon\n                options {\n                    name\n                    completed\n                    payoff\n                }\n            }\n        }\n    }\n}";
const graphQLQueryApplication =
    "query($key: String!) {\n    getApplication(key: $key) {\n        name\n        key\n        experiments {\n            name\n            started\n            epsilon\n            options {\n                name\n                completed\n                payoff\n            }\n        }\n    }\n}";

async function queryGraphQL<T>(
    query: string,
    queryName: string,
    variables?: { [name: string]: any } | undefined
): Promise<T> {
    const body = { query, variables };
    const result = await requestWithAuth(
        "https://wnzihyd3zndg3i3zdo6ijwslze.appsync-api.us-west-2.amazonaws.com/graphql",
        body
    );
    if (result.errors !== undefined) {
        throw new Error(`Errors from server: ${JSON.stringify(result)}`);
    }
    if (result.data === null) {
        throw new Error(`No data returned from server`);
    }
    return result.data[queryName] as T;
}

async function listApps(_args: yargs.Arguments): Promise<void> {
    const user = await queryGraphQL<User>(graphQLQueryAll, "viewer");
    for (const app of user.applications) {
        console.log(`${app.key}  ${app.name}`);
    }
}

async function cmdListExperiments(_args: yargs.Arguments, appKey: string): Promise<void> {
    const app = await queryGraphQL<Application | null>(graphQLQueryApplication, "getApplication", { key: appKey });
    if (app === null) {
        throw new Error("Application not found");
    }
    for (const experiment of app.experiments) {
        console.log(`${experiment.name} since ${experiment.started} epsilon ${experiment.epsilon}:`);

        const options: { name: string; completed: number; result: number }[] = [];
        for (const option of experiment.options) {
            const average = option.payoff / option.completed;
            options.push({ name: option.name, completed: option.completed, result: average });
        }
        options.sort((a, b) => b.result - a.result);
        for (const o of options) {
            console.log(`    ${o.name}: ${Math.floor(o.result * 1000) / 10}% over ${o.completed} instances`);
        }
    }
}

async function graphQL(_args: yargs.Arguments): Promise<void> {
    console.log(JSON.stringify(await queryGraphQL<User>(graphQLQueryAll, "viewer"), undefined, 4));
}

async function main(): Promise<void> {
    let didSomething = false;

    function cmd(p: Promise<void>): void {
        p.catch(e => {
            console.error(e);
            process.exit(1);
        });
        didSomething = true;
    }

    const argv = yargs
        .usage("Usage: $0 <command> [options]")
        .command(
            "create-account <email> <password>",
            "Create a new account",
            ya => ya.positional("email", { type: "string" }).positional("password", { type: "string" }),
            args => cmd(cmdSignup(args, args.email, args.password))
        )
        .command(
            "confirm <code>",
            "Confirm a new account",
            ya => ya.positional("email", { type: "string" }).positional("code", { type: "string" }),
            args => cmd(cmdConfirm(args, args.email, args.code))
        )
        .command(
            "login <email> <password>",
            "Login",
            ya => ya.positional("email", { type: "string" }).positional("password", { type: "string" }),
            args => cmd(cmdLogin(args, args.email, args.password))
        )
        .command(
            "create-app <name>",
            "Create a new app",
            ya => ya.positional("name", { type: "string" }),
            args => cmd(cmdCreateApp(args, args.name))
        )
        .command("apps", "List all your apps", {}, args => cmd(listApps(args)))
        .command(
            "experiments <appKey>",
            "Show experiments in app",
            ya => ya.positional("appKey", { type: "string" }),
            args => cmd(cmdListExperiments(args, args.appKey))
        )
        .command("graphql", false, {}, args => cmd(graphQL(args)))
        .wrap(yargs.terminalWidth()).argv;

    if (!didSomething || argv.help) {
        if ((await tryGetUserInfo()) === undefined) {
            console.error("You're not logged in to autotune.");
            console.error("");
            console.error("  Create account: autotune create-account EMAIL PASSWORD");
            console.error("  Log in:         autotune login EMAIL PASSWORD");
            console.error("");
        }
        yargs.showHelp();
    }
}

main();
