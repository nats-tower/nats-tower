import { pb } from "@/lib/pocketbase";
import type { ColumnDef } from "@tanstack/react-table";
import type { NatsAuthK8sAccessRecord } from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function getK8sAccessColumns(
	mutateK8sAccess: () => void,
): ColumnDef<NatsAuthK8sAccessRecord>[] {
	return [
		{
			id: "cluster",
			accessorKey: "cluster",
			header: "Cluster-ID",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.cluster}</div>;
			},
		},
		{
			id: "namespace",
			accessorKey: "namespace",
			header: "Namespace",
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const k8sAccess = row.original;

				return (
					<div className="text-right">
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
													"Are you sure you want to delete this Kubernetes Access?",
												)
											) {
												await pb
													.collection<NatsAuthK8sAccessRecord>(
														"nats_auth_k8s_access",
													)
													.delete(k8sAccess.id);
												mutateK8sAccess();
											}
										}}
									>
										<TrashIcon className="mr-1" /> Delete Kubernetes Access
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				);
			},
		},
	];
}
