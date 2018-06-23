// This file contains models that serialize to JSON
// We use quicktype to generate validators.

export type SerializedState = {
    /** @TJS-type integer */
    lastInitialized: number;
    experimentPicks: { [experiment: string]: string };
};
