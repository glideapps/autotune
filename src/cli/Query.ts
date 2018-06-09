export interface User {
    username: string;
    applications: Application[];
}

export interface Application {
    name: string;
    key: string;
    experiments: Experiment[];
}

export interface Experiment {
    name: string;
    started: string;
    epsilon: number;
    options: Option[];
}

export interface Option {
    name: string;
    completed: number;
    payoff: number;
}

export interface Error {
    message: string;
}
