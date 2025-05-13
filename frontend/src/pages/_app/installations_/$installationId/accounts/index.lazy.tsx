import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { getInstallationByIdWithTeams } from "@/services/installations";
import { getTeams } from "@/services/teams";
import {
	getAccountsWithTeams,
	getPendingAccountActions,
} from "@/services/accounts";
import { AddAccountDialogContent } from "@/components/ui/accounts/add-account-dialog";
import { AccountDataTableRow } from "@/components/ui/accounts/account-data-table-row";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts/",
)({
	component: Accounts,
});

function Accounts() {
	const { installationId } = Route.useParams();
	const [dialogCreateAccountOpen, setDialogCreateAccountOpen] = useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = getInstallationByIdWithTeams(installationId);

	const {
		data: teamsData,
		error: teamsError,
		isLoading: teamsLoading,
	} = getTeams();

	const {
		data: pendingAccountActionsData,
		error: pendingAccountActionsError,
		isLoading: pendingAccountActionsLoading,
		mutate: mutatePendingAccountActions,
	} = getPendingAccountActions(installationId);

	const {
		data: accountsData,
		error: accountsError,
		isLoading: accountsLoading,
		mutate: mutateAccounts,
	} = getAccountsWithTeams(installationId);

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
					{pb.authStore.isSuperuser ? (
						<div className="flex-1 flex justify-end gap-2">
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
						</div>
					) : undefined}
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Status</TableHead>
							<TableHead className="w-[100px]">Name</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{accountsData?.map((account) => (
							<AccountDataTableRow
								key={account.id}
								installationData={installationData}
								pendingAccountData={pendingAccountActionsData}
								teamsData={teamsData}
								account={account}
								installationId={installationId}
								mutateAccounts={() => {
									mutateAccounts();
									mutatePendingAccountActions();
								}}
							/>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
