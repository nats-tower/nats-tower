import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import type {
	NatsAuthAccountsRecord,
	NatsAuthOperatorsRecord,
	NatsAuthAPITokensRecord,
} from "@/lib/pocketbase-types";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, PlusIcon, Save, ShieldAlert, Trash2Icon } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/api-tokens/",
)({
	component: APITokens,
});

function formatDate(value?: string) {
	if (!value) {
		return "-";
	}
	return new Date(value).toLocaleString();
}

/** Masks everything but the prefix and the first few characters of a token. */
function maskToken(token?: string) {
	if (!token) {
		return "-";
	}
	return `${token.slice(0, 8)}…`;
}

function APITokens() {
	const params = Route.useParams();
	const { installationId, accountId } = params;
	const [dialogCreateTokenOpen, setDialogCreateTokenOpen] = useState(false);
	const [createdToken, setCreatedToken] = useState<string | null>(null);

	const isSuperuser = pb.authStore.isSuperuser;

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
		data: tokensData,
		error: tokensError,
		isLoading: tokensLoading,
		mutate: mutateTokens,
	} = useSWR(
		isSuperuser
			? [
					`/installations/${installationId}/accounts/${accountId}/api-tokens`,
					installationId,
					accountId,
				]
			: null,
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb
				.collection<NatsAuthAPITokensRecord>("nats_auth_api_tokens")
				.getFullList({ filter: `account = "${accountId}"` });
		},
	);

	const handleCopy = (value: string | undefined, message: string) => {
		if (!value) {
			return;
		}
		navigator.clipboard.writeText(value);
		toast(message);
	};

	const columns: ColumnDef<NatsAuthAPITokensRecord>[] = [
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
			cell: ({ row }) => {
				return (
					<div className="text-sm text-gray-500">
						{row.original.description || "-"}
					</div>
				);
			},
		},
		{
			id: "created",
			accessorKey: "created",
			header: "Created",
			cell: ({ row }) => {
				return (
					<div className="text-sm text-gray-500">
						{formatDate(row.original.created)}
					</div>
				);
			},
		},
		{
			id: "expires_at",
			accessorKey: "expires_at",
			header: "Expires",
			cell: ({ row }) => {
				const expired =
					row.original.expires_at &&
					new Date(row.original.expires_at) < new Date();
				return (
					<div
						className={
							expired ? "text-sm text-red-500" : "text-sm text-gray-500"
						}
					>
						{row.original.expires_at
							? `${formatDate(row.original.expires_at)}${expired ? " (expired)" : ""}`
							: "Never"}
					</div>
				);
			},
		},
		{
			id: "token",
			header: "Token",
			cell: ({ row }) => {
				const token = row.original.token;
				return (
					<div className="flex items-center gap-2">
						<code className="text-xs text-gray-600">
							{maskToken(token)}
						</code>
						<Button
							variant="ghost"
							size="icon"
							title="Copy token"
							onClick={() =>
								handleCopy(token, "API token copied to clipboard.")
							}
						>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
				);
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const token = row.original;

				return (
					<div className="text-right space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={async () => {
								if (
									confirm(
										`Are you sure you want to delete the API token "${token.name}"? Automations using it will lose access immediately.`,
									)
								) {
									try {
										await pb
											.collection("nats_auth_api_tokens")
											.delete(token.id);
										toast.success(
											`API token "${token.name}" deleted successfully`,
										);
										mutateTokens();
									} catch {
										toast.error("Failed to delete API token");
									}
								}
							}}
						>
							<Trash2Icon className="h-4 w-4" />
						</Button>
					</div>
				);
			},
		},
	];

	if (!isSuperuser) {
		return (
			<div className="p-4">
				<div className="container mx-auto">
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
						<ShieldAlert className="h-8 w-8 text-gray-400" />
						<div className="font-medium">
							API tokens can only be managed by administrators
						</div>
						<div className="text-sm text-gray-500">
							Sign in as a superuser to create API tokens for this
							account.
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (installationError || accountError || tokensError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || tokensLoading)
		return <div>loading...</div>;
	if (!installationData || !accountData) {
		return <div>no data</div>;
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">API Tokens</h2>
							<div className="text-sm text-gray-500">
								Manage API tokens for automations that call the account API
								of '{accountData?.name}' on installation
								'{installationData?.description}'
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={columns}
					data={tokensData || []}
					noRowsText="No API tokens found"
					addButton={
						<Dialog
							open={dialogCreateTokenOpen}
							onOpenChange={setDialogCreateTokenOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add Token
								</Button>
							</DialogTrigger>
							<TokenDialog
								accountId={accountId}
								onCreated={(token) => {
									setDialogCreateTokenOpen(false);
									mutateTokens();
									setCreatedToken(token);
								}}
							/>
						</Dialog>
					}
				/>
			</div>

			<Dialog open={!!createdToken} onOpenChange={(open) => !open && setCreatedToken(null)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>API token created</DialogTitle>
						<DialogDescription>
							Use this token in the <code>Authorization</code> header to call
							the account API:
							<code className="ml-1">Authorization: Bearer &lt;token&gt;</code>
							.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2">
						<Label htmlFor="api-token-value">Token</Label>
						<div className="flex items-center gap-2">
							<Input
								id="api-token-value"
								readOnly
								value={createdToken || ""}
								className="font-mono text-xs"
								onClick={(e) => e.currentTarget.select()}
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									handleCopy(
										createdToken || undefined,
										"API token copied to clipboard.",
									)
								}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>
					<DialogFooter className="justify-end mt-2">
						<DialogClose asChild>
							<Button type="button" variant="secondary">
								Close
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function TokenDialog({
	accountId,
	onCreated,
}: {
	accountId: string;
	onCreated: (token: string) => void;
}) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [expiresAt, setExpiresAt] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const data: Record<string, unknown> = {
				name,
				account: accountId,
			};
			if (description) {
				data.description = description;
			}
			if (expiresAt) {
				data.expires_at = new Date(expiresAt).toISOString();
			}

			const record =
				await pb.collection<NatsAuthAPITokensRecord>("nats_auth_api_tokens").create(data);
			onCreated(record.token || "");
		} catch {
			toast.error("Failed to create API token");
		}
	};

	return (
		<DialogContent className="sm:max-w-xl">
			<form className="space-y-4" onSubmit={handleSubmit}>
				<DialogHeader>
					<DialogTitle>Add API Token</DialogTitle>
					<DialogDescription>
						Create an API token that lets automations call the account API
						(e.g. generating shortlived user credentials) without user
						credentials.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="token-name">Name</Label>
						<Input
							id="token-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter a name (e.g. ci-automation)"
							required
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="token-description">Description (Optional)</Label>
						<Input
							id="token-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Enter a description"
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="token-expires">Expires (Optional)</Label>
						<Input
							id="token-expires"
							type="datetime-local"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
						/>
						<div className="text-xs text-gray-500">
							Leave empty for a token that never expires.
						</div>
					</div>
				</div>
				<DialogFooter className="justify-end mt-2">
					<Button type="submit" className="px-3">
						<Save />
						<span>Create Token</span>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
