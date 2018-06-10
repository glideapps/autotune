// This file contains models that serialize to JSON
// We use quicktype to generate validators.

export type SerializedState = {
    /** @TJS-type integer */
    lastInitialized: number;
    experimentPicks: { [experiment: string]: string };
    outcomes: Outcomes;
};

// Unfortunately this is duplicated from ClientAPI until
// quicktype can make this work:
//
//  import { Outcomes } from "./ClientAPI";
//
export type Outcomes = {
    [experimentName: string]: {
        epsilon: number;
        bestOption: string;
    };
};
