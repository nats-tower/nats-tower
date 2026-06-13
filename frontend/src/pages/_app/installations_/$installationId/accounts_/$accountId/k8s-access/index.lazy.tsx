import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import type { NatsAuthK8sAccessRecord } from "@/lib/pocketbase-types";
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
import { PlusIcon, Save } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useAccountById } from "@/services/accounts";
import { useInstallationById } from "@/services/installations";
import { useK8sAccessForAccount } from "@/services/k8s-access";
import { getK8sAccessColumns } from "@/components/ui/k8s-access/k8s-access-columns";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/k8s-access/",
)({
	component: K8sAccess,
});

function K8sAccess() {
	const { installationId, accountId } = Route.useParams();
	const [dialogCreateK8sAccessOpen, setDialogCreateK8sAccessOpen] =
		useState(false);

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = useInstallationById(installationId);

	const {
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = useAccountById(installationId, accountId);

	const {
		data: k8sAccessData,
		error: k8sAccessError,
		isLoading: k8sAccessLoading,
		mutate: mutateK8sAccess,
	} = useK8sAccessForAccount(accountId);

	if (installationError || accountError || k8sAccessError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || k8sAccessLoading)
		return <div>loading...</div>;
	if (!installationData || !accountData || !k8sAccessData) {
		return <div>no data</div>;
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Kubernetes Access</h2>
							<div className="text-sm text-gray-500">
								Manage Kubernetes access for account '{accountData?.name}' on
								installation '{installationData?.description}'.
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getK8sAccessColumns(mutateK8sAccess)}
					data={k8sAccessData || []}
					noRowsText="No Kubernetes Access found"
					addButton={
						<Dialog
							open={dialogCreateK8sAccessOpen}
							onOpenChange={setDialogCreateK8sAccessOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<PlusIcon /> Add Access
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-xl">
								<form
									className="space-y-4"
									onSubmit={async (e) => {
										e.preventDefault();
										const form = e.target as HTMLFormElement;
										const cluster =
											form.querySelector<HTMLInputElement>("#cluster")?.value;
										const namespace =
											form.querySelector<HTMLInputElement>("#namespace")?.value;
										if (!cluster || !namespace) {
											return;
										}
										await pb
											.collection<NatsAuthK8sAccessRecord>(
												"nats_auth_k8s_access",
											)
											.create({
												cluster,
												namespace,
												account: accountId,
											});

										mutateK8sAccess();
										setDialogCreateK8sAccessOpen(false);
									}}
								>
									<DialogHeader>
										<DialogTitle>
											Add Kubernetes Access for installation '
											{installationData?.description}' in account '
											{accountData?.name}'
										</DialogTitle>
										<DialogDescription>
											Fill in the cluster and namespace for the new Kubernetes
											access.
										</DialogDescription>
									</DialogHeader>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="cluster">Cluster-ID</Label>
											<Input
												id="cluster"
												defaultValue=""
												placeholder="Enter Cluster-ID as configured in the k8s operator"
												required
											/>
										</div>
									</div>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="namespace">Namespace</Label>
											<Input
												id="namespace"
												defaultValue=""
												placeholder={`Enter namespace which should gain access to Account '${accountData.name}'`}
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
											<span>Add Access</span>
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					}
				/>
			</div>
		</div>
	);
}
