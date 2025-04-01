import { pb } from "@/lib/pocketbase";
import type { UsersRecord } from "@/lib/pocketbase-types";
import useSWR from "swr";

export function getUsers() {
	return useSWR(["users"], async ([_]) => {
		return pb.collection<UsersRecord>("users").getFullList();
	});
}
