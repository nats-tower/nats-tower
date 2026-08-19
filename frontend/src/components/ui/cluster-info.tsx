import { pb } from "@/lib/pocketbase";
import { cn, toStringSigBytesPerKB } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
	AlertCircle,
	Cpu,
	Database,
	type LucideIcon,
	MemoryStick,
	Network,
	Server,
} from "lucide-react";
import useSWR from "swr";

interface ServerStats {
	cpu: number;
	cores: number;
	mem: number;
	connections: number;
	jetstream?: {
		stats: {
			storage: number;
		};
		config: {
			max_storage: number;
		};
	};
}

interface ServerInfo {
	server: {
		id: string;
		name: string;
	};
	statsz: ServerStats;
}

// statsz.cpu is a percentage where 100% equals one fully used core, so divide
// by 100 to convert it into a number of cores.
function calculateTotalUsedCores(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
		total += server.statsz.cpu / 100;
	}
	return total;
}

function calculateTotalCores(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
		total += server.statsz.cores;
	}
	return total;
}

function calculateTotalUsedBytes(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
		total += Number(server.statsz.mem);
	}
	return total;
}

function calculateTotalConnections(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
		total += server.statsz.connections;
	}
	return total;
}

function calculateTotalUsedJetstreamStorage(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
        if (!server.statsz.jetstream) {
            continue;
        }
		total += server.statsz.jetstream.stats.storage;
	}
	return total;
}

function calculateTotalJetstreamStorage(serverInfos: ServerInfo[]): number {
	let total = 0;
	for (const server of serverInfos) {
        if (!server.statsz.jetstream) {
            continue;
        }
		total += Number(server.statsz.jetstream.config.max_storage);
	}
	return total;
}

function UtilizationBar({ percent }: { percent: number }) {
	const clamped = Math.min(100, Math.max(0, percent));
	const tone =
		clamped >= 90
			? "bg-destructive"
			: clamped >= 75
				? "bg-amber-500"
				: "bg-primary";

	return (
		<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={cn("h-full rounded-full transition-all", tone)}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	);
}

interface StatCardProps {
	icon: LucideIcon;
	label: string;
	isLoading: boolean;
	hasError: boolean;
	value: string | undefined;
	percent?: number;
}

function StatCard({
	icon: Icon,
	label,
	isLoading,
	hasError,
	value,
	percent,
}: StatCardProps) {
	return (
		<Card className="overflow-hidden">
			<CardContent className="p-4">
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-medium text-muted-foreground">
						{label}
					</span>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Icon className="size-4" />
					</span>
				</div>
				<div className="mt-2 text-2xl font-semibold tracking-tight">
					{isLoading ? (
						<span className="text-muted-foreground">Loading…</span>
					) : hasError ? (
						<span className="inline-flex items-center gap-1.5 text-base font-normal text-destructive">
							<AlertCircle className="size-4" /> Error loading data
						</span>
					) : (
						(value ?? "N/A")
					)}
				</div>
				{!isLoading && !hasError && percent !== undefined ? (
					<UtilizationBar percent={percent} />
				) : null}
			</CardContent>
		</Card>
	);
}

export interface ClusterInfoProps {
	installationId: string;
}
export function ClusterInfo({ installationId }: ClusterInfoProps) {
	const {
		data: clusterData,
		error: clusterError,
		isLoading: isClusterLoading,
	} = useSWR(
		[`/installations/${installationId}/cluster_info`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			const server = await pb.send<ServerInfo[]>(
				`/api/nats-tower/installations/${pInstallationId}/cluster_info`,
				{
					method: "GET",
				},
			);

			// sort servers by name
			server.sort((a, b) => a.server.name.localeCompare(b.server.name));

			return server;
		},
	);

	return (
		<div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={Cpu}
					label="Used Total Cores"
					isLoading={isClusterLoading}
					hasError={!!clusterError}
					value={
						clusterData
							? `${calculateTotalUsedCores(clusterData).toFixed(2)} / ${calculateTotalCores(clusterData)}`
							: undefined
					}
					percent={
						clusterData && calculateTotalCores(clusterData) > 0
							? (calculateTotalUsedCores(clusterData) /
									calculateTotalCores(clusterData)) *
								100
							: undefined
					}
				/>
				<StatCard
					icon={MemoryStick}
					label="Used Total Memory"
					isLoading={isClusterLoading}
					hasError={!!clusterError}
					value={
						clusterData
							? toStringSigBytesPerKB(
									calculateTotalUsedBytes(clusterData),
									2,
									1024,
								)
							: undefined
					}
				/>
				<StatCard
					icon={Network}
					label="Total Connections"
					isLoading={isClusterLoading}
					hasError={!!clusterError}
					value={
						clusterData
							? `${calculateTotalConnections(clusterData)}`
							: undefined
					}
				/>
				<StatCard
					icon={Database}
					label="Used Jetstream Storage"
					isLoading={isClusterLoading}
					hasError={!!clusterError}
					value={
						clusterData
							? `${toStringSigBytesPerKB(calculateTotalUsedJetstreamStorage(clusterData), 2, 1024)} / ${toStringSigBytesPerKB(calculateTotalJetstreamStorage(clusterData), 2, 1024)}`
							: undefined
					}
					percent={
						clusterData && calculateTotalJetstreamStorage(clusterData) > 0
							? (calculateTotalUsedJetstreamStorage(clusterData) /
									calculateTotalJetstreamStorage(clusterData)) *
								100
							: undefined
					}
				/>
			</div>
			<div className="mb-2 mt-8 text-sm font-medium text-muted-foreground">
				Servers
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{isClusterLoading ? (
					<div className="col-span-full p-4 text-sm text-muted-foreground">
						Loading server information…
					</div>
				) : clusterError ? (
					<div className="col-span-full inline-flex items-center gap-2 p-4 text-sm text-destructive">
						<AlertCircle className="size-4" /> Error loading server data
					</div>
				) : clusterData && clusterData.length > 0 ? (
					clusterData.map((server) => (
						<Card
							key={server.server.id}
							className="overflow-hidden transition-shadow hover:shadow-md"
						>
							<div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Server className="size-4" />
								</span>
								<h3 className="truncate text-base font-semibold">
									{server.server.name}
								</h3>
							</div>
							<CardContent className="p-4">
								<dl className="grid grid-cols-1 gap-3">
									<div className="flex items-center justify-between gap-2">
										<dt className="text-sm text-muted-foreground">
											Used Cores
										</dt>
										<dd className="font-medium tabular-nums">
											{`${(server.statsz.cpu / 100).toFixed(2)} / ${server.statsz.cores}`}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-2">
										<dt className="text-sm text-muted-foreground">Memory</dt>
										<dd className="font-medium tabular-nums">
											{toStringSigBytesPerKB(
												Number(server.statsz.mem),
												2,
												1024,
											)}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-2">
										<dt className="text-sm text-muted-foreground">
											Connections
										</dt>
										<dd className="font-medium tabular-nums">
											{server.statsz.connections}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-2">
										<dt className="text-sm text-muted-foreground">
											Jetstream Storage
										</dt>
										<dd className="font-medium tabular-nums">
											{server.statsz.jetstream
												? `${toStringSigBytesPerKB(server.statsz.jetstream.stats.storage, 2, 1024)} / ${toStringSigBytesPerKB(server.statsz.jetstream.config.max_storage, 2, 1024)}`
												: "N/A"}
										</dd>
									</div>
								</dl>
							</CardContent>
						</Card>
					))
				) : (
					<div className="col-span-full p-4 text-sm text-muted-foreground">
						No server information available
					</div>
				)}
			</div>
		</div>
	);
}
