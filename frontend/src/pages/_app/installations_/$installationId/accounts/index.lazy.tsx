import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useInstallationByIdWithTeams } from "@/services/installations";
import { useTeams } from "@/services/teams";
import {
	useAccountsWithTeams,
	usePendingAccountActions,
} from "@/services/accounts";
import { AddAccountDialogContent } from "@/components/ui/accounts/add-account-dialog";
import { DataTable } from "@/components/ui/data-table";
import { getAccountsColumns } from "@/components/ui/accounts/account-columns";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts/",
)({
	component: Accounts,
});

function Accounts() {
	const navigate = useNavigate();
	const { installationId } = Route.useParams();
	const [dialogCreateAccountOpen, setDialogCreateAccountOpen] = useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = useInstallationByIdWithTeams(installationId);

	const {
		data: teamsData,
		error: teamsError,
		isLoading: teamsLoading,
	} = useTeams();

	const {
		data: pendingAccountActionsData,
		error: pendingAccountActionsError,
		isLoading: pendingAccountActionsLoading,
		mutate: mutatePendingAccountActions,
	} = usePendingAccountActions(installationId);

	const {
		data: accountsData,
		error: accountsError,
		isLoading: accountsLoading,
		mutate: mutateAccounts,
	} = useAccountsWithTeams(installationId);

	if (
		installationError ||
		accountsError ||
		teamsError ||
		pendingAccountActionsError
	)
		return <div>failed to load</div>;
	if (
		installationLoading ||
		accountsLoading ||
		teamsLoading ||
		pendingAccountActionsLoading
	)
		return <div>loading...</div>;

	const handleRefresh = () => {
		mutateAccounts();
		mutatePendingAccountActions();
	};

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Accounts</h2>
							<div className="text-sm text-gray-500">
								List of accounts for installation '
								{installationData?.description}'
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getAccountsColumns(
						navigate,
						installationData,
						teamsData,
						pendingAccountActionsData,
						installationId,
						handleRefresh,
					)}
					data={accountsData || []}
					noRowsText="No accounts found"
					addButton={
						pb.authStore.isSuperuser ? (
							<Dialog
								open={dialogCreateAccountOpen}
								onOpenChange={setDialogCreateAccountOpen}
							>
								<DialogTrigger asChild>
									<Button variant="outline">
										<PlusIcon /> Add account
									</Button>
								</DialogTrigger>

								{installationData ? (
									<AddAccountDialogContent
										mutateAccounts={mutateAccounts}
										installationData={installationData}
										setDialogCreateAccountOpen={setDialogCreateAccountOpen}
									/>
								) : undefined}
							</Dialog>
						) : undefined
					}
				/>
			</div>
		</div>
	);
}
