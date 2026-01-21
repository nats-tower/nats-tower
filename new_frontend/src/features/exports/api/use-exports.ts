import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { exportsQueries } from "@/lib/api/query-factories/exports";
import type { AccountExport } from "@/lib/api/types/expanded-pocketbase-types";
import { toast } from "sonner";

export interface AccountExportList {
  exports: AccountExport[];
}

/**
 * Hook to fetch account exports
 */
export function useAccountExports(installationId: string, accountId: string) {
  return useQuery({
    queryKey: exportsQueries.list(installationId, accountId),
    queryFn: async () => {
      const res = await pb.send<AccountExportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports`,
        {
          method: "GET",
        }
      );

      return res.exports.map((exportItem) => ({
        name: exportItem.name,
        subject: exportItem.subject,
        type: exportItem.type,
      }));
    },
    enabled: !!accountId && !!installationId,
  });
}

/**
 * Hook to fetch available exports for an account
 */
export function useAvailableExports(
  installationId: string,
  accountName: string
) {
  return useQuery({
    queryKey: exportsQueries.available(installationId, accountName),
    queryFn: async () => {
      return pb.send<{
        account_exports: {
          [name: string]: AccountExport[];
        };
      }>(`/api/nats-tower/installations/${installationId}/exports`, {
        method: "GET",
      });
    },
    enabled: !!accountName && !!installationId,
  });
}

/**
 * Hook to upsert (create or update) an account export
 */
export function useUpsertAccountExport(
  installationId: string,
  accountId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountExport: AccountExport) => {
      return pb.send<AccountExportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: accountExport,
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: exportsQueries.list(installationId, accountId),
      });
      toast.success("Export saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save export:", error);
      toast.error("Failed to save export");
    },
  });
}

/**
 * Hook to delete an account export
 */
export function useDeleteAccountExport(
  installationId: string,
  accountId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exportName: string) => {
      return pb.send<AccountExportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/exports/${exportName}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: exportsQueries.list(installationId, accountId),
      });
      toast.success("Export deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete export:", error);
      toast.error("Failed to delete export");
    },
  });
}
