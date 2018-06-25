import { homedir } from "os";
import * as path from "path";

import * as request from "request-promise";
import * as yargs from "yargs";
import * as storage from "node-persist";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { decode } from "jsonwebtoken";

import { CreateAppKeyRequest, CreateAppKeyResponse, clientUrl } from "../common/ClientAPI";
import { User, Application } from "./Query";

import chalk from "chalk";
import { table, getBorderCharacters } from "table";

import * as moment from "moment";

const rot47 = require("caesar-salad").ROT47.Decipher();

const cognitoAccessKeyID = rot47.crypt("pzxpxd#xt*'&ts{q|(}\"");
const cognitoSecretAccessKey = rot47.crypt("xAC%<Gt;!)G+{:9s)Df*K23Hx@H:{'<:Z>+tKFe*");
const clientID = "104m4anpa00b724preu1dco9vj";

const { red, yellow, blue, magenta, cyan, green, dim, bold } = chalk;

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
        console.error('or "signup" to sign up, if you haven\'t done so already.');
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
    console.log(`  <script src="${clientUrl(appKey)}"></script>`);
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
    console.log(`✓ Created app '${magenta(name)}' with key ${bold(appKey)}`);
    console.log();
    console.log("Add this code to your web page:");
    console.log();

    console.log(
        [blue("<script"), " ", yellow("src"), blue("="), red(`"${clientUrl(appKey)}"`), blue("></script>")].join("")
    );
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

async function getApp(keyOrName: string): Promise<Application | null> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(keyOrName);

    if (isUUID) {
        const app = await queryGraphQL<Application | null>(graphQLQueryApplication, "getApplication", {
            key: keyOrName
        });
        if (app !== null) return app;
    } else {
        const user = await queryGraphQL<User>(graphQLQueryAll, "viewer");
        const app = user.applications.find(a => a.name === keyOrName);
        if (app !== undefined) return app;
    }

    return null;
}

async function listApps(_args: yargs.Arguments): Promise<void> {
    const user = await queryGraphQL<User>(graphQLQueryAll, "viewer");
    const apps = user.applications
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(app => [magenta(app.name), app.key]);
    logTable([[bold("App Name"), bold("Key")], ...apps]);
}

const epsilonThresholds = [
    {
        max: 0.5,
        color: green,
        means: "autotune has determined the best option with high confidence"
    },
    {
        max: 0.8,
        color: yellow,
        means: "autotune is learning and choices are improving"
    },
    {
        max: Infinity,
        color: red,
        means: "autotune has little data and choices are mostly random"
    }
];

async function cmdListExperiments(_args: yargs.Arguments, appKey: string): Promise<void> {
    const app = await getApp(appKey);
    if (app === null) {
        throw new Error("Application not found");
    }
    for (const experiment of app.experiments) {
        const rows: any[] = [];

        const epsilonRounded = Math.floor(experiment.epsilon * 100) / 100;
        const epsilon = epsilonThresholds.find(e => epsilonRounded <= e.max)!;
        const epsilonDisplay = epsilon.color(`epsilon = ${epsilonRounded}`);
        const ago = moment(experiment.started).fromNow();
        rows.push([bold(magenta(experiment.name)), `Since ${ago}`, "Conversion"]);

        const options = experiment.options
            .map(o => ({
                ...o,
                result: o.payoff / o.completed
            }))
            .sort((a, b) => b.result - a.result);

        let first = true;
        for (const o of options) {
            const conversionRate = (Math.floor(o.result * 1000) / 10).toString();
            const conversion = first ? bold(conversionRate) : conversionRate;
            const star = yellow("★");
            const name = first ? bold(o.name + " " + star) : o.name;
            rows.push([name, dim(`${o.completed} instances`), `${conversion}%`]);
            first = false;
        }

        rows.push([epsilonDisplay, dim(epsilon.means), ""]);
        logTable(rows);
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
        .usage(`Usage: ${cyan("$0")} <command> ${dim("[options]")}`)
        .command(
            "signup <email> <password>",
            dim("Create a new account"),
            ya => ya.positional("email", { type: "string" }).positional("password", { type: "string" }),
            args => cmd(cmdSignup(args, args.email, args.password))
        )
        .command(
            "confirm <code>",
            dim("Confirm a new account"),
            ya => ya.positional("email", { type: "string" }).positional("code", { type: "string" }),
            args => cmd(cmdConfirm(args, args.email, args.code))
        )
        .command(
            "login <email> <password>",
            dim("Login"),
            ya => ya.positional("email", { type: "string" }).positional("password", { type: "string" }),
            args => cmd(cmdLogin(args, args.email, args.password))
        )
        .command(
            "new <name>",
            dim("Create a new app"),
            ya => ya.positional("name", { type: "string" }),
            args => cmd(cmdCreateApp(args, args.name))
        )
        .command(
            "ls [key|name]",
            dim("List apps or experiments for an app"),
            ya => ya.positional("key", { type: "string" }),
            args => {
                if (args.key !== undefined) {
                    cmd(cmdListExperiments(args, args.key));
                } else {
                    cmd(listApps(args));
                }
            }
        )
        .command("graphql", false, {}, args => cmd(graphQL(args)))
        .wrap(yargs.terminalWidth()).argv;

    if (!didSomething || argv.help) {
        if ((await tryGetUserInfo()) === undefined) {
            console.error("You're not logged in to autotune.");
            console.error("");
            console.error("  Create account: tune signup EMAIL PASSWORD");
            console.error("  Log in:         tune login EMAIL PASSWORD");
            console.error("");
        }
        yargs.showHelp();
    }
}

function logTable(rows: any[], style: "void" | "norc" = "norc") {
    console.log(
        table(rows, {
            border: getBorderCharacters(style)
        })
    );
}

main().catch(e => console.error(e));
