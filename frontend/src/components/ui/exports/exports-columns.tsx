import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { AccountExport } from "@/lib/expanded-pocketbase-types";
import { deleteAccountExport } from "@/services/exports";
import { toast } from "sonner";

export function getExportColumns(
	installationId: string,
	accountId: string,
	mutateExports: () => void,
): ColumnDef<AccountExport>[] {
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
			id: "type",
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.type}</div>;
			},
		},
		{
			id: "subject",
			accessorKey: "subject",
			header: "Subject",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.subject}</div>;
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const accountExport = row.original;

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
												confirm("Are you sure you want to delete this Export?")
											) {
												await deleteAccountExport(
													installationId,
													accountId,
													accountExport.name,
												);
												toast("Export deleted successfully.");
												mutateExports();
											}
										}}
									>
										<TrashIcon className="mr-1" /> Delete Export
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
