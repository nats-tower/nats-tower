import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DotsVerticalIcon, TrashIcon } from "@radix-ui/react-icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { AccountImport } from "@/lib/expanded-pocketbase-types";
import { deleteAccountImport } from "@/services/imports";
import { toast } from "sonner";

export function getImportColumns(
	installationId: string,
	accountId: string,
	mutateImports: () => void,
): ColumnDef<AccountImport>[] {
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
			id: "account",
			accessorKey: "account",
			header: "Imported from Account",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.account}</div>;
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
			id: "local_subject",
			accessorKey: "local_subject",
			header: "To",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.local_subject}</div>;
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const accountImport = row.original;

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
												confirm("Are you sure you want to delete this Import?")
											) {
												await deleteAccountImport(
													installationId,
													accountId,
													accountImport.name,
												);
												toast("Import deleted successfully.");
												mutateImports();
											}
										}}
									>
										<TrashIcon className="mr-1" /> Delete Import
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
