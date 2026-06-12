import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import type {
	NatsAuthAccountsRecord,
	NatsAuthOperatorsRecord,
	NatsAuthSigningKeysRecord,
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
import { PlusIcon, Save, Trash2Icon } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/roles/",
)({
	component: Roles,
});

function Roles() {
	const params = Route.useParams();
	const { installationId, accountId } = params;
	const [dialogCreateRoleOpen, setDialogCreateRoleOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<NatsAuthSigningKeysRecord | null>(null);

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
		data: rolesData,
		error: rolesError,
		isLoading: rolesLoading,
		mutate: mutateRoles,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}/roles`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb.collection<NatsAuthSigningKeysRecord>("nats_auth_signing_keys").getFullList({
				filter: `account = "${accountId}"`,
			});
		},
	);

	const columns: ColumnDef<NatsAuthSigningKeysRecord>[] = [
		{
			id: "role",
			accessorKey: "role",
			header: "Role Name",
			cell: ({ row }) => {
				return <div className="font-medium">{row.original.role}</div>;
			},
		},
		{
			id: "publish",
			header: "Publish Permissions",
			cell: ({ row }) => {
				const role = row.original;
				const pubPerms = role.publish || [];
				return <div className="text-sm">{pubPerms.length > 0 ? pubPerms.join(", ") : "-"}</div>;
			},
		},
		{
			id: "subscribe",
			header: "Subscribe Permissions",
			cell: ({ row }) => {
				const role = row.original;
				const subPerms = role.subscribe || [];
				return <div className="text-sm">{subPerms.length > 0 ? subPerms.join(", ") : "-"}</div>;
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => {
				const role = row.original;

				return (
					<div className="text-right space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setEditingRole(role)}
						>
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={async () => {
								if (confirm(`Are you sure you want to delete the role "${role.role}"?`)) {
									try {
										await pb.collection("nats_auth_signing_keys").delete(role.id);
										toast.success(`Role "${role.role}" deleted successfully`);
										mutateRoles();
									} catch (error) {
										toast.error("Failed to delete role");
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

	if (installationError || accountError || rolesError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || rolesLoading)
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
							<h2 className="text-2xl font-bold">Roles</h2>
							<div className="text-sm text-gray-500">
								Manage roles with scoped permissions for account '{accountData?.name}' on installation
								'{installationData?.description}'
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={columns}
					data={rolesData || []}
					noRowsText="No roles found"
					addButton={
						<Dialog
							open={dialogCreateRoleOpen}
							onOpenChange={setDialogCreateRoleOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add Role
								</Button>
							</DialogTrigger>
							<RoleDialog
								accountId={accountId}
								onClose={() => {
									setDialogCreateRoleOpen(false);
									mutateRoles();
								}}
							/>
						</Dialog>
					}
				/>
			</div>
			
			{editingRole && (
				<Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
					<RoleDialog
						accountId={accountId}
						role={editingRole}
						onClose={() => {
							setEditingRole(null);
							mutateRoles();
						}}
					/>
				</Dialog>
			)}
		</div>
	);
}

function RoleDialog({ 
	accountId, 
	role, 
	onClose 
}: { 
	accountId: string; 
	role?: NatsAuthSigningKeysRecord;
	onClose: () => void;
}) {
	const [roleName, setRoleName] = useState(role?.role || "");
	const [publishPerms, setPublishPerms] = useState((role?.publish || []).join("\n"));
	const [subscribePerms, setSubscribePerms] = useState((role?.subscribe || []).join("\n"));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
			const data = {
				role: roleName,
				account: accountId,
				publish: publishPerms.split("\n").filter(p => p.trim()),
				subscribe: subscribePerms.split("\n").filter(p => p.trim()),
			};
			
			if (role) {
				await pb.collection("nats_auth_signing_keys").update(role.id, data);
				toast.success(`Role "${roleName}" updated successfully`);
			} else {
				await pb.collection("nats_auth_signing_keys").create(data);
				toast.success(`Role "${roleName}" created successfully`);
			}
			onClose();
		} catch (error) {
			toast.error(`Failed to ${role ? "update" : "create"} role`);
		}
	};

	return (
		<DialogContent className="sm:max-w-xl">
			<form className="space-y-4" onSubmit={handleSubmit}>
				<DialogHeader>
					<DialogTitle>
						{role ? `Edit Role "${role.role}"` : "Add New Role"}
					</DialogTitle>
					<DialogDescription>
						Define a role with publish and subscribe permissions. Users assigned to this role will inherit these permissions.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="role">Role Name</Label>
						<Input
							id="role"
							value={roleName}
							onChange={(e) => setRoleName(e.target.value)}
							placeholder="Enter role name"
							required
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="publish">Publish Permissions</Label>
						<Textarea
							id="publish"
							value={publishPerms}
							onChange={(e) => setPublishPerms(e.target.value)}
							placeholder="Enter publish subjects (one per line)\nExample:\nsensors.>\ndata.events"
							rows={4}
						/>
						<div className="text-xs text-gray-500">
							Enter NATS subjects (one per line). Use wildcards: * for single token, &gt; for multiple tokens.
						</div>
					</div>
				</div>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="subscribe">Subscribe Permissions</Label>
						<Textarea
							id="subscribe"
							value={subscribePerms}
							onChange={(e) => setSubscribePerms(e.target.value)}
							placeholder="Enter subscribe subjects (one per line)\nExample:\ncommands.>\nconfig.updates"
							rows={4}
						/>
						<div className="text-xs text-gray-500">
							Enter NATS subjects (one per line). Use wildcards: * for single token, &gt; for multiple tokens.
						</div>
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
						<span>{role ? "Update" : "Add"} Role</span>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
