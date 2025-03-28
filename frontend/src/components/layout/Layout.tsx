import type { PropsWithChildren } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { AppSidebar, getNavInfo } from "./app-sidebar";
import { Separator } from "../ui/separator";
import { Link, useRouterState } from "@tanstack/react-router";

export default function Layout({ children }: PropsWithChildren) {
	const { resolvedLocation } = useRouterState();

	const navInfo = getNavInfo(resolvedLocation.href);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								{navInfo.breadcrumbs.map((breadcrumb, index) => (
									<BreadcrumbItem key={breadcrumb.name}>
										{index > 0 && <BreadcrumbSeparator />}
										<BreadcrumbLink asChild>
											<Link href={breadcrumb.url}>{breadcrumb.name}</Link>
										</BreadcrumbLink>
									</BreadcrumbItem>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
						{children}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
