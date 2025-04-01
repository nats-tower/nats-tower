import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../button";
import {
	DialogHeader,
	DialogFooter,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "../dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "../dropdown-menu";
import { TeamMembershipDialogContent } from "./team-membership-dialog";
import { useState } from "react";

interface TeamListActionsProps {
	team: TeamsRecord;
	installation: NatsAuthOperatorsRecord;
	refresh: () => void;
}

export function TeamListActions({
	team,
	installation,
	refresh,
}: TeamListActionsProps) {
	const [dialogManageMembersOpen, setDialogManageMembersOpen] = useState(false);

	if (!pb.authStore.isSuperuser) {
		return <div>{"<None>"}</div>;
	}
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
					onOpenChange={(open) => {
						if (!open && dialogManageMembersOpen) {
							refresh();
						}
						setDialogManageMembersOpen(open);
					}}
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
						<TeamMembershipDialogContent teamId={team.id} />
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
					onClick={async (ev) => {
						ev.stopPropagation();
						ev.preventDefault();
						if (
							confirm(
								`Are you sure you want to remove access for the team ${team.name}?`,
							)
						) {
							await pb
								.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
								.update(installation.id, {
									teams: (installation.teams ?? []).filter(
										(t) => t !== team.id,
									),
								})
								.then(() => {
									toast(`Team ${team.name} removed successfully`);
								})
								.catch((error) => {
									toast.error(
										`Error removing team ${team.name}: ${error.message}`,
									);
								});

							refresh();
						}
					}}
				>
					Remove access
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
