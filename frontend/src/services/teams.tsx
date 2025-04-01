import { pb } from "@/lib/pocketbase";
import type { TeamsRecord } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function getTeams() {
	return useSWR(["teams"], async ([_]) => {
		return pb.collection<TeamsRecord>("teams").getFullList();
	});
}

export function getTeam(teamId: string) {
	return useSWR([`/teams/${teamId}`, teamId], async ([_, pTeamId]) => {
		if (!pTeamId) {
			return;
		}
		return pb.collection<TeamsRecord>("teams").getOne(pTeamId);
	});
}
