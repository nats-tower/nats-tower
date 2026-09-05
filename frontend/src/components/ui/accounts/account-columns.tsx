import type { ColumnDef } from "@tanstack/react-table";
import type {
	NatsAuthAccountsRecord,
	NatsAuthAccountsPendingRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import { BoxesIcon, Check, ClockArrowUp, ImportIcon, TrashIcon, UploadIcon } from "lucide-react";
import {
	QuestionMarkIcon,
	InfoCircledIcon,
	LockOpen1Icon,
	DotsVerticalIcon,
} from "@radix-ui/react-icons";
import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";
import { Button } from "../button";
import { MultiSelect } from "../multi-select-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "../tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "../popover";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import type { UseNavigateResult } from "@tanstack/react-router";

export function getAccountsColumns(
	navigate: UseNavigateResult<string>,
	installationData: ExpandedNatsAuthOperatorsResponse | undefined,
	teamsData: TeamsRecord[] | undefined,
	pendingAccountData: NatsAuthAccountsPendingRecord[] | undefined,
	installationId: string,
	mutateAccounts: () => void,
): ColumnDef<NatsAuthAccountsRecord>[] {
	const availableTeams = () => {
		if (installationData?.expand.teams) {
			return installationData.expand.teams;
		}
		if (teamsData) {
			return teamsData;
		}
		return [];
	};

	const getAccountStatusIcon = (account: NatsAuthAccountsRecord) => {
		if (!pendingAccountData) {
			return <QuestionMarkIcon />;
		}

		const pendingAccount = pendingAccountData.find(
			(pendingAccount) => pendingAccount.account === account.id,
		);
		if (pendingAccount) {
			switch (pendingAccount.action) {
				case "delete":
					return (
						<Tooltip>
							<TooltipTrigger asChild>
								<TrashIcon className="text-red-500" />
							</TooltipTrigger>
							<TooltipContent className="border border-input shadow-sm bg-accent text-accent-foreground">
								<p>
									This account is queued for processing and <b>not</b> yet
									removed.
								</p>
								<p>
									Message:{" "}
									{pendingAccount.message
										? pendingAccount.message
										: "No additional information available."}
								</p>
							</TooltipContent>
						</Tooltip>
					);
				case "upsert":
					return (
						<Tooltip>
							<TooltipTrigger asChild>
								<ClockArrowUp />
							</TooltipTrigger>
							<TooltipContent className="border border-input shadow-sm bg-accent text-accent-foreground">
								<p>
									This account is queued for processing and <b>not</b> yet
									active.
								</p>
								<p>
									Message:{" "}
									{pendingAccount.message
										? pendingAccount.message
										: "No additional information available."}
								</p>
							</TooltipContent>
						</Tooltip>
					);
				default:
					return <QuestionMarkIcon className="text-yellow-500" />;
			}
		}

		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Check />
				</TooltipTrigger>
				<TooltipContent className="border border-input shadow-sm bg-accent text-accent-foreground">
					<p>
						This account has been processed and <b>is</b> active.
					</p>
				</TooltipContent>
			</Tooltip>
		);
	};

	return [
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => {
				const account = row.original;
				return <div className="w-[100px]">{getAccountStatusIcon(account)}</div>;
			},
		},
		{
			id: "name",
			header: "Name",
			accessorKey: "name",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.name}</div>;
			},
		},
		{
			id: "description",
			header: "Description",
			accessorKey: "description",
		},
		{
			id: "teams",
			header: "Teams",
			cell: ({ row }) => {
				const account = row.original;

				if (!pb.authStore.isSuperuser || account.name === "SYS") {
					return null;
				}

				return (
					<MultiSelect
						options={availableTeams().map((team) => {
							return {
								label: team.name,
								value: team.id,
							};
						})}
						onValueChange={(value) => {
							pb.collection<NatsAuthAccountsRecord>(
								"nats_auth_accounts",
							).update(account.id, {
								teams: value,
							});
							mutateAccounts();
							toast("Teams updated successfully.");
						}}
						defaultValue={account.teams ?? []}
						placeholder="Select teams with access"
						variant="inverted"
						maxCount={0}
						className="w-[300px]"
					/>
				);
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const account = row.original;

				return (
					<div className="flex items-center justify-end">
						<Button
							variant="outline"
							onClick={(e) => {
								e.stopPropagation();
								navigate({
									to: `/installations/${installationId}/accounts/${account.id}/info`,
								});
							}}
						>
							<InfoCircledIcon className="mr-1" /> Info
						</Button>

						<Button
							variant="outline"
							className="ml-2"
							onClick={() => {
								navigate({
									to: `/installations/${installationId}/accounts/${account.id}/users`,
								});
							}}
						>
							<LockOpen1Icon className="mr-1" /> Manage Users
						</Button>

						{account.name !== "SYS" ? (
							<Popover>
								<PopoverTrigger
									asChild
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									<Button variant="outline" size="icon" className="ml-2">
										<DotsVerticalIcon />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-1 w-auto">
									<div className="grid">
										<Button
											variant="ghost"
											className="w-full flex items-center justify-start"
											onClick={async () => {
												navigate({
													to: `/installations/${installationId}/accounts/${account.id}/exports`,
												});
											}}
										>
											<UploadIcon className="mr-1" /> Manage Exports
										</Button>
										<Button
											variant="ghost"
											className="w-full flex items-center justify-start"
											onClick={async () => {
												navigate({
													to: `/installations/${installationId}/accounts/${account.id}/imports`,
												});
											}}
										>
											<ImportIcon className="mr-1" /> Manage Imports
										</Button>
										<Button
											variant="ghost"
											className="w-full flex items-center justify-start"
											onClick={async () => {
												navigate({
													to: `/installations/${installationId}/accounts/${account.id}/k8s-access`,
												});
											}}
										>
											<BoxesIcon className="mr-1" /> Manage Kubernetes Access
										</Button>
										{pb.authStore.isSuperuser ? (
											<Button
												variant="ghost"
												className="hover:bg-red-200 w-full flex items-center justify-start"
												onClick={async () => {
													if (
														confirm(
															"Are you sure you want to delete this account?",
														)
													) {
														await pb
															.collection<NatsAuthAccountsRecord>(
																"nats_auth_accounts",
															)
															.delete(account.id);
														mutateAccounts();
													}
												}}
											>
												<TrashIcon className="mr-1" /> Delete Account
											</Button>
										) : undefined}
									</div>
								</PopoverContent>
							</Popover>
						) : undefined}
					</div>
				);
			},
		},
	];
}
