import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import { DotsVerticalIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

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
import {
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
	Table,
} from "@/components/ui/table";
import { Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toStringSigBytesPerKB } from "@/lib/utils";

export const Route = createLazyFileRoute(
	"/_app/installations/$installationId/limits/",
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

					{pb.authStore.isSuperuser ? (
						<div className="flex-1 flex justify-end gap-2">
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
						</div>
					) : undefined}
				</div>
			</div>
			<div className="container mx-auto bg-white rounded-lg shadow">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Max Connections</TableHead>
							<TableHead>Jetstream Max Disk</TableHead>
							<TableHead>Jetstream Max Memory</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{limitsData?.map((limit) => (
							<TableRow key={limit.id}>
								<TableCell className="font-medium">{limit.name}</TableCell>
								<TableCell>
									{limit.max_connections === -1
										? "Unlimited"
										: limit.max_connections}
								</TableCell>
								<TableCell>
									{limit.jetstream_max_disk === -1
										? "Unlimited"
										: toStringSigBytesPerKB(limit.jetstream_max_disk, 2, 1024)}
								</TableCell>
								<TableCell>
									{limit.jetstream_max_memory === -1
										? "Unlimited"
										: toStringSigBytesPerKB(
												limit.jetstream_max_memory,
												2,
												1024,
											)}
								</TableCell>
								<TableCell className="text-right">
									{pb.authStore.isSuperuser ? (
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
																	"Are you sure you want to delete this limit?",
																)
															) {
																await pb
																	.collection<NatsAuthLimitsRecord>(
																		"nats_auth_limits",
																	)
																	.delete(limit.id);
																limitsMutate();
															}
														}}
													>
														<TrashIcon className="mr-1" /> Delete Limit
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
