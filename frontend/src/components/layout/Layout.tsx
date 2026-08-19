import { Fragment, type PropsWithChildren } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { AppSidebar } from "./app-sidebar";
import { Separator } from "../ui/separator";
import { Link, useRouterState } from "@tanstack/react-router";
import { useInstallationById } from "@/services/installations";
import { useAccountById } from "@/services/accounts";

interface Crumb {
	name: string;
	url: string;
}

const ACCOUNT_SUBPAGE_LABELS: Record<string, string> = {
	info: "Info",
	users: "Users",
	roles: "Roles",
	"k8s-access": "Kubernetes Access",
	exports: "Exports",
	imports: "Imports",
};

/**
 * Extracts the installation and account ids from a resolved route href so the
 * matching records can be loaded to display human friendly breadcrumb labels.
 */
function parseRouteIds(href: string | undefined): {
	installationId?: string;
	accountId?: string;
} {
	if (!href) {
		return {};
	}
	const segments = href.split("?")[0].replace(/\/$/, "").split("/");
	const installationId =
		segments[1] === "installations" ? segments[2] : undefined;
	const accountId =
		installationId && segments[3] === "accounts" ? segments[4] : undefined;
	return { installationId, accountId };
}

/**
 * Builds a hierarchical breadcrumb trail for the current route. Dynamic names
 * (installation description and account name) are passed in once resolved so the
 * user always sees where they are and can step back up the hierarchy.
 */
function buildBreadcrumbs(
	href: string | undefined,
	names: { installationName?: string; accountName?: string },
): Crumb[] {
	const crumbs: Crumb[] = [];
	if (!href) {
		return crumbs;
	}

	const path = href.split("?")[0].replace(/\/$/, "");
	const segments = path.split("/");

	if (segments[1] !== "installations") {
		return crumbs;
	}

	crumbs.push({ name: "Installations", url: "/installations" });

	const installationId = segments[2];
	if (!installationId) {
		return crumbs;
	}

	const installationUrl = `/installations/${installationId}`;
	crumbs.push({
		name: names.installationName || "Installation",
		url: installationUrl,
	});

	const section = segments[3];
	if (!section) {
		return crumbs;
	}

	if (section === "limits") {
		crumbs.push({ name: "Limits", url: `${installationUrl}/limits` });
		return crumbs;
	}

	if (section === "accounts") {
		crumbs.push({ name: "Accounts", url: `${installationUrl}/accounts` });

		const accountId = segments[4];
		if (!accountId) {
			return crumbs;
		}

		const accountUrl = `${installationUrl}/accounts/${accountId}`;
		crumbs.push({
			name: names.accountName || "Account",
			url: `${accountUrl}/users`,
		});

		const subPage = segments[5];
		const subPageLabel = subPage ? ACCOUNT_SUBPAGE_LABELS[subPage] : undefined;
		if (subPage && subPageLabel) {
			crumbs.push({ name: subPageLabel, url: `${accountUrl}/${subPage}` });
		}
	}

	return crumbs;
}

export default function Layout({ children }: PropsWithChildren) {
	const { resolvedLocation } = useRouterState();
	const href = resolvedLocation?.href;

	const { installationId, accountId } = parseRouteIds(href);

	const { data: installation } = useInstallationById(installationId ?? "");
	const { data: account } = useAccountById(
		installationId ?? "",
		accountId ?? "",
	);

	const breadcrumbs = buildBreadcrumbs(href, {
		installationName: installation?.description,
		accountName: account?.name,
	});

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
								{breadcrumbs.map((breadcrumb, index) => {
									const isLast = index === breadcrumbs.length - 1;
									return (
										<Fragment key={`${index}-${breadcrumb.url}`}>
											{index > 0 && <BreadcrumbSeparator />}
											<BreadcrumbItem>
												{isLast ? (
													<BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
												) : (
													<BreadcrumbLink asChild>
														<Link to={breadcrumb.url}>{breadcrumb.name}</Link>
													</BreadcrumbLink>
												)}
											</BreadcrumbItem>
										</Fragment>
									);
								})}
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
