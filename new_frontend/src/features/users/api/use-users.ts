import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { usersQueries } from "@/lib/api/query-factories/users";
import type { UsersRecord } from "@/lib/api/types/pocketbase-types";

/**
 * Hook to fetch all users
 */
export function useUsers() {
  return useQuery({
    queryKey: usersQueries.list(),
    queryFn: async () => {
      return pb.collection<UsersRecord>("users").getFullList();
    },
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: usersQueries.detail(userId),
    queryFn: async () => {
      return pb.collection<UsersRecord>("users").getOne(userId);
    },
    enabled: !!userId,
  });
}
