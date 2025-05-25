import { cn } from "@/lib/utils";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@radix-ui/react-popover";
import {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "cmdk";
import { PlusIcon, ChevronsUpDown, Check, Save } from "lucide-react";
import { Form, useForm } from "react-hook-form";
import { Button } from "../button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../dialog";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "../form";
import { Input } from "../input";
import { getAccountImports, upsertAccountImport } from "@/services/imports";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { getAvailableExports } from "@/services/exports";
import { getInstallationById } from "@/services/installations";
import { getAccountById } from "@/services/accounts";
import type { AccountExport } from "@/lib/expanded-pocketbase-types";

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

export interface AddImportDialogProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	installationId: string;
	accountId: string;
    mutateImports: () => void;
}

export function AddImportDialog({
	open,
	setOpen,
	installationId,
	accountId,
	mutateImports,
}: AddImportDialogProps) {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

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
		setOpen(false);
	}
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<PlusIcon /> Add Import
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<Form {...form}>
					<form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
						<DialogHeader>
							<DialogTitle>
								Add Import for installation '{installationData?.description}' in
								account '{accountData?.name}'
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
												<Input placeholder="Enter import name" {...field} />
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
																		(_, index) => `${index}` === field.value,
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
												Local subject used to subscribe (for streams) and
												publish (for services) to. This value only needs setting
												if you want to change the value of Subject. If the value
												of Subject ends in {">"} then LocalSubject needs to end
												in {">"} as well. LocalSubject can contain $[number]
												wildcard references where number references the nth
												wildcard in Subject. The sum of wildcard reference and *
												tokens needs to match the number of * token in Subject.
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
	);
}
