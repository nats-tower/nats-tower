import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { accountsQueries } from "@/lib/api/query-factories/accounts";
import type {
  NatsAuthAccountsPendingRecord,
  NatsAuthAccountsResponse,
} from "@/lib/api/types/pocketbase-types";
import type { ExpandedNatsAuthAccountsResponse } from "@/lib/api/types/expanded-pocketbase-types";

/**
 * Hook to fetch pending account actions for an installation
 */
export function usePendingAccountActions(installationId: string) {
  return useQuery({
    queryKey: accountsQueries.pendingActions(installationId),
    queryFn: async () => {
      return pb
        .collection<NatsAuthAccountsPendingRecord>("nats_auth_accounts_pending")
        .getFullList();
    },
    enabled: !!installationId,
  });
}

/**
 * Hook to fetch accounts with teams for an installation
 */
export function useAccountsWithTeams(installationId: string) {
  return useQuery({
    queryKey: accountsQueries.listWithTeams(installationId),
    queryFn: async () => {
      return pb
        .collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
        .getFullList(undefined, {
          filter: `operator = '${installationId}'`,
          expand: "teams",
        });
    },
    enabled: !!installationId,
  });
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(installationId: string, accountId: string) {
  return useQuery({
    queryKey: accountsQueries.detail(installationId, accountId),
    queryFn: async () => {
      return pb
        .collection<NatsAuthAccountsResponse>("nats_auth_accounts")
        .getFirstListItem(
          `operator = '${installationId}' && id = '${accountId}'`
        );
    },
    enabled: !!installationId && !!accountId,
  });
}

/**
 * Hook to fetch an account with teams
 */
export function useAccountWithTeams(installationId: string, accountId: string) {
  return useQuery({
    queryKey: accountsQueries.detailWithTeams(installationId, accountId),
    queryFn: async () => {
      return pb
        .collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
        .getFirstListItem(
          `operator = '${installationId}' && id = '${accountId}'`,
          {
            expand: "teams",
          }
        );
    },
    enabled: !!installationId && !!accountId,
  });
}
