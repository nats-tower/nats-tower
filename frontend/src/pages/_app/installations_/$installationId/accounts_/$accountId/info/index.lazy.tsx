import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	ActivityIcon,
	DatabaseIcon,
	HardDriveIcon,
	LayersIcon,
	MessageSquareIcon,
	PlugIcon,
	UsersIcon,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useInstallationById } from "@/services/installations";
import { useAccountByIdWithLimits, useAccountStreams } from "@/services/accounts";
import { toStringSigBytesPerKB } from "@/lib/utils";
import type { Stream } from "@/services/accounts";

export const Route = createLazyFileRoute(
	"/_app/installations_/$installationId/accounts_/$accountId/info/",
)({
	component: AccountInfo,
});

const CHART_COLORS = [
	"#6366f1",
	"#8b5cf6",
	"#ec4899",
	"#f97316",
	"#14b8a6",
	"#0ea5e9",
	"#22c55e",
	"#eab308",
	"#ef4444",
	"#a855f7",
];

function formatBytes(value: number) {
	return toStringSigBytesPerKB(value, 2, 1024);
}

function formatNumber(value: number) {
	return value.toLocaleString();
}

function formatTimestamp(ts: string | undefined) {
	if (!ts) {
		return "—";
	}
	const date = new Date(ts);
	if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) {
		return "—";
	}
	return date.toLocaleString();
}

interface StatCardProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	hint?: string;
}

function StatCard({ icon, label, value, hint }: StatCardProps) {
	return (
		<Card>
			<CardContent className="flex items-center gap-4 p-5">
				<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					{icon}
				</div>
				<div className="min-w-0">
					<div className="text-sm text-muted-foreground">{label}</div>
					<div className="truncate text-2xl font-semibold">{value}</div>
					{hint ? (
						<div className="text-xs text-muted-foreground">{hint}</div>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

function AccountInfo() {
	const { installationId, accountId } = Route.useParams();

	const {
		data: installationData,
		error: installationError,
		isLoading: installationLoading,
	} = useInstallationById(installationId);

	const {
		data: accountData,
		error: accountError,
		isLoading: accountLoading,
	} = useAccountByIdWithLimits(installationId, accountId);

	const {
		data: streamsData,
		error: streamsError,
		isLoading: streamsLoading,
	} = useAccountStreams(installationId, accountId);

	const streams = useMemo<Stream[]>(
		() => streamsData?.streams ?? [],
		[streamsData],
	);

	const totals = useMemo(() => {
		return streams.reduce(
			(acc, stream) => {
				acc.messages += stream.state.messages ?? 0;
				acc.bytes += stream.state.bytes ?? 0;
				acc.consumers += stream.state.consumer_count ?? 0;
				return acc;
			},
			{ messages: 0, bytes: 0, consumers: 0 },
		);
	}, [streams]);

	const topBySize = useMemo(
		() =>
			[...streams]
				.sort((a, b) => (b.state.bytes ?? 0) - (a.state.bytes ?? 0))
				.slice(0, 8)
				.map((stream) => ({
					name: stream.name,
					value: stream.state.bytes ?? 0,
				})),
		[streams],
	);

	const topByMessages = useMemo(
		() =>
			[...streams]
				.sort((a, b) => (b.state.messages ?? 0) - (a.state.messages ?? 0))
				.slice(0, 8)
				.map((stream) => ({
					name: stream.name,
					value: stream.state.messages ?? 0,
				})),
		[streams],
	);

	const storageDistribution = useMemo(() => {
		const sorted = [...streams]
			.filter((stream) => (stream.state.bytes ?? 0) > 0)
			.sort((a, b) => (b.state.bytes ?? 0) - (a.state.bytes ?? 0));
		const top = sorted.slice(0, 6).map((stream) => ({
			name: stream.name,
			value: stream.state.bytes ?? 0,
		}));
		const rest = sorted.slice(6);
		if (rest.length > 0) {
			top.push({
				name: `Other (${rest.length})`,
				value: rest.reduce((sum, stream) => sum + (stream.state.bytes ?? 0), 0),
			});
		}
		return top;
	}, [streams]);

	if (installationError || accountError || streamsError) {
		return <div className="p-4">failed to load</div>;
	}
	if (installationLoading || accountLoading || streamsLoading) {
		return <div className="p-4">loading...</div>;
	}

	const limits = accountData?.expand?.limits;

	return (
		<div className="p-4">
			<div className="container mx-auto space-y-6">
				<div>
					<h2 className="text-2xl font-bold">{accountData?.name}</h2>
					<div className="text-sm text-gray-500">
						Account overview on installation '
						{installationData?.description}'
					</div>
				</div>

				{/* Summary stats */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						icon={<LayersIcon className="h-5 w-5" />}
						label="Streams"
						value={formatNumber(streams.length)}
					/>
					<StatCard
						icon={<MessageSquareIcon className="h-5 w-5" />}
						label="Total Messages"
						value={formatNumber(totals.messages)}
					/>
					<StatCard
						icon={<DatabaseIcon className="h-5 w-5" />}
						label="Data Stored"
						value={formatBytes(totals.bytes)}
					/>
					<StatCard
						icon={<UsersIcon className="h-5 w-5" />}
						label="Consumers"
						value={formatNumber(totals.consumers)}
					/>
				</div>

				{/* Limits */}
				<Card>
					<CardHeader>
						<CardTitle>Account Limits</CardTitle>
						<CardDescription>
							Configured resource limits for this account.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{limits ? (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<LimitTile
									icon={<PlugIcon className="h-5 w-5" />}
									label="Max Connections"
									value={
										limits.max_connections === -1
											? "Unlimited"
											: formatNumber(limits.max_connections)
									}
								/>
								<LimitTile
									icon={<ActivityIcon className="h-5 w-5" />}
									label="JetStream Max Memory"
									value={
										limits.jetstream_max_memory === -1 ||
										limits.jetstream_max_memory === undefined
											? "Unlimited"
											: formatBytes(limits.jetstream_max_memory)
									}
								/>
								<LimitTile
									icon={<HardDriveIcon className="h-5 w-5" />}
									label="JetStream Max Disk"
									value={
										limits.jetstream_max_disk === -1 ||
										limits.jetstream_max_disk === undefined
											? "Unlimited"
											: formatBytes(limits.jetstream_max_disk)
									}
									usage={
										limits.jetstream_max_disk &&
										limits.jetstream_max_disk > 0
											? {
													used: totals.bytes,
													max: limits.jetstream_max_disk,
												}
											: undefined
									}
								/>
							</div>
						) : (
							<div className="italic text-muted-foreground">
								No limits configured for this account.
							</div>
						)}
					</CardContent>
				</Card>

				{/* Charts */}
				{streams.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-2">
							<CardHeader>
								<CardTitle>Top Streams by Size</CardTitle>
								<CardDescription>
									Storage footprint of the largest streams.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={280}>
									<BarChart
										data={topBySize}
										layout="vertical"
										margin={{ left: 8, right: 24 }}
									>
										<XAxis
											type="number"
											tickFormatter={(v) => formatBytes(v as number)}
											fontSize={12}
											stroke="currentColor"
											className="text-muted-foreground"
										/>
										<YAxis
											type="category"
											dataKey="name"
											width={140}
											fontSize={12}
											stroke="currentColor"
											className="text-muted-foreground"
										/>
										<Tooltip
											cursor={{ fill: "rgba(99,102,241,0.08)" }}
											formatter={(value) => [
												formatBytes(value as number),
												"Size",
											]}
										/>
										<Bar dataKey="value" radius={[0, 4, 4, 0]}>
											{topBySize.map((entry, index) => (
												<Cell
													key={entry.name}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Storage Distribution</CardTitle>
								<CardDescription>Share of total stored data.</CardDescription>
							</CardHeader>
							<CardContent>
								{storageDistribution.length > 0 ? (
									<ResponsiveContainer width="100%" height={280}>
										<PieChart>
											<Tooltip
												formatter={(value) => [
													formatBytes(value as number),
													"Size",
												]}
											/>
											<Pie
												data={storageDistribution}
												dataKey="value"
												nameKey="name"
												innerRadius={55}
												outerRadius={95}
												paddingAngle={2}
											>
												{storageDistribution.map((entry, index) => (
													<Cell
														key={entry.name}
														fill={CHART_COLORS[index % CHART_COLORS.length]}
													/>
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-[280px] items-center justify-center text-sm italic text-muted-foreground">
										No stored data yet.
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="lg:col-span-3">
							<CardHeader>
								<CardTitle>Top Streams by Messages</CardTitle>
								<CardDescription>
									Message counts across the busiest streams.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={260}>
									<BarChart data={topByMessages} margin={{ left: 8, right: 8 }}>
										<XAxis
											dataKey="name"
											fontSize={12}
											stroke="currentColor"
											className="text-muted-foreground"
											interval={0}
											angle={-20}
											textAnchor="end"
											height={60}
										/>
										<YAxis
											tickFormatter={(v) => formatNumber(v as number)}
											fontSize={12}
											stroke="currentColor"
											className="text-muted-foreground"
											width={70}
										/>
										<Tooltip
											cursor={{ fill: "rgba(99,102,241,0.08)" }}
											formatter={(value) => [
												formatNumber(value as number),
												"Messages",
											]}
										/>
										<Bar
											dataKey="value"
											radius={[4, 4, 0, 0]}
											fill={CHART_COLORS[0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>
				) : null}

				{/* Streams table */}
				<Card>
					<CardHeader>
						<CardTitle>Streams</CardTitle>
						<CardDescription>
							{streams.length > 0
								? `${streams.length} stream${streams.length === 1 ? "" : "s"} in this account.`
								: "This account has no streams."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right"># Messages</TableHead>
									<TableHead className="text-right">Size</TableHead>
									<TableHead>First Timestamp</TableHead>
									<TableHead>Last Timestamp</TableHead>
									<TableHead className="text-right">Consumers</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{streams.length > 0 ? (
									[...streams]
										.sort((a, b) => (b.state.bytes ?? 0) - (a.state.bytes ?? 0))
										.map((stream) => (
											<TableRow key={stream.name}>
												<TableCell className="font-medium">
													{stream.name}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{formatNumber(stream.state.messages ?? 0)}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{formatBytes(stream.state.bytes ?? 0)}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatTimestamp(stream.state.first_ts)}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{formatTimestamp(stream.state.last_ts)}
												</TableCell>
												<TableCell className="text-right">
													<Badge variant="secondary">
														{formatNumber(stream.state.consumer_count ?? 0)}
													</Badge>
												</TableCell>
											</TableRow>
										))
								) : (
									<TableRow>
										<TableCell
											colSpan={6}
											className="py-8 text-center text-muted-foreground"
										>
											No streams found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

interface LimitTileProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	usage?: { used: number; max: number };
}

function LimitTile({ icon, label, value, usage }: LimitTileProps) {
	const percent = usage
		? Math.min(100, Math.round((usage.used / usage.max) * 100))
		: undefined;

	return (
		<div className="rounded-lg border bg-card p-4">
			<div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
				<span className="text-primary">{icon}</span>
				{label}
			</div>
			<div className="text-xl font-semibold">{value}</div>
			{usage && percent !== undefined ? (
				<div className="mt-3">
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className={`h-full rounded-full ${
								percent >= 90
									? "bg-red-500"
									: percent >= 70
										? "bg-amber-500"
										: "bg-primary"
							}`}
							style={{ width: `${percent}%` }}
						/>
					</div>
					<div className="mt-1 text-xs text-muted-foreground">
						{formatBytes(usage.used)} used ({percent}%)
					</div>
				</div>
			) : null}
		</div>
	);
}
