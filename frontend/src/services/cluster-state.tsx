import { pb } from "@/lib/pocketbase";
import useSWR from "swr";

export interface ClusterStateServerInfo {
	name: string;
	id: string;
	cluster?: string;
	domain?: string;
	ver?: string;
}

export interface ClusterStateJetStreamApiStats {
	level?: number;
	total?: number;
	errors?: number;
}

export interface ClusterStateJSInfo {
	server_id: string;
	disabled?: boolean;
	memory: number;
	storage: number;
	accounts?: number;
	ha_assets?: number;
	api?: ClusterStateJetStreamApiStats;
	streams: number;
	consumers: number;
	messages: number;
	bytes: number;
	meta_cluster?: {
		name?: string;
		leader?: string;
		cluster_size?: number;
	};
}

export interface ClusterStateJetStreamServer {
	server: ClusterStateServerInfo;
	data?: ClusterStateJSInfo;
}

export interface ClusterStatePeerInfo {
	name: string;
	current: boolean;
	offline?: boolean;
	active: number;
	lag?: number;
	peer: string;
}

export interface ClusterStateStreamCluster {
	name?: string;
	raft_group?: string;
	leader?: string;
	replicas?: ClusterStatePeerInfo[];
}

export interface ClusterStateStreamState {
	messages: number;
	bytes: number;
	first_seq: number;
	last_seq: number;
	num_subjects?: number;
	num_deleted?: number;
	consumer_count: number;
}

export interface ClusterStateStreamConfig {
	name: string;
	storage?: string;
	num_replicas?: number;
	retention?: string;
}

export interface ClusterStateStreamDetail {
	name: string;
	created?: string;
	cluster?: ClusterStateStreamCluster;
	config?: ClusterStateStreamConfig;
	state?: ClusterStateStreamState;
}

export interface ClusterStateStreamAccount {
	account_id: string;
	account_key: string;
	account_name: string;
	streams: ClusterStateStreamDetail[];
}

export interface ClusterState {
	jetstream: ClusterStateJetStreamServer[];
	accounts: ClusterStateStreamAccount[];
}

export function useClusterState(installationId: string) {
	return useSWR(
		[`/installations/${installationId}/cluster_state`, installationId],
		async ([_, pInstallationId]) => {
			if (!pInstallationId) {
				return;
			}
			return pb.send<ClusterState>(
				`/api/nats-tower/installations/${pInstallationId}/cluster_state`,
				{
					method: "GET",
				},
			);
		},
	);
}
