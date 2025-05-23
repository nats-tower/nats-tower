import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import type {
	NatsAuthAccountsRecord,
	NatsAuthOperatorsRecord,
	NatsAuthUsersRecord,
} from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusIcon, Save } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getUsersColumns } from "@/components/ui/users/user-columns";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/users/",
)({
	component: Users,
});

function Users() {
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateUserOpen, setDialogCreateUserOpen] = useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = useSWR(
		[`/installations/${installationId}`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
				.getOne(pInstallationId);
		},
	);

	const {
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb
				.collection<NatsAuthAccountsRecord>("nats_auth_accounts")
				.getOne(accountId);
		},
	);

	const {
		data: usersData,
		error: usersError,
		isLoading: usersLoading,
		mutate: mutateUsers,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}/users`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb.collection<NatsAuthUsersRecord>("nats_auth_users").getFullList({
				filter: `account = "${accountId}"`,
			});
		},
	);

	if (installationError || accountError || usersError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || usersLoading)
		return <div>loading...</div>;
	if (!installationData || !accountData || !usersData) {
		return <div>no data</div>;
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Users</h2>
							<div className="text-sm text-gray-500">
								List of users for account '{accountData?.name}' on installation
								'{installationData?.description}'
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getUsersColumns(accountData, installationData, mutateUsers)}
					data={usersData || []}
					noRowsText="No users found"
					addButton={
						<Dialog
							open={dialogCreateUserOpen}
							onOpenChange={setDialogCreateUserOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add User
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-xl">
								<form
									className="space-y-4"
									onSubmit={async (e) => {
										e.preventDefault();
										const form = e.target as HTMLFormElement;
										const name =
											form.querySelector<HTMLInputElement>("#name")?.value;
										const description =
											form.querySelector<HTMLInputElement>(
												"#description",
											)?.value;
										if (!name || !description) {
											return;
										}
										await pb
											.collection<NatsAuthUsersRecord>("nats_auth_users")
											.create({
												name,
												description,
												account: accountId,
											});

										mutateUsers();
										setDialogCreateUserOpen(false);
									}}
								>
									<DialogHeader>
										<DialogTitle>
											Add user for installation '{installationData?.description}
											' in account '{accountData?.name}'
										</DialogTitle>
										<DialogDescription>
											Fill in a name and a description for the new user.
										</DialogDescription>
									</DialogHeader>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="name">Name</Label>
											<Input
												id="name"
												defaultValue=""
												placeholder="Enter user name"
												required
											/>
										</div>
									</div>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="description">Description</Label>
											<Input
												id="description"
												defaultValue=""
												placeholder="Enter user description"
												required
											/>
										</div>
									</div>
									<DialogFooter className="justify-end mt-2">
										<DialogClose asChild>
											<Button type="button" variant="secondary">
												Close
											</Button>
										</DialogClose>
										<Button type="submit" className="px-3">
											<Save />
											<span>Add User</span>
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					}
				/>
			</div>
		</div>
	);
}
