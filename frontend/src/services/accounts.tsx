import type { ExpandedNatsAuthAccountsResponse } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthAccountsPendingRecord,
	NatsAuthAccountsResponse,
} from "@/lib/pocketbase-types";
import useSWR from "swr";

export function usePendingAccountActions(installationId: string) {
	return useSWR(
		[
			`/installations/${installationId}/pending_account_actions`,
			installationId,
		],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<NatsAuthAccountsPendingRecord>("nats_auth_accounts_pending")
				.getFullList();
		},
	);
}

export function useAccountsWithTeams(installationId: string) {
	return useSWR(
		[`/installations/${installationId}/accounts_with_teams`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
				.getFullList(undefined, {
					filter: `operator = '${pInstallationId}'`,
					expand: "teams",
				});
		},
	);
}

export function useAccountById(installationId: string, accountId: string) {
	return useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}`,
			installationId,
			accountId,
		],
		async ([_, pInstallationId, pAccountId]) => {
			if (!pInstallationId) {
				return;
			}
			if (!pAccountId) {
				return;
			}
			return pb
				.collection<NatsAuthAccountsResponse>("nats_auth_accounts")
				.getFirstListItem(
					`operator = '${pInstallationId}' && id = '${pAccountId}'`,
				);
		},
	);
}

export function useAccountByIdWithTeams(
	installationId: string,
	accountId: string,
) {
	return useSWR(
		[
			`/installations/${installationId}/accounts_with_teams/${accountId}`,
			installationId,
			accountId,
		],
		async ([_, pInstallationId, pAccountId]) => {
			if (!pInstallationId) {
				return;
			}
			if (!pAccountId) {
				return;
			}
			return pb
				.collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
				.getFirstListItem(
					`operator = '${pInstallationId}' && id = '${pAccountId}'`,
					{
						expand: "teams",
					},
				);
		},
	);
}

export function useAccountByIdWithLimits(
	installationId: string,
	accountId: string,
) {
	return useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}?expand=limits`,
			installationId,
			accountId,
		],
		async ([_, pInstallationId, pAccountId]) => {
			if (!pInstallationId || !pAccountId) {
				return;
			}
			return pb
				.collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
				.getOne(pAccountId, {
					expand: "limits",
				});
		},
	);
}

export function useAccountStreams(installationId: string, accountId: string) {
	return useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}/streams`,
			installationId,
			accountId,
		],
		async ([_, pInstallationId, pAccountId]) => {
			if (!pInstallationId || !pAccountId) {
				return;
			}
			return pb.send<StreamList>(
				`/api/nats-tower/installations/${pInstallationId}/accounts/${pAccountId}/streams`,
				{
					method: "GET",
				},
			);
		},
	);
}

export interface StreamList {
	streams: Stream[];
}

export interface Stream {
	name: string;
	created: string;
	cluster?: StreamCluster;
	state: StreamState;
}

export interface StreamCluster {
	leader: string;
}

export interface StreamState {
	messages: number;
	bytes: number;
	first_seq: number;
	first_ts: string;
	last_seq: number;
	last_ts: string;
	consumer_count: number;
}
