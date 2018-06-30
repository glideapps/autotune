// https://stackoverflow.com/a/2117523/80410
export function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        let r = (Math.random() * 16) | 0;
        let v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function getOwnPropertyValues<T>(x: { [name: string]: T }): T[] {
    return Object.getOwnPropertyNames(x).map(n => x[n]);
}

export function unique(xs: string[]): string[] {
    const o: any = {};
    for (const x of xs) {
        o[x] = x;
    }
    return getOwnPropertyValues(o);
}

export function mapObject<T, S>(x: { [name: string]: T }, f: (v: T, k: string) => S): { [name: string]: S } {
    let result: { [name: string]: S } = {};
    Object.getOwnPropertyNames(x).forEach(n => (result[n] = f(x[n], n)));
    return result;
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
