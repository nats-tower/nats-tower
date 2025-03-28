import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthAccountsRecord,
	NatsAuthOperatorsRecord,
	NatsAuthUsersRecord,
	TeamsRecord,
} from "@/lib/pocketbase-types";
import { useInstallation } from "@/lib/preferences";
import { createFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import { CopyIcon, GearIcon } from "@radix-ui/react-icons";
import { ClusterInfo } from "@/components/ui/cluster-info";
import { Separator } from "@radix-ui/react-separator";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogHeader,
	DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { InstallationTeamInfo } from "@/components/ui/installation-team-info";
import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";

export const Route = createFileRoute("/_app/installations/$installationId")({
	component: Installation,
});

function Installation() {
	const { installationId } = Route.useParams();
	const installationPref = useInstallation();
	const { data, error, isLoading } = useSWR(
		[`/installations/${installationId}`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb
				.collection<ExpandedNatsAuthOperatorsResponse>("nats_auth_operators")
				.getOne(pInstallationId, {
					expand: "teams",
				})
				.then((res) => {
					if (installationPref.installationId !== pInstallationId) {
						installationPref.setInstallationId(pInstallationId);
					}
					return res;
				});
		},
	);

	const handleCopy = (value: string | undefined) => {
		if (!value) {
			return;
		}
		navigator.clipboard.writeText(value);
		toast("Installation URL copied to clipboard.");
	};

	const sysAccount = useSWR(
		`/installations/${installationId}/sysaccount`,
		() => {
			return pb
				.collection<NatsAuthAccountsRecord>("nats_auth_accounts")
				.getFirstListItem(`operator = '${installationId}' && name = 'SYS'`);
		},
	);

	const handleCopySettings = (settings: string) => {
		navigator.clipboard.writeText(settings);
		toast.success("Settings copied to clipboard");
	};

	const getYamlSettings = (
		installation: NatsAuthOperatorsRecord,
		sysAccount: NatsAuthAccountsRecord,
	) => {
		return `operator: ${installation.jwt}
system_account: ${sysAccount.public_key}
resolver_preload:
  ${sysAccount.public_key}: ${sysAccount.jwt}
`;
	};

	const getNATSSettings = (
		installation: NatsAuthOperatorsRecord,
		sysAccount: NatsAuthAccountsRecord,
	) => {
		return `operator = ${installation.jwt}

system_account = ${sysAccount.public_key}

resolver_preload = {
  ${sysAccount.public_key}: ${sysAccount.jwt}
}
`;
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error loading installation details.</div>;
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6">
					<div className="flex items-center">
						<div className="flex-1">
							<h2 className="text-2xl font-bold">Dashboard</h2>
							<div className="text-sm text-gray-500">Overview</div>
						</div>
					</div>
				</div>
			</div>
			<div className="py-4">
				<div className="container mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
						<div className="col-span-1 lg:col-span-12">
							<div className="bg-white rounded-lg shadow">
								<div className="p-4">
									<div className="flex items-center">
										<div className="flex-1">
											<div className="text-sm text-gray-500">URL</div>
											<div
												className="text-xl font-semibold"
												id="installation-url"
											>
												{data?.url}
											</div>
										</div>
										<div className="ml-2">
											<Button
												variant="outline"
												onClick={() => {
													handleCopy(data?.url);
												}}
											>
												<CopyIcon />
											</Button>
										</div>

										{pb.authStore.isSuperuser ? (
											<div className="ml-2">
												<Dialog>
													<DialogTrigger asChild>
														<Button variant="outline">
															<GearIcon />
														</Button>
													</DialogTrigger>
													<DialogContent className="sm:max-w-md">
														<DialogHeader>
															<DialogTitle>
																Settings for installation '{data?.description}'
															</DialogTitle>
															<DialogDescription>{data?.url}</DialogDescription>
														</DialogHeader>
														<p className="text-sm text-gray-500">
															Use the following NATS config snippet to manage
															NATS servers via NATS Tower.
														</p>
														{data && sysAccount.data ? (
															<Textarea
																value={getNATSSettings(data, sysAccount.data)}
																readOnly
																className="mb-4 h-96 bg-slate-950 text-white"
															/>
														) : undefined}
														<DialogFooter className="justify-end mt-2">
															<Button
																onClick={() => {
																	if (data && sysAccount.data) {
																		handleCopySettings(
																			getNATSSettings(data, sysAccount.data),
																		);
																	}
																}}
															>
																Copy as NATS Config
															</Button>
															<Button
																onClick={() => {
																	if (data && sysAccount.data) {
																		handleCopySettings(
																			getYamlSettings(data, sysAccount.data),
																		);
																	}
																}}
															>
																Copy as Yaml
															</Button>
															<DialogClose asChild>
																<Button type="button" variant="secondary">
																	Close
																</Button>
															</DialogClose>
														</DialogFooter>
													</DialogContent>
												</Dialog>
											</div>
										) : undefined}
									</div>
								</div>
							</div>
						</div>
					</div>
					<Separator orientation="horizontal" className="my-6" />
					{data ? <InstallationTeamInfo installation={data} /> : undefined}
					<Separator orientation="horizontal" className="my-6" />
					<ClusterInfo installationId={installationId} />
				</div>
			</div>
		</div>
	);
}
