import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { importsQueries } from "@/lib/api/query-factories/imports";
import type { AccountImport } from "@/lib/api/types/expanded-pocketbase-types";
import { toast } from "sonner";

export interface AccountImportList {
  imports: AccountImport[];
}

/**
 * Hook to fetch account imports
 */
export function useAccountImports(installationId: string, accountId: string) {
  return useQuery({
    queryKey: importsQueries.list(installationId, accountId),
    queryFn: async () => {
      const res = await pb.send<AccountImportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/imports`,
        {
          method: "GET",
        }
      );

      return res.imports.map((importItem) => ({
        name: importItem.name,
        subject: importItem.subject,
        local_subject: importItem.local_subject,
        type: importItem.type,
        account: importItem.account,
      }));
    },
    enabled: !!accountId && !!installationId,
  });
}

/**
 * Hook to upsert (create or update) an account import
 */
export function useUpsertAccountImport(
  installationId: string,
  accountId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountImport: AccountImport) => {
      return pb.send<AccountImportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/imports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: accountImport,
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: importsQueries.list(installationId, accountId),
      });
      toast.success("Import saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save import:", error);
      toast.error("Failed to save import");
    },
  });
}

/**
 * Hook to delete an account import
 */
export function useDeleteAccountImport(
  installationId: string,
  accountId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importName: string) => {
      return pb.send<AccountImportList>(
        `/api/nats-tower/installations/${installationId}/accounts/${accountId}/imports/${importName}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: importsQueries.list(installationId, accountId),
      });
      toast.success("Import deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete import:", error);
      toast.error("Failed to delete import");
    },
  });
}
