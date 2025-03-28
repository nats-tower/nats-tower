import { pb } from "@/lib/pocketbase";
import { createLazyFileRoute, Navigate } from "@tanstack/react-router";
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
import { useInstallation } from "@/lib/preferences";

export const Route = createLazyFileRoute("/_app/")({
	component: Home,
});

function Home() {
	const installation = useInstallation();
  
  if (installation.installationId === null) {
    return <Navigate to="/installations" />;
  }

  return <Navigate to={`/installations/${installation.installationId}`} />;
}
