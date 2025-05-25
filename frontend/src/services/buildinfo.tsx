import type { BuildInfo } from "@/lib/expanded-pocketbase-types";
import { pb } from "@/lib/pocketbase";
import useSWR from "swr";

export function getBuildInfo() {
	return useSWR(
		["/buildinfo"],
		async ([_]) => {
			return pb
				.send<BuildInfo>(
					"/api/build_info",
					{
						method: "GET",
					},
				);
		},
	);
}
