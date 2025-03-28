import type { NatsAuthOperatorsResponse, TeamsRecord } from "./pocketbase-types";

export type ExpandedNatsAuthOperatorsResponse = NatsAuthOperatorsResponse & {
    expand: {
        teams?: TeamsRecord[];
    }
}