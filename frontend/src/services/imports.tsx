import type { AccountImport } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import useSWR from "swr";

export interface AccountImportList {
	imports: AccountImport[];
}

export function getAccountImports(installationId: string, accountId: string) {
	return useSWR(
		[`/installations/${installationId}/accounts/${accountId}/imports`, installationId, accountId],
		async ([_, pInstallationId, pAccountId]) => {
			if (!pAccountId || !pInstallationId) {
				return;
			}
			return pb
				.send<AccountImportList>(
					`/api/nats-tower/installations/${pInstallationId}/accounts/${pAccountId}/imports`,
					{
						method: "GET",
					},
				)
				.then((res) => {
					let imports: AccountImport[] = [];
					imports = res.imports.map((importItem) => {
						return {
							name: importItem.name,
                            subject: importItem.subject,
							local_subject: importItem.local_subject,
							type: importItem.type,
                            account: importItem.account,
						};
					});

					return imports;
				});
		},
	);
}

export function upsertAccountImport(
	installationId: string,
	accountId: string,
	accountImport: AccountImport,
) {
	return pb.send<AccountImportList>(
		`/api/nats-tower/installations/${installationId}/accounts/${accountId}/imports`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: accountImport,
		},
	);
}

export function deleteAccountImport(
	installationId: string,
	accountId: string,
	accountImportName: string,
) {
	return pb.send<AccountImportList>(
		`/api/nats-tower/installations/${installationId}/accounts/${accountId}/imports/${accountImportName}`,
		{
			method: "DELETE"
		},
	);
}

