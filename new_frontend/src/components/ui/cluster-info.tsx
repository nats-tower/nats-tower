import { pb } from "@/lib/pocketbase";
import { toStringSigBytesPerKB } from "@/lib/utils";
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

function calculateTotalUsedCores(serverInfos: ServerInfo[]): number {
  let total = 0;
  for (const server of serverInfos) {
    total += server.statsz.cpu;
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
        }
      );

      // sort servers by name
      server.sort((a, b) => a.server.name.localeCompare(b.server.name));

      return server;
    }
  );

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="col-span-1 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="text-sm text-gray-500">Used Total Cores</div>
              <div className="text-xl font-semibold">
                {isClusterLoading
                  ? "Loading..."
                  : clusterError
                    ? "Error loading data"
                    : clusterData
                      ? `${calculateTotalUsedCores(clusterData).toFixed(2)} / ${calculateTotalCores(clusterData)}`
                      : "N/A"}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="text-sm text-gray-500">Used Total Memory</div>
              <div className="text-xl font-semibold">
                {isClusterLoading
                  ? "Loading..."
                  : clusterError
                    ? "Error loading data"
                    : clusterData
                      ? toStringSigBytesPerKB(
                          calculateTotalUsedBytes(clusterData),
                          2,
                          1024
                        )
                      : "N/A"}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="text-sm text-gray-500">Total Connections</div>
              <div className="text-xl font-semibold">
                {isClusterLoading
                  ? "Loading..."
                  : clusterError
                    ? "Error loading data"
                    : clusterData
                      ? `${calculateTotalConnections(clusterData)}`
                      : "N/A"}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 sm:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="text-sm text-gray-500">
                Used Total Jetstream Storage
              </div>
              <div className="text-xl font-semibold">
                {isClusterLoading
                  ? "Loading..."
                  : clusterError
                    ? "Error loading data"
                    : clusterData
                      ? `${toStringSigBytesPerKB(calculateTotalUsedJetstreamStorage(clusterData), 2, 1024)} / ${toStringSigBytesPerKB(calculateTotalJetstreamStorage(clusterData), 2, 1024)}`
                      : "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-500 mt-6">Servers</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {isClusterLoading ? (
          <div className="col-span-4 p-4">Loading server information...</div>
        ) : clusterError ? (
          <div className="col-span-4 p-4">Error loading server data</div>
        ) : clusterData && clusterData.length > 0 ? (
          clusterData.map((server) => (
            <div className="col-span-1" key={server.server.id}>
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-lg font-medium truncate">
                    {server.server.name}
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Used Cores</div>
                      <div className="font-medium">
                        {`${server.statsz.cpu.toFixed(2)} / ${server.statsz.cores}`}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Memory</div>
                      <div className="font-medium">
                        {toStringSigBytesPerKB(
                          Number(server.statsz.mem),
                          2,
                          1024
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Connections</div>
                      <div className="font-medium">
                        {server.statsz.connections}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">
                        Jetstream Storage
                      </div>
                      <div className="font-medium">
                        {server.statsz.jetstream
                          ? `${toStringSigBytesPerKB(server.statsz.jetstream.stats.storage, 2, 1024)} / ${toStringSigBytesPerKB(server.statsz.jetstream.config.max_storage, 2, 1024)}`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-4 p-4">No server information available</div>
        )}
      </div>
    </div>
  );
}
