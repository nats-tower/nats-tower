import { pb } from "@/lib/pocketbase";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";

import type {
    NatsAuthLimitsRecord,
} from "@/lib/pocketbase-types";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { toStringSigBytesPerKB } from "@/lib/utils";

export function getLimitsColumns(limitsMutate: () => void): ColumnDef<NatsAuthLimitsRecord>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        return <div className="font-medium">{row.original.name}</div>;
      },
    },
    {
      id: "max_connections",
      accessorKey: "max_connections",
      header: "Max Connections",
      cell: ({ row }) => {
        return (
          <div>
            {row.original.max_connections === -1
              ? "Unlimited"
              : row.original.max_connections}
          </div>
        );
      },
    },
    {
      id: "jetstream_max_disk",
      accessorKey: "jetstream_max_disk",
      header: "Jetstream Max Disk",
      cell: ({ row }) => {
        return (
          <div>
            {row.original.jetstream_max_disk === -1 || row.original.jetstream_max_disk === undefined
              ? "Unlimited"
              : toStringSigBytesPerKB(row.original.jetstream_max_disk, 2, 1024)}
          </div>
        );
      },
    },
    {
      id: "jetstream_max_memory",
      accessorKey: "jetstream_max_memory",
      header: "Jetstream Max Memory",
      cell: ({ row }) => {
        return (
          <div>
            {row.original.jetstream_max_memory === -1 || row.original.jetstream_max_memory === undefined
              ? "Unlimited"
              : toStringSigBytesPerKB(row.original.jetstream_max_memory, 2, 1024)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const limit = row.original;
        
        return (
          <div className="text-right">
            {pb.authStore.isSuperuser ? (
              <Popover>
                <PopoverTrigger
                  asChild
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Button variant="outline" size="icon" className="ml-2">
                    <DotsVerticalIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-1 w-auto">
                  <div className="grid">
                    <Button
                      variant="ghost"
                      className="hover:bg-red-200 w-full"
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this limit?"
                          )
                        ) {
                          await pb
                            .collection<NatsAuthLimitsRecord>(
                              "nats_auth_limits"
                            )
                            .delete(limit.id);
                          limitsMutate();
                        }
                      }}
                    >
                      <TrashIcon className="mr-1" /> Delete Limit
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span>{"<None>"}</span>
            )}
          </div>
        );
      },
    },
  ];
}
