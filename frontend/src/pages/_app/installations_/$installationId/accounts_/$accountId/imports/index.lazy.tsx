import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { getAccountById } from "@/services/accounts";
import { getInstallationById } from "@/services/installations";
import { getImportColumns } from "@/components/ui/imports/imports-columns";
import { getAccountImports } from "@/services/imports";
import { AddImportDialog } from "@/components/ui/imports/add-import-dialog";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/imports/",
)({
	component: Imports,
});

function Imports() {
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateImportOpen, setDialogCreateImportOpen] = useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = getInstallationById(installationId);

	const {
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = getAccountById(installationId, accountId);

	const {
		data: importData,
		error: importError,
		isLoading: importLoading,
		mutate: mutateImports,
	} = getAccountImports(installationId, accountId);

	if (installationError || accountError || importError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || importLoading) {
		return <div>loading...</div>;
	}

	if (!installationData || !accountData || !importData) {
		return <div>no data</div>;
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Account Imports</h2>
							<div className="text-sm text-gray-500">
								Manage imports for account '{accountData?.name}' on installation
								'{installationData?.description}'.
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getImportColumns(installationId, accountId, mutateImports)}
					data={importData || []}
					noRowsText="No Imports configured"
					addButton={
						<AddImportDialog
							open={dialogCreateImportOpen}
							setOpen={setDialogCreateImportOpen}
							installationId={installationId}
							accountId={accountId}
							mutateImports={mutateImports}
						/>
					}
				/>
			</div>
		</div>
	);
}
