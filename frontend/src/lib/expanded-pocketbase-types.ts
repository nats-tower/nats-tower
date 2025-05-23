import type {
	NatsAuthAccountsResponse,
	NatsAuthLimitsRecord,
	NatsAuthOperatorsResponse,
	TeamsRecord,
} from "./pocketbase-types";

export type ExpandedNatsAuthOperatorsResponse = NatsAuthOperatorsResponse & {
	expand: {
		teams?: TeamsRecord[];
	};
};

export type ExpandedNatsAuthAccountsResponse = NatsAuthAccountsResponse & {
	expand: {
		teams?: TeamsRecord[];
		limits?: NatsAuthLimitsRecord;
	};
};

export interface AccountExport {
    name: string;
    subject: string;
    type: "service" | "stream";
}

export interface AccountImport {
    name: string;
    account: string
    subject: string;
    type: "service" | "stream";
    local_subject: string;
}
