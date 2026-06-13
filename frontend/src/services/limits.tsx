import { pb } from "@/lib/pocketbase";
import type { NatsAuthLimitsRecord } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function useInstallationLimits(installationId: string) {
	return useSWR(
		[`/installations/${installationId}/limits`, installationId],
		async () => {
			return pb
				.collection<NatsAuthLimitsRecord>("nats_auth_limits")
				.getFullList({
					filter: `operator = '${installationId}'`,
				});
		},
	);
}
