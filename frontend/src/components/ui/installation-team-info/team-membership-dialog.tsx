import { pb } from "@/lib/pocketbase";
import type { TeamsRecord, UsersRecord } from "@/lib/pocketbase-types";
import { cn } from "@/lib/utils";
import { useTeam } from "@/services/teams";
import { useUsers } from "@/services/users";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronsUpDown, Check, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../button";
import { DataTable } from "../data-table";
import { Input } from "../input";
import { Popover, PopoverContent, PopoverTrigger } from "../popover-dialog";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "../dropdown-menu";

interface TeamMembershipDialogContentProps {
	teamId: string;
}

export function TeamMembershipDialogContent({
	teamId,
}: TeamMembershipDialogContentProps) {
	const { data, error, isLoading } = useUsers();

	const {
		data: teamData,
		error: teamError,
		isLoading: teamIsLoading,
		mutate: teamMutate,
	} = useTeam(teamId);

	if (error || teamError) {
		return <div>Error loading team members</div>;
	}

	if (isLoading || teamIsLoading) {
		return <div>Loading team members...</div>;
	}
	if (!data || !teamData) {
		return <div>No team members found</div>;
	}

	const members = data
		.filter((user) => teamData.members?.includes(user.id))
		.map((user) => ({
			user,
			team: teamData,
		}));

	return (
		<DataTable
			columns={getMemberColumns(() => {
				teamMutate();
				//mutate();
			})}
			data={members}
			addButton={
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn(
								"w-[200px] justify-between",
								"text-muted-foreground",
							)}
						>
							Select user to add
							<ChevronsUpDown className="opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[400px] p-0">
						<Command>
							<CommandInput placeholder="Search user..." className="h-9" />
							<CommandList>
								<CommandEmpty>No users found.</CommandEmpty>
								<CommandGroup>
									{data
										.filter((user) => !teamData.members?.includes(user.id))
										.map((user) => (
											<CommandItem
												value={`${user.name} ${user.email}`}
												key={user.id}
												onSelect={async () => {
													// Add user to team
													const updatedMembers = [
														...(teamData.members || []),
														user.id,
													];
													teamData.members = updatedMembers;

													await pb
														.collection<TeamsRecord>("teams")
														.update(teamData.id, { members: updatedMembers })
														.then(() => {
															toast(
																`User ${user.name} added to team ${teamData.name} successfully`,
															);
														})
														.catch((error) => {
															toast.error(
																`Error adding user ${user.name} to team ${teamData.name}: ${error.message}`,
															);
														});

													teamMutate();
												}}
											>
												<div>
													{user.name === "" || user.name === undefined
														? "<No name>"
														: user.name}
												</div>
												<div className="text-sm text-muted-foreground">
													{user.email}
												</div>
												<Check
													className={cn(
														"ml-auto",
														members.some((member) => member.user.id === user.id)
															? "opacity-100"
															: "opacity-0",
													)}
												/>
											</CommandItem>
										))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			}
			filter={(table) => {
				return (
					<Input
						placeholder="Filter names..."
						value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
						onChange={(event) =>
							table.getColumn("name")?.setFilterValue(event.target.value)
						}
						className="max-w-sm"
					/>
				);
			}}
		/>
	);
}

export function getMemberColumns(refresh: () => void): ColumnDef<{
	user: UsersRecord;
	team: TeamsRecord;
}>[] {
	return [
		{
			id: "name",
			accessorKey: "user.name",
			header: "Name",
			cell: ({ row }) => {
				const user = row.original.user;
				return <div className="">{user.name || "<No name>"}</div>;
			},
		},
		{
			id: "email",
			accessorKey: "user.email",
			header: "Email",
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const user = row.original.user;
				const team = row.original.team;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={async (ev) => {
									ev.stopPropagation();
									ev.preventDefault();
									if (
										confirm(
											`Are you sure you want to remove the user ${user.name} from team ${team.name}?`,
										)
									) {
										// Remove user from team
										const updatedMembers = (team.members || []).filter(
											(member) => member !== user.id,
										);
										team.members = updatedMembers;

										await pb
											.collection<TeamsRecord>("teams")
											.update(team.id, { members: updatedMembers })
											.then(() => {
												toast(
													`User ${user.name} removed from team ${team.name} successfully`,
												);
											})
											.catch((error) => {
												toast.error(
													`Error removing user ${user.name} from team ${team.name}: ${error.message}`,
												);
											});

										refresh();
									}
								}}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];
}
