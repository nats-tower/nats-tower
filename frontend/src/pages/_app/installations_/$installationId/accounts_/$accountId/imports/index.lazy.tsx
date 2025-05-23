import { createLazyFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, PlusIcon, Save } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getAccountById } from "@/services/accounts";
import { getInstallationById } from "@/services/installations";
import { getAvailableExports } from "@/services/exports";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { getImportColumns } from "@/components/ui/imports/imports-columns";
import { getAccountImports, upsertAccountImport } from "@/services/imports";
import type { AccountExport } from "@/lib/expanded-pocketbase-types";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover-dialog";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/imports/",
)({
	component: Imports,
});

const FormSchema = z.object({
	name: z
		.string({
			required_error: "Please provide a name for the import.",
		})
		.min(1, "Name is required"),
	source_index: z.string({
		required_error: "Please provide a source for the import.",
	}),
	local_subject: z.string().optional(),
});

type AccountExportWithId = {
	id: string;
	account_name: string;
} & AccountExport;

function Imports() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateImportOpen, setDialogCreateImportOpen] = useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = getInstallationById(installationId);

	const {
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = getAccountById(installationId, accountId);

	const {
		data: importData,
		error: importError,
		isLoading: importLoading,
		mutate: mutateImports,
	} = getAccountImports(installationId, accountId);

	const {
		data: availableExportsData,
		error: availableExportsError,
		isLoading: availableExportsLoading,
	} = getAvailableExports(installationId, accountId);

	if (installationError || accountError || importError || availableExportsError)
		return <div>failed to load</div>;
	if (
		installationLoading ||
		accountLoading ||
		importLoading ||
		availableExportsLoading
	)
		return <div>loading...</div>;
	if (
		!installationData ||
		!accountData ||
		!importData ||
		!availableExportsData
	) {
		return <div>no data</div>;
	}

	const getAvailableExportsAsArray = () => {
		const availableExports = availableExportsData.account_exports;
		const availableExportsArray: AccountExportWithId[] = [];
		for (const key of Object.keys(availableExports)) {
			const exportItems = availableExports[key];

			// hide SYS exports from everyone
			if (key === "SYS") {
				continue;
			}

			// hide export from same account
			if (key === accountData.name) {
				continue;
			}

			for (const exportItem of exportItems) {
				// only add exports that are not already imported
				if (
					importData.find(
						(importItem) =>
							importItem.type === exportItem.type &&
							importItem.subject === exportItem.subject,
					)
				) {
					continue;
				}

				availableExportsArray.push({
					id: `${key} / ${exportItem.type} / ${exportItem.subject}`,
					account_name: key,
					name: exportItem.name,
					type: exportItem.type,
					subject: exportItem.subject,
				});
			}
		}
		return availableExportsArray;
	};

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		const selectedExport =
			getAvailableExportsAsArray()[Number(data.source_index)];
		await upsertAccountImport(installationId, accountId, {
			name: data.name,
			account: selectedExport.account_name,
			type: selectedExport.type,
			subject: selectedExport.subject,
			local_subject: data.local_subject ?? "",
		});
		toast("Account import created successfully.");
		form.reset();

		mutateImports();
		setDialogCreateImportOpen(false);
	}
	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Account Imports</h2>
							<div className="text-sm text-gray-500">
								Manage imports for account '{accountData?.name}' on installation
								'{installationData?.description}'.
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getImportColumns(installationId, accountId, mutateImports)}
					data={importData || []}
					noRowsText="No Imports configured"
					addButton={
						<Dialog
							open={dialogCreateImportOpen}
							onOpenChange={setDialogCreateImportOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add Import
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-xl">
								<Form {...form}>
									<form
										className="space-y-4"
										onSubmit={form.handleSubmit(onSubmit)}
									>
										<DialogHeader>
											<DialogTitle>
												Add Import for installation '
												{installationData?.description}' in account '
												{accountData?.name}'
											</DialogTitle>
											<DialogDescription>
												Fill in the name, type and subject for the new Import.
											</DialogDescription>
										</DialogHeader>
										<div className="flex items-center space-x-2 mt-2">
											<div className="grid flex-1 gap-2">
												<FormField
													control={form.control}
													name="name"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Name</FormLabel>
															<FormControl>
																<Input
																	placeholder="Enter import name"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																This name must be unique in this account.
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</div>
										<div className="flex items-center space-x-2 mt-2">
											<div className="grid flex-1 gap-2">
												<FormField
													control={form.control}
													name="source_index"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Source</FormLabel>
															<Popover>
																<PopoverTrigger asChild>
																	<FormControl>
																		<Button
																			variant="outline"
																			className={cn(
																				"w-full justify-between",
																				!field.value && "text-muted-foreground",
																			)}
																		>
																			{field.value
																				? getAvailableExportsAsArray().find(
																						(_, index) =>
																							`${index}` === field.value,
																					)?.id
																				: "Select source export"}
																			<ChevronsUpDown className="opacity-50" />
																		</Button>
																	</FormControl>
																</PopoverTrigger>
																<PopoverContent className="w-full p-0">
																	<Command>
																		<CommandInput
																			placeholder="Search export..."
																			className="h-9"
																		/>
																		<CommandList>
																			<CommandEmpty>
																				No available exports found.
																			</CommandEmpty>
																			<CommandGroup>
																				{getAvailableExportsAsArray().map(
																					(exportItem, index) => (
																						<CommandItem
																							value={`${index}`}
																							key={exportItem.id}
																							onSelect={() => {
																								form.setValue(
																									"source_index",
																									`${index}`,
																								);
																							}}
																						>
																							{exportItem.id}
																							<Check
																								className={cn(
																									"ml-auto",
																									`${index}` === field.value
																										? "opacity-100"
																										: "opacity-0",
																								)}
																							/>
																						</CommandItem>
																					),
																				)}
																			</CommandGroup>
																		</CommandList>
																	</Command>
																</PopoverContent>
															</Popover>
															<FormDescription>
																Select the type of import you want to create.
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</div>
										<div className="flex items-center space-x-2 mt-2">
											<div className="grid flex-1 gap-2">
												<FormField
													control={form.control}
													name="local_subject"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Local Subject</FormLabel>
															<FormControl>
																<Input
																	placeholder="Enter import destination"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																Local subject used to subscribe (for streams)
																and publish (for services) to. This value only
																needs setting if you want to change the value of
																Subject. If the value of Subject ends in {">"}{" "}
																then LocalSubject needs to end in {">"} as well.
																LocalSubject can contain $[number] wildcard
																references where number references the nth
																wildcard in Subject. The sum of wildcard
																reference and * tokens needs to match the number
																of * token in Subject.
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</div>
										<DialogFooter className="justify-end mt-2">
											<DialogClose asChild>
												<Button type="button" variant="secondary">
													Close
												</Button>
											</DialogClose>
											<Button type="submit" className="px-3">
												<Save />
												<span>Add Import</span>
											</Button>
										</DialogFooter>
									</form>
								</Form>
							</DialogContent>
						</Dialog>
					}
				/>
			</div>
		</div>
	);
}
