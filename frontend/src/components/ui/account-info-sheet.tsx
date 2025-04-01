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
	TableCaption,
} from "@/components/ui/table";
import { pb } from "@/lib/pocketbase";
import type {
	NatsAuthOperatorsRecord,
	NatsAuthAccountsRecord,
} from "@/lib/pocketbase-types";
import useSWR from "swr";
import { toStringSigBytesPerKB } from "@/lib/utils";

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
			<Table>
				<TableCaption>List of streams</TableCaption>
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
