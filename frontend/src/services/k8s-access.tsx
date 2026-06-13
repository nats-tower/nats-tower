import { pb } from "@/lib/pocketbase";
import type { NatsAuthK8sAccessResponse } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function useK8sAccessForAccount(accountId: string) {
	return useSWR(
		[`/accounts/${accountId}/k8s_access`, accountId],
		async ([_, pAccountId]) => {
			if (!pAccountId) {
				return;
			}
			return pb
				.collection<NatsAuthK8sAccessResponse>("nats_auth_k8s_access")
				.getFullList({
					filter: `account = '${pAccountId}'`,
				});
		},
	);
}
