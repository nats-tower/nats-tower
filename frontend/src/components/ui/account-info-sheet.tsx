import {
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableCell,
	TableBody,
} from "@/components/ui/table";
import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
} from "@/lib/pocketbase-types";
import useSWR from "swr";
import { toStringSigBytesPerKB } from "@/lib/utils";
import type { ExpandedNatsAuthAccountsResponse } from "@/lib/expanded-pocketbase-types";

export interface AccountInfoSheetProps {
	installationId: string;
	accountId: string;
}
export function AccountInfoSheet({
	installationId,
	accountId,
}: AccountInfoSheetProps) {
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
			`/installations/${installationId}/accounts/${accountId}?expand=limits`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb
				.collection<ExpandedNatsAuthAccountsResponse>("nats_auth_accounts")
				.getOne(accountId, {
					expand: "limits",
				});
		},
	);

	const {
		data: streamsData,
		error: streamsError,
		isLoading: streamsLoading,
	} = useSWR(
		[
			`/installations/${installationId}/accounts/${accountId}/streams`,
			installationId,
			accountId,
		],
		async ([_, installationId, accountId]) => {
			if (!installationId || !accountId) {
				return;
			}

			return pb.send<StreamList>(
				`/api/nats-tower/installations/${installationId}/accounts/${accountId}/streams`,
				{
					method: "GET",
				},
			);
		},
	);

	if (installationError || accountError || streamsError)
		return <div>failed to load</div>;
	if (installationLoading || accountLoading || streamsLoading)
		return <div>loading...</div>;

	return (
		<>
			<SheetHeader>
				<SheetTitle>Account info</SheetTitle>
				<SheetDescription>
					Information for account '{accountData?.name}' on installation '
					{installationData?.description}'
				</SheetDescription>
			</SheetHeader>

			<div className="my-6">
				<h3 className="text-lg font-medium mb-4">Account Limits</h3>

				{accountData?.expand?.limits ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-card rounded-lg p-4 border">
							<div className="text-sm text-muted-foreground mb-1">
								Max Connections
							</div>
							<div className="text-xl font-semibold">
								{accountData.expand.limits.max_connections === -1
									? "Unlimited"
									: accountData.expand.limits.max_connections.toLocaleString()}
							</div>
						</div>

						<div className="bg-card rounded-lg p-4 border">
							<div className="text-sm text-muted-foreground mb-1">
								JetStream Max Memory
							</div>
							<div className="text-xl font-semibold">
								{accountData.expand.limits.jetstream_max_memory === -1
									? "Unlimited"
									: toStringSigBytesPerKB(
											accountData.expand.limits.jetstream_max_memory,
											2,
											1024,
										)}
							</div>
						</div>

						<div className="bg-card rounded-lg p-4 border">
							<div className="text-sm text-muted-foreground mb-1">
								JetStream Max Disk
							</div>
							<div className="text-xl font-semibold">
								{accountData.expand.limits.jetstream_max_disk === -1
									? "Unlimited"
									: toStringSigBytesPerKB(
											accountData.expand.limits.jetstream_max_disk,
											2,
											1024,
										)}
							</div>
						</div>
					</div>
				) : (
					<div className="text-muted-foreground italic">
						No limits configured for this account
					</div>
				)}
			</div>

			<h3 className="text-lg font-medium mb-4">List of streams</h3>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead># Messages</TableHead>
						<TableHead>Size</TableHead>
						<TableHead>First Timestamp</TableHead>
						<TableHead>Last Timestamp</TableHead>
						<TableHead>Consumers</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{streamsData?.streams.map((stream) => (
						<TableRow key={stream.name}>
							<TableCell className="font-medium">{stream.name}</TableCell>
							<TableCell>{stream.state.messages}</TableCell>
							<TableCell>
								{toStringSigBytesPerKB(stream.state.bytes, 2, 1024)}
							</TableCell>
							<TableCell>{stream.state.first_ts?.toString()}</TableCell>
							<TableCell>{stream.state.last_ts?.toString()}</TableCell>
							<TableCell>{stream.state.consumer_count}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
export interface StreamList {
	streams: Stream[];
}

export interface Stream {
	name: string;
	created: Date;
	cluster: StreamCluster;
	state: StreamState;
}

export interface StreamCluster {
	leader: string;
}

export interface StreamState {
	messages: number;
	bytes: number;
	first_seq: number;
	first_ts: Date;
	last_seq: number;
	last_ts: Date;
	consumer_count: number;
}
