import { Client, Outcomes } from "./Client";
import { Environment } from "./Environment";

const appKey = "abcde";

class TestEnvironment implements Environment {
    readonly logs: any[][] = [];
    readonly errors: any[][] = [];

    numOutcomesRequested: number = 0;
    htmlExperimentsStarted: boolean = false;

    constructor(private readonly outcomes: Outcomes | undefined) {}

    log(...args: any[]): void {
        console.log(...args);
        this.logs.push(args);
    }
    error(...args: any[]): void {
        console.error(...args);
        this.errors.push(args);
    }
    getTimeZoneOffset(): number {
        throw new Error("Method not implemented.");
    }
    getLocalLanguage(): string | undefined {
        throw new Error("Method not implemented.");
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

function makeClient(env: Environment, then: () => void): Client {
    return new Client(env, appKey, then);
}

function testAsync(name: string, fn: (resolve: () => void) => Promise<void>): void {
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

testAsync("can init when network fails", async resolve => {
    const env = new TestEnvironment(undefined);
    makeClient(env, () => {
        expect(env.numOutcomesRequested).toBe(1);
        expect(env.errors.length).toBeGreaterThan(0);
        expect(env.htmlExperimentsStarted).toBe(true);
        resolve();
    });
});

test("can init with network", async resolve => {
    const env = new TestEnvironment({});
    makeClient(env, () => {
        expect(env.numOutcomesRequested).toBe(1);
        expect(env.errors.length).toBe(0);
        expect(env.htmlExperimentsStarted).toBe(true);
        resolve();
    });
});
