import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import { Card, CardContent, CardHeader } from "../card";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { TeamListAddButton } from "./team-list-add-button";
import { TeamListActions } from "./team-list-actions";

export interface InstallationTeamInfoProps {
	installation: ExpandedNatsAuthOperatorsResponse;
	refresh: () => void;
}
export function InstallationTeamInfo({
	installation,
	refresh,
}: InstallationTeamInfoProps) {
	const assignedTeams = installation.expand.teams || [];

	return (
		<Card className="w-full">
			<CardHeader className="text-muted-foreground">Teams</CardHeader>
			<CardContent>
				{pb.authStore.isSuperuser ? (
					<div className="text-muted-foreground text-sm">
						Add teams to give specific access to this installation. Remove all
						teams from this list to grant every team access.
					</div>
				) : (
					<div className="text-muted-foreground text-sm">
						Teams listed here have access to this installation. An empty list
						means that every team has access.
					</div>
				)}
				<DataTable
					noRowsText="Every team has access"
					columns={getTeamsColumns(refresh)}
					data={assignedTeams.map((team) => ({
						installation,
						team,
					}))}
					addButton={
						pb.authStore.isSuperuser ? (
							<TeamListAddButton
								installation={installation}
								assignedTeams={assignedTeams}
								refresh={refresh}
							/>
						) : undefined
					}
				/>
			</CardContent>
		</Card>
	);
}

export function getTeamsColumns(refresh: () => void): ColumnDef<{
	installation: NatsAuthOperatorsRecord;
	team: TeamsRecord;
}>[] {
	return [
		{
			id: "name",
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => {
				return <div className="">{row.original.team.name}</div>;
			},
		},
		{
			id: "members",
			accessorKey: "members",
			header: "Members",
			cell: ({ row }) => {
				const members = row.original.team.members || [];
				return <div className="">{members.length} members</div>;
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const team = row.original.team;
				const installation = row.original.installation;

				return (
					<TeamListActions
						installation={installation}
						team={team}
						refresh={refresh}
					/>
				);
			},
		},
	];
}
