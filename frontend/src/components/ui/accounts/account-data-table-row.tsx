import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthAccountsPendingRecord,
	NatsAuthAccountsRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import {
	InfoCircledIcon,
	LockOpen1Icon,
	DotsVerticalIcon,
	QuestionMarkIcon,
} from "@radix-ui/react-icons";
import { Check, ClockArrowUp, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { AccountInfoSheet } from "../account-info-sheet";
import { Button } from "../button";
import { MultiSelect } from "../multi-select-dialog";
import { SheetTrigger, SheetContent, Sheet } from "../sheet";
import { TableCell, TableRow } from "../table";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { useNavigate } from "@tanstack/react-router";
import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

interface AccountDataTableRowProps {
	installationData: ExpandedNatsAuthOperatorsResponse | undefined;
	teamsData: TeamsRecord[] | undefined;
	pendingAccountData: NatsAuthAccountsPendingRecord[] | undefined;
	account: NatsAuthAccountsRecord;
	installationId: string;
	mutateAccounts: () => void;
}

export function AccountDataTableRow({
	installationData,
	teamsData,
	pendingAccountData,
	account,
	installationId,
	mutateAccounts,
}: AccountDataTableRowProps) {
	const navigate = useNavigate();

	const availableTeams = () => {
		if (installationData?.expand.teams) {
			return installationData.expand.teams;
		}
		if (teamsData) {
			return teamsData;
		}
		return [];
	};

	const getAccountStatusIcon = () => {
		if (!pendingAccountData) {
			return <QuestionMarkIcon />; // or some default icon
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

	return (
		<TableRow>
			<TableCell className="font-medium">{getAccountStatusIcon()}</TableCell>
			<TableCell className="font-medium">{account.name}</TableCell>
			<TableCell>{account.description}</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end">
					<Sheet>
						<SheetTrigger
							asChild
							onClick={(e) => {
								e.stopPropagation();
							}}
						>
							<Button variant="outline">
								<InfoCircledIcon className="mr-1" /> Info
							</Button>
						</SheetTrigger>
						<SheetContent className="sm:max-w-5xl">
							<AccountInfoSheet
								installationId={installationId}
								accountId={account.id}
							/>
						</SheetContent>
					</Sheet>

					{pb.authStore.isSuperuser && account.name !== "SYS" ? (
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
							className="w-[300px] ml-2"
						/>
					) : undefined}

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

					{account.name !== "SYS" && pb.authStore.isSuperuser ? (
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
										className="hover:bg-red-200 w-full"
										onClick={async () => {
											if (
												confirm("Are you sure you want to delete this account?")
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
								</div>
							</PopoverContent>
						</Popover>
					) : undefined}
				</div>
			</TableCell>
		</TableRow>
	);
}
