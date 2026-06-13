import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import type { NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function useInstallations() {
	return useSWR(["/installations"], async ([_]) => {
		return pb
			.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
			.getFullList();
	});
}

export function useInstallationById(installationId: string) {
	return useSWR(
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
}

export function useInstallationByIdWithTeams(installationId: string) {
	return useSWR(
		[`/installations_with_teams/${installationId}`, installationId],
		async ([_, pInstallationId]) => {
			return pb
				.collection<ExpandedNatsAuthOperatorsResponse>("nats_auth_operators")
				.getOne(pInstallationId, {
					expand: "teams",
				});
		},
	);
}

export function useInstallationsTeams(installationId: string) {
	return useSWR(
		[`/installations_with_teams/${installationId}`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<ExpandedNatsAuthOperatorsResponse>("nats_auth_operators")
				.getOne(pInstallationId, {
					expand: "teams",
				});
		},
	);
}
