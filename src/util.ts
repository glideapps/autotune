const DEBUG = true;

// https://stackoverflow.com/a/2117523/80410
export function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        let r = (Math.random() * 16) | 0;
        let v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function log(...args: any[]) {
    if (DEBUG) {
        console.log("AUTOTUNE", ...args);
    }
}

export function error(...args: any[]) {
    if (DEBUG) {
        console.error("AUTOTUNE", ...args);
    }
}

export function getOwnPropertyValues<T>(x: { [name: string]: T }): T[] {
    return Object.getOwnPropertyNames(x).map(n => x[n]);
}

export function mapObject<T, S>(x: { [name: string]: T }, f: (v: T, k: string) => S): { [name: string]: S } {
    let result: { [name: string]: S } = {};
    Object.getOwnPropertyNames(x).forEach(n => (result[n] = f(x[n], n)));
    return result;
}

export function http(
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

export function map<T, U>(
    collection: { length: number; item(index: number): T },
    f: (element: T, index: number) => U
): U[] {
    let results = [];
    for (let i = 0; i < collection.length; i++) {
        results.push(f(collection.item(i), i));
    }
    return results;
}

export function each<T>(
    collection: { length: number; item(index: number): T },
    f: (element: T, index: number) => void
): void {
    map(collection, (e, i) => {
        f(e, i);
        return undefined;
    });
}

export function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        let character = s.charCodeAt(i);
        h = (h << 5) - h + character;
        h = h & h; // Convert to 32bit integer
    }
    return Math.abs(h);
}

export function getLocalLanguage(): string | undefined {
    try {
        const n = navigator as any;
        return n.language || n.userLanguage;
    } catch {
        return undefined;
    }
}

export function getTimeZoneOffset(): number {
    return new Date().getTimezoneOffset();
}
