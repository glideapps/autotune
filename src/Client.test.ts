import { Client } from "./Client";
import { Environment } from "./Environment";

const appKey = "abcde";

class TestEnvironment implements Environment {
    readonly logs: any[][] = [];
    readonly errors: any[][] = [];

    log(...args: any[]): void {
        this.logs.push(args);
    }
    error(...args: any[]): void {
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
        console.log(`${method} to ${url}`);
        reject(new Error("HTTP not implemented"));
    }
    getLocalStorage(key: string): string | undefined {
        throw new Error("Method not implemented.");
    }
    setLocalStorage(key: string, value: string): void {
        throw new Error("Method not implemented.");
    }
}

function makeClient(env: Environment, then: () => void): Client {
    return new Client(env, appKey, then);
}

test("alive", async () => {
    return new Promise((resolve, reject) => {
        try {
            const env = new TestEnvironment();
            makeClient(env, () => {
                expect(env.errors.length).toBeGreaterThan(0);
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
});
