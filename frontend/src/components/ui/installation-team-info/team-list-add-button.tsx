import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../command";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { getTeams } from "@/services/teams";

interface TeamListAddButtonProps {
	installation: NatsAuthOperatorsRecord;
	assignedTeams: TeamsRecord[];
	refresh: () => void;
}

export function TeamListAddButton({
	installation,
	assignedTeams,
	refresh,
}: TeamListAddButtonProps) {
	const { data, error, isLoading } = getTeams();

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error loading teams: {error.message}</div>;
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("w-[200px] justify-between", "text-muted-foreground")}
				>
					Add Team Access
					<ChevronsUpDown className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0">
				<Command>
					<CommandInput placeholder="Search team..." className="h-9" />
					<CommandList>
						<CommandEmpty>No teams found.</CommandEmpty>
						<CommandGroup>
							{data
								? data.map((team) => (
										<CommandItem
											value={team.name}
											key={team.id}
											onSelect={async () => {
												// Add team to installation
												const updatedTeams = [
													...assignedTeams.map(
														(assignedTeam) => assignedTeam.id,
													),
													team.id,
												];
												installation.teams = updatedTeams;

												await pb
													.collection<NatsAuthOperatorsRecord>(
														"nats_auth_operators",
													)
													.update(installation.id, {
														teams: updatedTeams,
													})
													.then(() => {
														toast(
															`Team ${team.name} added to installation ${installation.description} successfully`,
														);
													})
													.catch((error) => {
														toast.error(
															`Error adding team ${team.name} to installation ${installation.description}: ${error.message}`,
														);
													});

												refresh();
											}}
										>
											<span>{team.name}</span>
											<Check
												className={cn(
													"ml-auto",
													assignedTeams.some((t) => t.id === team.id)
														? "opacity-100"
														: "opacity-0",
												)}
											/>
										</CommandItem>
									))
								: undefined}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
