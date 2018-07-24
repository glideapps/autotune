import { Environment } from "./Environment";
import { startHTMLExperiments } from "./html";

const BROWSER = typeof window !== "undefined";

const DEBUG = (() => {
    if (BROWSER) {
        return window.location.hostname === "localhost" || window.location.search.indexOf("autotune-debug") !== -1;
    }
    return false;
})();

export class BrowserEnvironment implements Environment {
    log(...args: any[]): void {
        if (DEBUG) {
            console.log("AUTOTUNE", ...args);
        }
    }

    error(...args: any[]): void {
        console.error("AUTOTUNE", ...args);
    }

    getTimeZoneOffset(): number {
        return new Date().getTimezoneOffset();
    }

    getLocalLanguage(): string | undefined {
        try {
            const n = navigator as any;
            return n.language || n.userLanguage;
        } catch {
            return undefined;
        }
    }

    http(
        method: "POST" | "GET",
        url: string,
        data: any,
        resolve: (data: any) => void,
        reject: (err: Error) => void
    ): void {
        if (typeof XMLHttpRequest === "undefined") {
            // TODO support node
            return reject(new Error("Not running in browser"));
        }

        try {
            let request = new XMLHttpRequest();
            request.open(method, url, true);
            request.setRequestHeader("Content-Type", "application/json");
            request.onerror = () => reject(new Error(request.statusText));
            request.onreadystatechange = () => {
                if (request.readyState === 4)
                    if (request.status === 200) {
                        resolve(JSON.parse(request.responseText));
                    } else {
                        reject(new Error(`Request failed with status ${request.status}`));
                    }
            };
            if (data !== undefined) {
                request.send(JSON.stringify(data));
            } else {
                request.send();
            }
        } catch (e) {
            return reject(e);
        }
    }

    getLocalStorage(key: string): string | undefined {
        const value = localStorage[key];
        if (typeof value !== "string") return undefined;
        return value;
    }

    setLocalStorage(key: string, value: string): void {
        localStorage[key] = value;
    }

    startHTMLExperiments(): void {
        startHTMLExperiments();
    }

    autocomplete(complete: (payoff: number) => void): void {
        for (const [delay, reward] of [[10, 0.1], [60, 0.2]]) {
            setTimeout(() => complete(reward), delay * 1000);
        }
    }
}
