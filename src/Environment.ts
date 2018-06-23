export interface Environment {
    log(...args: any[]): void;
    error(...args: any[]): void;

    getTimeZoneOffset(): number;
    getLocalLanguage(): string | undefined;

    http(
        method: "POST" | "GET",
        url: string,
        data: any,
        resolve: (data: any) => void,
        reject: (err: Error) => void
    ): void;

    getLocalStorage(key: string): string | undefined;
    setLocalStorage(key: string, value: string): void;
}
