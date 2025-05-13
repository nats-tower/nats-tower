import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
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
	NatsAuthOperatorsRecord,
	NatsAuthUsersRecord,
} from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import {
	DotsVerticalIcon,
	LockOpen1Icon,
	TrashIcon,
} from "@radix-ui/react-icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, PlusIcon, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/users/",
)({
	component: Users,
});

function Users() {
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateUserOpen, setDialogCreateUserOpen] = useState(false);

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
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb
				.collection<NatsAuthAccountsRecord>("nats_auth_accounts")
				.getOne(accountId);
		},
	);

	const {
		data: usersData,
		error: usersError,
		isLoading: usersLoading,
		mutate: mutateUsers,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}/users`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb.collection<NatsAuthUsersRecord>("nats_auth_users").getFullList({
				filter: `account = "${accountId}"`,
			});
		},
	);

	if (installationError || accountError || usersError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || usersLoading)
		return <div>loading...</div>;

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6  flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Users</h2>
							<div className="text-sm text-gray-500">
								List of users for account '{accountData?.name}' on installation
								'{installationData?.description}'
							</div>
						</div>
					</div>
					<div className="flex-1 flex justify-end gap-2">
						<Dialog
							open={dialogCreateUserOpen}
							onOpenChange={setDialogCreateUserOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add User
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-xl">
								<form
									className="space-y-4"
									onSubmit={async (e) => {
										e.preventDefault();
										const form = e.target as HTMLFormElement;
										const name =
											form.querySelector<HTMLInputElement>("#name")?.value;
										const description =
											form.querySelector<HTMLInputElement>(
												"#description",
											)?.value;
										if (!name || !description) {
											return;
										}
										await pb
											.collection<NatsAuthUsersRecord>("nats_auth_users")
											.create({
												name,
												description,
												account: accountId,
											});

										mutateUsers();
										setDialogCreateUserOpen(false);
									}}
								>
									<DialogHeader>
										<DialogTitle>
											Add user for installation '{installationData?.description}
											' in account '{accountData?.name}'
										</DialogTitle>
										<DialogDescription>
											Fill in a name and a description for the new user.
										</DialogDescription>
									</DialogHeader>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="name" className="sr-only">
												Name
											</Label>
											<Input
												id="name"
												defaultValue=""
												placeholder="Enter user name"
												required
											/>
										</div>
									</div>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="description" className="sr-only">
												Description
											</Label>
											<Input
												id="description"
												defaultValue=""
												placeholder="Enter user description"
												required
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
											<span>Add User</span>
										</Button>
									</DialogFooter>
								</form>
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
						{usersData?.map((user) => (
							<TableRow
								key={user.id}
								className="hover:bg-gray-100 cursor-pointer"
							>
								<TableCell className="font-medium">{user.name}</TableCell>
								<TableCell>{user.description}</TableCell>
								<TableCell className="text-right">
									<Dialog>
										<DialogTrigger asChild>
											<Button variant="outline">
												<LockOpen1Icon className="mr-1" /> View credentials
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-xl">
											<DialogHeader>
												<DialogTitle>User credentials</DialogTitle>
												<DialogDescription>
													View credentials for user '{user.name}' in account '
													{accountData?.name}'
												</DialogDescription>
											</DialogHeader>
											<CredentialBox
												title="CLI Command"
												value={`nats --server ${installationData?.url} --creds nats.creds stream ls`}
												description="Use this command to list streams in this account. Save the Creds value below to a file named nats.creds before running this command."
											/>
											<CredentialBox
												title="Creds"
												value={user?.creds}
												description="Save these credentials as a file and mount it into your k8s pods as secrets or use it together with the NATS CLI"
											/>

                      <Separator />
                      <p className="text-sm text-gray-500">Use the following information as an alternative to the creds-file.</p>

											<CredentialBox title="JWT" value={user?.jwt} />
											<CredentialBox
												title="Public Key"
												value={user?.public_key}
											/>
											<CredentialBox title="Seed" value={user?.seed} />
											<DialogFooter className="justify-end mt-2">
												<DialogClose asChild>
													<Button type="button" variant="secondary">
														Close
													</Button>
												</DialogClose>
											</DialogFooter>
										</DialogContent>
									</Dialog>
									{user.name !== "sys" ? (
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
																	"Are you sure you want to delete this user?",
																)
															) {
																await pb
																	.collection<NatsAuthUsersRecord>(
																		"nats_auth_users",
																	)
																	.delete(user.id);
																mutateUsers();
															}
														}}
													>
														<TrashIcon className="mr-1" /> Delete User
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

function CredentialBox({
	title,
	description,
	value,
}: { title: string; description?: string; value?: string }) {
	if (!value) {
		return null;
	}

	const handleCopy = (title: string, value: string) => {
		navigator.clipboard.writeText(value);
		toast(`User ${title} copied to clipboard`);
	};
	return (
		<div>
			<div className="flex flex-row">
				<div>
					<h6>{title}</h6>
					{description && (
						<p className="text-sm text-gray-500">{description}</p>
					)}
				</div>
				<span className="flex-grow" />
				<Button
					size="icon"
					variant="ghost"
					className="h-6 w-6 ml-6"
					onClick={() => {
						handleCopy(title, value);
					}}
				>
					<Copy className="h-3 w-3" />
					<span className="sr-only">Copy {title}</span>
				</Button>
			</div>
			<Textarea value={value} readOnly className="mb-4 h-70" />
		</div>
	);
}
