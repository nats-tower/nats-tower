import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
	TeamsRecord,
	UsersRecord,
} from "@/lib/pocketbase-types";
import { cn, toStringSigBytesPerKB } from "@/lib/utils";
import useSWR from "swr";
import { Card, CardContent, CardHeader } from "./card";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
	type ColumnDef,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	ChevronsUpDown,
	Command,
	MoreHorizontal,
	Plus,
} from "lucide-react";
import { Button } from "./button";
import type {
	ColumnFiltersState,
	Table as TableInstance,
} from "@tanstack/react-table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";
import { ReactElement, useState } from "react";
import { Input } from "./input";
import { toast } from "sonner";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";
import { Textarea } from "./textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";

export interface InstallationTeamInfoProps {
	installation: ExpandedNatsAuthOperatorsResponse;
}
export function InstallationTeamInfo({
	installation,
}: InstallationTeamInfoProps) {
	return (
		<Card className="w-full">
			<CardHeader className="text-gray-500">Teams</CardHeader>
			<CardContent>
				{installation.expand.teams ? (
					<DataTable
						columns={columns}
						data={installation.expand.teams}
						addButton={
							<Button variant="outline">
								<Plus /> Add Team
							</Button>
						}
					/>
				) : (
					<div>Every team has access has access</div>
				)}
			</CardContent>
		</Card>
	);
}

export const columns: ColumnDef<TeamsRecord>[] = [
	{
		accessorKey: "name",
		header: "Name",
	},
	{
		accessorKey: "members",
		header: "Members",
		cell: ({ row }) => {
			const members = row.original.members || [];
			return <div className="">{members.length} members</div>;
		},
	},
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => {
			const team = row.original;
			const [dialogManageMembersOpen, setDialogManageMembersOpen] =
				useState(false);

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
						<Dialog
							open={dialogManageMembersOpen}
							onOpenChange={setDialogManageMembersOpen}
						>
							<DialogTrigger asChild>
								<DropdownMenuItem
									onClick={(ev) => {
										ev.stopPropagation();
										setDialogManageMembersOpen(true);
										ev.preventDefault();
									}}
								>
									Manage members
								</DropdownMenuItem>
							</DialogTrigger>

							<DialogContent className="sm:max-w-5xl">
								<DialogHeader>
									<DialogTitle>Members of team '{team.name}'</DialogTitle>
									<DialogDescription>
										Manage membership for this team.
									</DialogDescription>
								</DialogHeader>
								<TeamMembershipDialogContent team={team} />
								<DialogFooter className="justify-end mt-2">
									<DialogClose asChild>
										<Button type="button" variant="secondary">
											Close
										</Button>
									</DialogClose>
								</DialogFooter>
							</DialogContent>
						</Dialog>
						<DropdownMenuItem
							onClick={() => {
								if (
									confirm(
										`Are you sure you want to delete the team ${team.name}?`,
									)
								) {
									pb.collection<TeamsRecord>("teams")
										.delete(team.id)
										.then(() => {
											toast(`Team ${team.name} deleted successfully`);
										})
										.catch((error) => {
											toast.error(
												`Error deleting team ${team.name}: ${error.message}`,
											);
										});
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

export const memberColumns: ColumnDef<{
	user: UsersRecord;
	team: TeamsRecord;
}>[] = [
	{
		accessorKey: "name",
		header: "Name",
	},
	{
		accessorKey: "email",
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
							onClick={() => {
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

									pb.collection<TeamsRecord>("teams")
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

interface TeamMembershipDialogContentProps {
	team: TeamsRecord;
}

export function TeamMembershipDialogContent({
	team,
}: TeamMembershipDialogContentProps) {
	const { data, error, isLoading } = useSWR(
		[`/teams/${team.id}/members`, team.id],
		async ([_, pTeamId]) => {
			if (!pTeamId) {
				return;
			}
			return pb.collection<UsersRecord>("users").getFullList();
		},
	);

	if (error) {
		return <div>Error loading team members</div>;
	}

	if (isLoading) {
		return <div>Loading team members...</div>;
	}
	if (!data) {
		return <div>No team members found</div>;
	}

	const members = data
		.filter((user) => team.members?.includes(user.id))
		.map((user) => ({
			user,
			team,
		}));

	return (
		<DataTable
			columns={memberColumns}
			data={members}
			addButton={
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							className={cn(
								"w-[200px] justify-between",
								"text-muted-foreground",
							)}
						>
							Select user to add
							<ChevronsUpDown className="opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-0">
						<Command>
							<CommandInput placeholder="Search framework..." className="h-9" />
							<CommandList>
								<CommandEmpty>No framework found.</CommandEmpty>
								<CommandGroup>
									{data
										.filter((user) => !team.members?.includes(user.id))
										.map((user) => (
											<CommandItem
												value={user.id}
												key={user.id}
												onSelect={() => {
													// Add user to team
													const updatedMembers = [
														...(team.members || []),
														user.id,
													];
													team.members = updatedMembers;

													pb.collection<TeamsRecord>("teams")
														.update(team.id, { members: updatedMembers })
														.then(() => {
															toast(
																`User ${user.name} added to team ${team.name} successfully`,
															);
														})
														.catch((error) => {
															toast.error(
																`Error adding user ${user.name} to team ${team.name}: ${error.message}`,
															);
														});
												}}
											>
												{user.name}
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
		/>
	);
}

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	addButton?: ReactElement;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	addButton,
}: DataTableProps<TData, TValue>) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			columnFilters,
		},
	});

	return (
		<div>
			<div className="flex flex-row items-center justify-between">
				<div className="flex items-center py-4">
					<Input
						placeholder="Filter names..."
						value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
						onChange={(event) =>
							table.getColumn("name")?.setFilterValue(event.target.value)
						}
						className="max-w-sm"
					/>
				</div>
				<div>{addButton}</div>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
}

interface DataTablePaginationProps<TData> {
	table: TableInstance<TData>;
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	return (
		<div className="flex items-center justify-between px-2">
			<div className="flex-1 text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length} of{" "}
				{table.getFilteredRowModel().rows.length} row(s) selected.
			</div>
			<div className="flex items-center space-x-6 lg:space-x-8">
				<div className="flex items-center space-x-2">
					<p className="text-sm font-medium">Rows per page</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex w-[100px] items-center justify-center text-sm font-medium">
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to first page</span>
						<ChevronsLeft />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to previous page</span>
						<ChevronLeft />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to next page</span>
						<ChevronRight />
					</Button>
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to last page</span>
						<ChevronsRight />
					</Button>
				</div>
			</div>
		</div>
	);
}
