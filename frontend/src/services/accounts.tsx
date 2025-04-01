import type {
	ExpandedNatsAuthAccountsResponse,
} from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import type { NatsAuthAccountsPendingRecord, NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function getPendingAccountActions(installationId: string) {
	return useSWR(
		[`/installations/${installationId}/pending_account_actions`, installationId],
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

export function getAccountsWithTeams(installationId: string) {
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

export function getAccountById(installationId: string, accountId: string) {
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
				.collection<NatsAuthOperatorsRecord>("nats_auth_accounts")
				.getFirstListItem(
					`operator = '${pInstallationId}' && id = '${pAccountId}'`,
				);
		},
	);
}

export function getAccountByIdWithTeams(
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
