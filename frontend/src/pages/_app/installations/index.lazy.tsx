import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import useSWR from "swr";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

import type { NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";

export const Route = createLazyFileRoute("/_app/installations/")({
	component: Installations,
});

function Installations() {
	const navigate = useNavigate();

	const { data, error, isLoading } = useSWR("/installations", async () => {
		return pb
			.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
			.getFullList();
	});

	if (error) return <div>failed to load</div>;
	if (isLoading) return <div>loading...</div>;

	// render data
	return (
		<div className="flex min-h-svh flex-col items-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-3xl flex-col gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<div>
							<CardTitle>Installations</CardTitle>
							<CardDescription>All existing NATS installations</CardDescription>
						</div>
						<Button className="ml-10">
							<PlusIcon /> Add Installation
						</Button>
					</CardHeader>
					<CardContent>
						{data?.length === 0 ? (
							<div>No installations found.</div>
						) : (
							data?.map((installation) => (
								<div
									key={installation.id}
									className="cursor-pointer hover:bg-gray-100 p-4 rounded-lg"
									onClick={() =>
										navigate({ to: `/installations/${installation.id}` })
									}
									onKeyDown={(e) =>
										e.key === "Enter" &&
										navigate({ to: `/installations/${installation.id}` })
									}
								>
									<div>{installation.description}</div>
									<div className="text-sm">{installation.url}</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
