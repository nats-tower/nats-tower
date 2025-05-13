import type { NatsAuthAccountsResponse, NatsAuthLimitsRecord, NatsAuthOperatorsResponse, TeamsRecord } from "./pocketbase-types";

export type ExpandedNatsAuthOperatorsResponse = NatsAuthOperatorsResponse & {
    expand: {
        teams?: TeamsRecord[];
    }
}

export type ExpandedNatsAuthAccountsResponse = NatsAuthAccountsResponse & {
    expand: {
        teams?: TeamsRecord[];
        limits?: NatsAuthLimitsRecord;
    }
}
