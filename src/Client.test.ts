import { Client, Outcomes } from "./Client";
import { Environment } from "./Environment";
import { Tree, Op } from "./common/ClientConfig";

const appKey = "abcde";
const experimentName = "ex";

class TestEnvironment implements Environment {
    static test(name: string, outcomes: Outcomes | undefined, fn: (env: TestEnvironment) => void): void {
        testAsync(name, resolve => {
            const env = new TestEnvironment(name, outcomes, resolve);
            makeClient(env, client => {
                env.setClient(client);
                fn(env);
            });
        });
    }

    private maybeClient: Client | undefined;

    readonly logs: any[][] = [];
    readonly errors: any[][] = [];

    numOutcomesRequested: number = 0;
    htmlExperimentsStarted: boolean = false;

    constructor(
        private readonly name: string,
        private readonly outcomes: Outcomes | undefined,
        readonly resolve: () => void
    ) {}

    setClient(client: Client): void {
        if (this.maybeClient !== undefined) {
            throw new Error("Client cannot be set twice");
        }
        this.maybeClient = client;
    }

    getClient(): Client {
        if (this.maybeClient === undefined) {
            throw new Error("Client not set");
        }
        return this.maybeClient;
    }

    getOptions(): string[] {
        if (this.outcomes === undefined) {
            throw new Error("No options when no outcomes are defined");
        }
        const outcomes = this.outcomes[experimentName];
        if (outcomes === undefined) {
            throw new Error("Experiment not defined");
        }
        return outcomes.options;
    }

    log(...args: any[]): void {
        console.log(this.name, ...args);
        this.logs.push(args);
    }

    error(...args: any[]): void {
        console.error(this.name, ...args);
        this.errors.push(args);
    }

    getTimeZoneOffset(): number {
        return 0;
    }

    getLocalLanguage(): string | undefined {
        return undefined;
    }

    http(
        method: "POST" | "GET",
        url: string,
        data: any,
        resolve: (data: any) => void,
        reject: (err: Error) => void
    ): void {
        if (method === "GET" && url.endsWith(`${appKey}.tree.json`)) {
            this.numOutcomesRequested += 1;
            setTimeout(() => {
                if (this.outcomes === undefined) {
                    reject(new Error("Simulated network error"));
                } else {
                    console.log("returning HTTP");
                    resolve(this.outcomes);
                }
            }, 0);
        } else {
            fail(`Unexpected HTTP request: ${method} to ${url}`);
        }
    }

    getLocalStorage(key: string): string | undefined {
        throw new Error("Method not implemented.");
    }

    setLocalStorage(key: string, value: string): void {
        throw new Error("Method not implemented.");
    }

    startHTMLExperiments(): void {
        this.htmlExperimentsStarted = true;
    }
}

function makeClient(env: Environment, then: (c: Client) => void): Client {
    return new Client(env, appKey, then);
}

function testAsync(name: string, fn: (resolve: () => void) => void): void {
    test(name, async () => {
        return new Promise((resolve, reject) => {
            try {
                fn(resolve);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function makeOptions(n: number): string[] {
    const options: string[] = [];
    for (let i = 0; i < n; i++) {
        options.push(`o${i.toString()}`);
    }
    return options;
}

function makeOutcomes(n: number, tree: Tree): Outcomes {
    const options = makeOptions(n);
    const outcomes: Outcomes = {};
    outcomes[experimentName] = { options, tree };
    return outcomes;
}

function leaf(best: number): Tree {
    return { best, eps: 0 };
}

function tzoLt(v: number, l: Tree, r: Tree): Tree {
    return { at: "tzo", op: Op.Lt, v, l, r };
}

TestEnvironment.test("can init when network fails", undefined, env => {
    expect(env.numOutcomesRequested).toBe(1);
    expect(env.errors.length).toBeGreaterThan(0);
    expect(env.htmlExperimentsStarted).toBe(true);
    env.resolve();
});

TestEnvironment.test("can run experiment when network fails", undefined, env => {
    const ex = env.getClient().experiment(experimentName, makeOptions(2));
    expect(ex.pick).toMatch(/^o[01]$/);
    env.resolve();
});

TestEnvironment.test("can init with network", {}, env => {
    expect(env.numOutcomesRequested).toBe(1);
    expect(env.errors.length).toBe(0);
    expect(env.htmlExperimentsStarted).toBe(true);
    env.resolve();
});

TestEnvironment.test("single node", makeOutcomes(2, leaf(1)), env => {
    const ex = env.getClient().experiment(experimentName, env.getOptions());
    expect(ex.pick).toBe("o1");
    env.resolve();
});

TestEnvironment.test("branch on tzo left", makeOutcomes(3, tzoLt(10, leaf(1), leaf(2))), env => {
    const ex = env.getClient().experiment(experimentName, env.getOptions());
    expect(ex.pick).toBe("o1");
    env.resolve();
});

TestEnvironment.test("branch on tzo right", makeOutcomes(3, tzoLt(-10, leaf(1), leaf(2))), env => {
    const ex = env.getClient().experiment(experimentName, env.getOptions());
    expect(ex.pick).toBe("o2");
    env.resolve();
});
