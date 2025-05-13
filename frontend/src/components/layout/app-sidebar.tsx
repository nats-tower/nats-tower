"use client";

import type * as React from "react";
import { FoldVertical, KeyRound, LayoutDashboard, type LucideIcon } from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import { InstallationSwitcher } from "@/components/layout/installation-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useRouterState } from "@tanstack/react-router";

function resolveBreadcrumb(
	splittedResolvedHref: string[],
	breadcrumbUrl: string,
) {
	const splittedBreadcrumbUrl = breadcrumbUrl.split("/");

	const resolvedBreadcrumb = splittedBreadcrumbUrl.map((part, index) => {
		if (part.startsWith("$") && splittedResolvedHref.length > index) {
			return splittedResolvedHref[index];
		}
		return part;
	});

	return resolvedBreadcrumb.join("/");
}

export function getNavInfo(resolvedHref: string | undefined) {
	if (!resolvedHref) {
		return {
			breadcrumbs: [],
			items: [],
		};
	}

	if (resolvedHref === "/installations" || resolvedHref === "/installations/") {
		return {
			breadcrumbs: [{
				name: "Installations",
				url: "/installations",
			}],
			items: [],
		};		
	}

	const navInfo: {
		breadcrumbs: {
			name: string;
			url: string;
		}[];
		items: {
			title: string;
			url: string;
			icon: LucideIcon;
			breadcrumb:
				| {
						name: string;
						url: string;
				  }
				| undefined;
			isActive: boolean;
			subPaths: {
				path: string;
				breadcrumb: {
					name: string;
					url: string;
				};
			}[];
		}[];
	} = {
		breadcrumbs: [],
		items: [
			{
				title: "Dashboard",
				url: "/",
				icon: LayoutDashboard,
				breadcrumb: undefined, // do not show in breadcrumb
				isActive: false,
				subPaths: [
					{
						path: "/installations/$installationId",
						breadcrumb: {
							name: "Dashboard",
							url: "/installations/$installationId",
						},
					},
				],
			},
			{
				title: "Accounts",
				url: "/installations/$installationId/accounts",
				icon: KeyRound,
				breadcrumb: {
					name: "Accounts",
					url: "/installations/$installationId/accounts",
				},
				isActive: false,
				subPaths: [
					{
						path: "/installations/$installationId/accounts/$accountId/users",
						breadcrumb: {
							name: "Users",
							url: "/installations/$installationId/accounts/$accountId/users",
						},
					},
					{
						path: "/installations/$installationId/accounts/$accountId/k8s-access",
						breadcrumb: {
							name: "Kubernetes Access",
							url: "/installations/$installationId/accounts/$accountId/k8s-access",
						},
					},
				],
			},
			{
				title: "Limits",
				url: "/installations/$installationId/limits",
				icon: FoldVertical,
				breadcrumb: {
					name: "Limits",
					url: "/installations/$installationId/limits",
				},
				isActive: false,
				subPaths: [],
			},
		],
	};

	const splitted = resolvedHref.split("/");

	for (let index = 0; index < navInfo.items.length; index++) {
		const element = navInfo.items[index];

		let isActive = false;
		if (element.breadcrumb) {
			element.breadcrumb.url = resolveBreadcrumb(
				splitted,
				element.breadcrumb.url,
			);
		}

		if (element.subPaths) {
			for (let j = 0; j < element.subPaths.length; j++) {
				const subElement = element.subPaths[j];
				subElement.breadcrumb.url = resolveBreadcrumb(
					splitted,
					subElement.breadcrumb.url,
				);
				if (compareHrefs(subElement.path, resolvedHref)) {
					isActive = true;
					navInfo.breadcrumbs = [subElement.breadcrumb];
					break;
				}
			}
		}

		if (isActive) {
			element.isActive = true;
			// prepend the element breadcrumb
			if (element.breadcrumb) {
				navInfo.breadcrumbs.unshift(element.breadcrumb);
			}
			break;
		}

		if (compareHrefs(element.url, resolvedHref)) {
			element.isActive = true;
			if (element.breadcrumb) {
				navInfo.breadcrumbs = [element.breadcrumb];
			}
			break;
		}
	}

	return navInfo;
}

function compareHrefs(href: string | undefined, resolvedHref: string) {
	if (!href) {
		return false;
	}

	if (href === resolvedHref) {
		return true;
	}

	const hrefSplit = href.split("/");
	const resolvedHrefSplit = resolvedHref.split("/");
	if (hrefSplit.length !== resolvedHrefSplit.length) {
		return false;
	}
	for (let i = 0; i < hrefSplit.length; i++) {
		if (hrefSplit[i].startsWith("$")) {
			continue;
		}

		if (hrefSplit[i] !== resolvedHrefSplit[i]) {
			return false;
		}
	}

	return true;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { resolvedLocation } = useRouterState();

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<InstallationSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={getNavInfo(resolvedLocation?.href).items} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
