import type { NatsAuthAccountsResponse, NatsAuthOperatorsResponse, TeamsRecord } from "./pocketbase-types";

export type ExpandedNatsAuthOperatorsResponse = NatsAuthOperatorsResponse & {
    expand: {
        teams?: TeamsRecord[];
    }
}

export type ExpandedNatsAuthAccountsResponse = NatsAuthAccountsResponse & {
    expand: {
        teams?: TeamsRecord[];
    }
}