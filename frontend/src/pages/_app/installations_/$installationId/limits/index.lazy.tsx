import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

import type {
	NatsAuthLimitsRecord,
	NatsAuthOperatorsRecord,
} from "@/lib/pocketbase-types";
import {
	DialogHeader,
	DialogFooter,
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { getLimitsColumns } from "@/components/ui/limits/limit-columns";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/limits/",
)({
	component: Limits,
});

function Limits() {
	const { installationId } = Route.useParams();
	const [dialogCreateLimitOpen, setDialogCreateLimitOpen] = useState(false);

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
		data: limitsData,
		error: limitsError,
		isLoading: limitsLoading,
		mutate: limitsMutate,
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

	if (installationError || limitsError) return <div>failed to load</div>;
	if (installationLoading || limitsLoading) return <div>loading...</div>;

	// render data
	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Limits</h2>
							<div className="text-sm text-gray-500">
								List of limits for installation '{installationData?.description}
								'
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow p-4">
				<DataTable
					columns={getLimitsColumns(limitsMutate)}
					data={limitsData || []}
					noRowsText="No limits found"
					addButton={
						pb.authStore.isSuperuser ? (
							<Dialog
								open={dialogCreateLimitOpen}
								onOpenChange={setDialogCreateLimitOpen}
							>
								<DialogTrigger asChild>
									<Button variant="outline">
										<PlusIcon /> Add Limit
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-md">
									<form
										className="space-y-4"
										onSubmit={async (e) => {
											e.preventDefault();
											const form = e.target as HTMLFormElement;
											const name =
												form.querySelector<HTMLInputElement>("#name")?.value;
											const maxConnections = Number.parseInt(
												form.querySelector<HTMLInputElement>("#max_connections")
													?.value || "0",
											);
											const jetstreamMaxDisk = Number.parseInt(
												form.querySelector<HTMLInputElement>(
													"#jetstream_max_disk",
												)?.value || "0",
											);
											const jetstreamMaxMemory = Number.parseInt(
												form.querySelector<HTMLInputElement>(
													"#jetstream_max_memory",
												)?.value || "0",
											);

											if (!name) {
												return;
											}

											await pb
												.collection<NatsAuthLimitsRecord>("nats_auth_limits")
												.create({
													name,
													max_connections: maxConnections,
													jetstream_max_disk: jetstreamMaxDisk,
													jetstream_max_memory: jetstreamMaxMemory,
													type: "account",
													operator: installationId,
												});

											limitsMutate();
											setDialogCreateLimitOpen(false);
										}}
									>
										<DialogHeader>
											<DialogTitle>
												Add Limit for installation '
												{installationData?.description}'
											</DialogTitle>
											<DialogDescription>
												Configure the limit settings.
											</DialogDescription>
										</DialogHeader>
										<div className="grid gap-4">
											<div className="grid gap-2">
												<Label htmlFor="name">Name</Label>
												<Input
													id="name"
													placeholder="Enter limit name"
													required
												/>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="max_connections">Max Connections</Label>
												<p className="text-sm text-gray-500">
													Set to -1 for unlimited
												</p>
												<Input
													id="max_connections"
													type="number"
													min="-1"
													defaultValue={-1}
													placeholder="Enter max connections"
													required
												/>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="jetstream_max_disk">
													Jetstream Max Disk (bytes)
												</Label>
												<p className="text-sm text-gray-500">
													Set to -1 for unlimited
												</p>
												<Input
													id="jetstream_max_disk"
													type="number"
													min="-1"
													defaultValue={-1}
													placeholder="Enter max disk space"
													required
												/>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="jetstream_max_memory">
													Jetstream Max Memory (bytes)
												</Label>
												<p className="text-sm text-gray-500">
													Set to -1 for unlimited
												</p>
												<Input
													id="jetstream_max_memory"
													type="number"
													min="-1"
													defaultValue={-1}
													placeholder="Enter max memory"
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
												<span>Add Limit</span>
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						) : undefined
					}
				/>
			</div>
		</div>
	);
}
