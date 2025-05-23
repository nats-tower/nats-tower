import { createLazyFileRoute, Navigate } from "@tanstack/react-router";
import { useInstallation } from "@/lib/preferences";

export const Route = createLazyFileRoute("/_app/")({
	component: Home,
});

function Home() {
	const installation = useInstallation();

	if (installation.installationId === null) {
		return <Navigate to="/installations" />;
	}

	return (
		<Navigate
			to="/installations/$installationId"
			params={{ installationId: installation.installationId }}
		/>
	);
}
