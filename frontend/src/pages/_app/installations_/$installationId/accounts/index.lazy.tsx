import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import useSWR from "swr";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	NatsAuthAccountsRecord,
	NatsAuthLimitsRecord,
	NatsAuthOperatorsRecord,
} from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import {
	DotsVerticalIcon,
	InfoCircledIcon,
	LockOpen1Icon,
	TrashIcon,
} from "@radix-ui/react-icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { AccountInfoSheet } from "@/components/ui/account-info-sheet";
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createLazyFileRoute(
	"/_app/installations/$installationId/accounts/",
)({
	component: Accounts,
});
const FormSchema = z.object({
	name: z
		.string({
			required_error: "Please provide a name for the account.",
		})
		.min(1, "Name is required"),
	description: z
		.string({
			required_error: "Please provide a description for the account.",
		})
		.min(1, "Description is required"),
	limit: z.string().optional(),
});
function Accounts() {
	const { installationId } = Route.useParams();
	const navigate = useNavigate();
	const [dialogCreateAccountOpen, setDialogCreateAccountOpen] = useState(false);

	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = useSWR(
		[`/installations/${installationId}`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
				.getOne(pInstallationId);
		},
	);

	const {
		data: accountsData,
		error: accountsError,
		isLoading: accountsLoading,
		mutate: mutateAccounts,
	} = useSWR(
		[`/installations/${installationId}/accounts`, installationId],
		async () => {
			if (!installationId) {
				return;
			}

			return pb
				.collection<NatsAuthAccountsRecord>("nats_auth_accounts")
				.getFullList({
					filter: `operator = "${installationId}"`,
				});
		},
	);

	const {
		data: limitsData,
		error: limitsError,
		isLoading: limitsLoading,
	} = useSWR(
		[`/installations/${installationId}/limits`, installationId],
		async () => {
			return pb
				.collection<NatsAuthLimitsRecord>("nats_auth_limits")
				.getFullList({
					filter: `operator = '${installationId}'`,
				});
		},
	);

	if (installationError || accountsError || limitsError)
		return <div>failed to load</div>;
	if (installationLoading || accountsLoading || limitsLoading)
		return <div>loading...</div>;

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		await pb.collection<NatsAuthAccountsRecord>("nats_auth_accounts").create({
			name: data.name,
			description: data.description,
			limit: data.limit,
			operator: installationId,
		});
		toast("Account created successfully.");
		form.reset();

		mutateAccounts();
		setDialogCreateAccountOpen(false);
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Accounts</h2>
							<div className="text-sm text-gray-500">
								List of accounts for installation '
								{installationData?.description}'
							</div>
						</div>
					</div>
					<div className="flex-1 flex justify-end gap-2">
						<Dialog
							open={dialogCreateAccountOpen}
							onOpenChange={setDialogCreateAccountOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add account
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<Form {...form}>
									<form
										className="space-y-4"
										onSubmit={form.handleSubmit(onSubmit)}
									>
										<DialogHeader>
											<DialogTitle>
												Add account for installation '
												{installationData?.description}'
											</DialogTitle>
											<DialogDescription>
												Fill in a name and a description for the new account.
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
																	placeholder="Enter account name"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																This name must be unique in this installation.
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
													name="description"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Description</FormLabel>
															<FormControl>
																<Input
																	placeholder="Enter account description"
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																This description should be meaningful and
																concise.
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
													name="limit"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Limit</FormLabel>
															<Select
																onValueChange={field.onChange}
																defaultValue={field.value}
															>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="Select a limit to apply" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	{limitsData?.map((limit) => (
																		<SelectItem key={limit.id} value={limit.id} className="cursor-pointer hover:bg-gray-100">
																			{limit.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															<FormDescription>
																You can configure your limits{" "}
																<Link
																	className="text-blue-500"
																	to="/installations/$installationId/limits"
																	params={{
																		installationId,
																	}}
																>
																	here
																</Link>
																.
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
												<span>Add Account</span>
											</Button>
										</DialogFooter>
									</form>
								</Form>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Name</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{accountsData?.map((account) => (
							<TableRow key={account.id}>
								<TableCell className="font-medium">{account.name}</TableCell>
								<TableCell>{account.description}</TableCell>
								<TableCell className="text-right">
									<Sheet>
										<SheetTrigger
											asChild
											onClick={(e) => {
												e.stopPropagation();
											}}
										>
											<Button variant="outline">
												<InfoCircledIcon className="mr-1" /> Info
											</Button>
										</SheetTrigger>
										<SheetContent className="sm:max-w-5xl">
											<AccountInfoSheet
												installationId={installationId}
												accountId={account.id}
											/>
										</SheetContent>
									</Sheet>
									<Button
										variant="outline"
										className="ml-2"
										onClick={() => {
											navigate({
												to: `/installations/${installationId}/accounts/${account.id}/users`,
											});
										}}
									>
										<LockOpen1Icon className="mr-1" /> Manage Access
									</Button>
									{account.name !== "SYS" ? (
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
																	"Are you sure you want to delete this account?",
																)
															) {
																await pb
																	.collection<NatsAuthAccountsRecord>(
																		"nats_auth_accounts",
																	)
																	.delete(account.id);
																mutateAccounts();
															}
														}}
													>
														<TrashIcon className="mr-1" /> Delete Account
													</Button>
												</div>
											</PopoverContent>
										</Popover>
									) : undefined}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
