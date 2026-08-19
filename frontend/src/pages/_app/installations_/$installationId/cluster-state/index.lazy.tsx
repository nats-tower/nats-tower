import { createLazyFileRoute } from "@tanstack/react-router";
import { RefreshCw, ServerCog } from "lucide-react";

import { pb } from "@/lib/pocketbase";
import { toStringSigBytesPerKB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type ClusterStateJetStreamServer,
	type ClusterStateStreamAccount,
	useClusterState,
} from "@/services/cluster-state";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/cluster-state/",
)({
	component: ClusterState,
});

function formatBytes(value: number | undefined): string {
	if (value === undefined) {
		return "0 B";
	}
	return toStringSigBytesPerKB(value, 2, 1024);
}

function formatNumber(value: number | undefined): string {
	return (value ?? 0).toLocaleString();
}

function JetStreamReport({
	servers,
}: {
	servers: ClusterStateJetStreamServer[];
}) {
	const totals = servers.reduce(
		(acc, entry) => {
			const data = entry.data;
			if (data && !data.disabled) {
				acc.streams += data.streams ?? 0;
				acc.consumers += data.consumers ?? 0;
				acc.messages += data.messages ?? 0;
				acc.bytes += data.bytes ?? 0;
				acc.memory += data.memory ?? 0;
				acc.storage += data.storage ?? 0;
				acc.apiReq += data.api?.total ?? 0;
			}
			return acc;
		},
		{
			streams: 0,
			consumers: 0,
			messages: 0,
			bytes: 0,
			memory: 0,
			storage: 0,
			apiReq: 0,
		},
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">JetStream Server Report</CardTitle>
				<div className="text-sm text-muted-foreground">
					Output of <code>nats server report jetstream</code> issued within the
					SYS account.
				</div>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Server</TableHead>
								<TableHead>Cluster</TableHead>
								<TableHead>Domain</TableHead>
								<TableHead className="text-right">Streams</TableHead>
								<TableHead className="text-right">Consumers</TableHead>
								<TableHead className="text-right">Messages</TableHead>
								<TableHead className="text-right">Bytes</TableHead>
								<TableHead className="text-right">Memory</TableHead>
								<TableHead className="text-right">Storage</TableHead>
								<TableHead className="text-right">API Req</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{servers.map((entry) => {
								const data = entry.data;
								const isLeader =
									data?.meta_cluster?.leader === entry.server.name;
								return (
									<TableRow key={entry.server.id}>
										<TableCell className="font-medium">
											{entry.server.name}
											{isLeader ? (
												<Badge className="ml-2" variant="secondary">
													meta leader
												</Badge>
											) : null}
										</TableCell>
										<TableCell>{entry.server.cluster ?? "-"}</TableCell>
										<TableCell>{entry.server.domain ?? "-"}</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatNumber(data?.streams)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatNumber(data?.consumers)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatNumber(data?.messages)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatBytes(data?.bytes)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatBytes(data?.memory)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatBytes(data?.storage)}
										</TableCell>
										<TableCell className="text-right">
											{data?.disabled ? "-" : formatNumber(data?.api?.total)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:grid-cols-7">
					<TotalStat label="Streams" value={formatNumber(totals.streams)} />
					<TotalStat label="Consumers" value={formatNumber(totals.consumers)} />
					<TotalStat label="Messages" value={formatNumber(totals.messages)} />
					<TotalStat label="Bytes" value={formatBytes(totals.bytes)} />
					<TotalStat label="Memory" value={formatBytes(totals.memory)} />
					<TotalStat label="Storage" value={formatBytes(totals.storage)} />
					<TotalStat label="API Req" value={formatNumber(totals.apiReq)} />
				</div>
			</CardContent>
		</Card>
	);
}

function TotalStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border bg-muted/30 p-3">
			<div className="text-xs font-medium text-muted-foreground">{label}</div>
			<div className="text-base font-semibold">{value}</div>
		</div>
	);
}

function AccountStreamReport({
	account,
}: {
	account: ClusterStateStreamAccount;
}) {
	const streamCount = account.streams.length;
	const totalMessages = account.streams.reduce(
		(sum, stream) => sum + (stream.state?.messages ?? 0),
		0,
	);
	const totalBytes = account.streams.reduce(
		(sum, stream) => sum + (stream.state?.bytes ?? 0),
		0,
	);

	return (
		<Collapsible
			className="rounded-lg border"
			defaultOpen={streamCount > 0 && streamCount <= 25}
		>
			<CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-muted/40">
				<div className="min-w-0">
					<div className="truncate font-semibold">{account.account_name}</div>
					<div className="truncate text-xs text-muted-foreground">
						{account.account_key}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
					<Badge variant="outline">{streamCount} streams</Badge>
					<span>{formatNumber(totalMessages)} msgs</span>
					<span>{formatBytes(totalBytes)}</span>
				</div>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{streamCount === 0 ? (
					<div className="p-4 text-sm text-muted-foreground">
						No streams in this account.
					</div>
				) : (
					<div className="overflow-x-auto border-t">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Stream</TableHead>
									<TableHead>Storage</TableHead>
									<TableHead className="text-right">Replicas</TableHead>
									<TableHead className="text-right">Consumers</TableHead>
									<TableHead className="text-right">Messages</TableHead>
									<TableHead className="text-right">Bytes</TableHead>
									<TableHead>Cluster</TableHead>
									<TableHead>Leader</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{account.streams.map((stream) => (
									<TableRow key={stream.name}>
										<TableCell className="font-medium">{stream.name}</TableCell>
										<TableCell>{stream.config?.storage ?? "-"}</TableCell>
										<TableCell className="text-right">
											{stream.config?.num_replicas ?? 1}
										</TableCell>
										<TableCell className="text-right">
											{formatNumber(stream.state?.consumer_count)}
										</TableCell>
										<TableCell className="text-right">
											{formatNumber(stream.state?.messages)}
										</TableCell>
										<TableCell className="text-right">
											{formatBytes(stream.state?.bytes)}
										</TableCell>
										<TableCell>{stream.cluster?.name ?? "-"}</TableCell>
										<TableCell>{stream.cluster?.leader ?? "-"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

function ClusterState() {
	const { installationId } = Route.useParams();
	const isAdmin = pb.authStore.isSuperuser;

	const { data, error, isLoading, isValidating, mutate } =
		useClusterState(installationId);

	if (!isAdmin) {
		return (
			<div className="p-4">
				<div className="container mx-auto">
					<h2 className="text-2xl font-bold">Cluster State</h2>
					<div className="mt-2 text-sm text-muted-foreground">
						You need admin privileges to view the cluster state.
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="container mx-auto">
				<div className="mb-6 flex flex-row items-center">
					<div className="flex flex-1 items-center gap-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<ServerCog className="size-4" />
						</span>
						<div>
							<h2 className="text-2xl font-bold">Cluster State</h2>
							<div className="text-sm text-muted-foreground">
								JetStream and per-account stream diagnostics for this
								installation.
							</div>
						</div>
					</div>
					<Button
						variant="outline"
						onClick={() => mutate()}
						disabled={isLoading || isValidating}
					>
						<RefreshCw
							className={isValidating ? "animate-spin" : undefined}
						/>
						Refresh
					</Button>
				</div>
			</div>

			<div className="container mx-auto space-y-6">
				{error ? (
					<Card>
						<CardContent className="p-4 text-sm text-destructive">
							Failed to load cluster state.
						</CardContent>
					</Card>
				) : null}

				{isLoading && !data ? (
					<Card>
						<CardContent className="p-4 text-sm text-muted-foreground">
							Loading cluster state…
						</CardContent>
					</Card>
				) : null}

				{data ? (
					<>
						<JetStreamReport servers={data.jetstream} />

						<div className="space-y-2">
							<div className="flex items-baseline justify-between">
								<h3 className="text-lg font-semibold">Stream Report</h3>
								<span className="text-sm text-muted-foreground">
									{data.accounts.length} accounts
								</span>
							</div>
							<div className="text-sm text-muted-foreground">
								Output of <code>nats stream report --all</code> issued per
								account.
							</div>
							<div className="space-y-3 pt-2">
								{data.accounts.length === 0 ? (
									<Card>
										<CardContent className="p-4 text-sm text-muted-foreground">
											No accounts with JetStream streams found.
										</CardContent>
									</Card>
								) : (
									data.accounts.map((account) => (
										<AccountStreamReport
											key={account.account_key}
											account={account}
										/>
									))
								)}
							</div>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
