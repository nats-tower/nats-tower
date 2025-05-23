import type { AccountExport } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import useSWR from "swr";

export interface AccountExportList {
	exports: AccountExport[];
}

export function getAccountExports(installationId: string, accountId: string) {
	return useSWR(
		[`/accounts/${accountId}/exports`, accountId],
		async ([_, pAccountId]) => {
			if (!pAccountId) {
				return;
			}
			return pb
				.send<AccountExportList>(
					`/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports`,
					{
						method: "GET",
					},
				)
				.then((res) => {
					let exports: AccountExport[] = [];
					exports = res.exports.map((exportItem) => {
						return {
							name: exportItem.name,
							subject: exportItem.subject,
							type: exportItem.type,
						};
					});

					return exports;
				});
		},
	);
}

export function upsertAccountExport(
	installationId: string,
	accountId: string,
	accountExport: AccountExport,
) {
	return pb.send<AccountExportList>(
		`/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: accountExport,
		},
	);
}

export function deleteAccountExport(
	installationId: string,
	accountId: string,
	accountExportName: string,
) {
	return pb.send<AccountExportList>(
		`/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports/${accountExportName}`,
		{
			method: "DELETE",
		},
	);
}

export function getAvailableExports(
	installationId: string,
	accountName: string,
) {
	return useSWR(
		[
			`/installations/${installationId}/accounts/${accountName}/available_exports`,
			installationId,
			accountName,
		],
		async ([_, pInstallationId, pAccountName]) => {
			if (!pAccountName || !pInstallationId) {
				return;
			}
			return pb
				.send<{
					account_exports: {
						[name: string]: AccountExport[];
					};
				}>(`/api/nats-tower/installations/${pInstallationId}/exports`, {
					method: "GET",
				});
		},
	);
}
