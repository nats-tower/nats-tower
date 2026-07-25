import { pb } from "@/lib/pocketbase";
import type { ColumnDef } from "@tanstack/react-table";
import type {
	NatsAuthAccountsRecord,
	NatsAuthOperatorsRecord,
	NatsAuthUsersRecord,
	NatsAuthSigningKeysRecord,
	NatsAuthUsersResponse,
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
import { Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

type UserWithRole = NatsAuthUsersResponse<{ signing_key: NatsAuthSigningKeysRecord }>;

export function getUsersColumns(
	accountData: NatsAuthAccountsRecord,
	installationData: NatsAuthOperatorsRecord,
	mutateUsers: () => void,
): ColumnDef<UserWithRole>[] {
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
			id: "description",
			accessorKey: "description",
			header: "Description",
		},
		{
			id: "role",
			header: "Role",
			cell: ({ row }) => {
				const signingKey = row.original.expand?.signing_key;
				return signingKey ? <div>{signingKey.role}</div> : <div className="text-gray-400">-</div>;
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const user = row.original;

				const contextName = `${accountData?.name}-${user.name}`.replace(
					/[^a-zA-Z0-9._-]/g,
					"-",
				);
				const credsPath = `~/.config/nats/creds/${contextName}.creds`;
				const setupContextCommand = user?.creds
					? [
							`umask 077 && mkdir -p ~/.config/nats/creds && cat > ${credsPath} <<'NATS_CREDS_EOF'`,
							user.creds.trim(),
							"NATS_CREDS_EOF",
							`nats context save "${contextName}" --server "${installationData?.url}" --creds ${credsPath} --select`,
						].join("\n")
					: undefined;

				return (
					<div className="text-right">
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
									title="Create NATS CLI context (macOS & Linux)"
									value={setupContextCommand}
									description="Copy & paste this one-liner into your terminal. It stores the credentials and creates a selected NATS CLI context, so you can immediately run commands like 'nats stream ls'."
								/>
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
								<p className="text-sm text-gray-500">
									Use the following information as an alternative to the
									creds-file.
								</p>

								<CredentialBox title="JWT" value={user?.jwt} />
								<CredentialBox title="Public Key" value={user?.public_key} />
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
													confirm("Are you sure you want to delete this user?")
												) {
													await pb
														.collection<NatsAuthUsersRecord>("nats_auth_users")
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
					</div>
				);
			},
		},
	];
}

// Keep the CredentialBox component unchanged
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
