import { createFileRoute, Outlet } from "@tanstack/react-router";

import Layout from "@/components/layout/Layout";
import { protectPage } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
	component: () => (
		<Layout>
			<Outlet />
			<Toaster />
		</Layout>
	),
	beforeLoad: ({ location }) => {
		// All routes under /_app are protected
		protectPage(location);
	},
});
