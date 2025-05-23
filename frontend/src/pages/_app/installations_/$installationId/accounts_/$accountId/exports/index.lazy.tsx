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
import { PlusIcon, Save } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getAccountById } from "@/services/accounts";
import { getInstallationById } from "@/services/installations";
import { getExportColumns } from "@/components/ui/exports/exports-columns";
import { getAccountExports, upsertAccountExport } from "@/services/exports";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/exports/",
)({
	component: Exports,
});

const FormSchema = z.object({
	name: z
		.string({
			required_error: "Please provide a name for the account.",
		})
		.min(1, "Name is required"),
	type: z.enum(["service", "stream"], {
		required_error: "Please provide a type for the account.",
	}),
	subject: z
		.string({
			required_error: "Please provide a subject for the account.",
		})
		.min(1, "Subject is required"),
});

function Exports() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateExportOpen, setDialogCreateExportOpen] = useState(false);

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
		data: exportData,
		error: exportError,
		isLoading: exportLoading,
		mutate: mutateExports,
	} = getAccountExports(installationId, accountId);

	if (installationError || accountError || exportError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || exportLoading)
		return <div>loading...</div>;
	if (!installationData || !accountData || !exportData) {
		return <div>no data</div>;
	}

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		await upsertAccountExport(installationId, accountId, {
			name: data.name,
			type: data.type,
			subject: data.subject,
		});
		toast("Account export created successfully.");
		form.reset();

		mutateExports();
		setDialogCreateExportOpen(false);
	}
	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Account Exports</h2>
							<div className="text-sm text-gray-500">
								Manage exports for account '{accountData?.name}' on installation
								'{installationData?.description}'.
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getExportColumns(installationId, accountId, mutateExports)}
					data={exportData || []}
					noRowsText="No Exports configured"
					addButton={
						<Dialog
							open={dialogCreateExportOpen}
							onOpenChange={setDialogCreateExportOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add Export
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
												Add Export for installation '
												{installationData?.description}' in account '
												{accountData?.name}'
											</DialogTitle>
											<DialogDescription>
												Fill in the name, type and subject for the new Export.
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
																	placeholder="Enter export name"
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
													name="type"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Type</FormLabel>
															<Select
																onValueChange={field.onChange}
																defaultValue={field.value}
															>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="Select an export type" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	<SelectItem
																		value={"stream"}
																		className="cursor-pointer hover:bg-gray-100"
																	>
																		{"Stream"}
																	</SelectItem>
																	<SelectItem
																		value={"service"}
																		className="cursor-pointer hover:bg-gray-100"
																	>
																		{"Service"}
																	</SelectItem>
																</SelectContent>
															</Select>
															<FormDescription>
																Select the type of export you want to create.
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
													name="subject"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Subject</FormLabel>
															<FormControl>
																<Input
																	placeholder="Enter export subject"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																A subject of messages to export. Can contain
																wildcards.
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
												<span>Add Export</span>
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
