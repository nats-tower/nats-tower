"use client";

import { ChevronsUpDown, InfoIcon } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { AddInstallationDialogContent } from "../ui/installations/add-installation-dialog";
import { getInstallations } from "@/services/installations";

function getActiveInstallation(
	href: string | undefined,
	installations: NatsAuthOperatorsRecord[] | undefined,
) {
	if (!href || !installations) {
		return;
	}
	const installationId = href.split("/")[2];
	return installations.find(
		(installation) => installation.id === installationId,
	);
}

export function InstallationSwitcher() {
	const [dialogCreateInstallationOpen, setDialogCreateInstallationOpen] =
		useState(false);
	const navigate = useNavigate();
	const { resolvedLocation } = useRouterState();
	const { isMobile } = useSidebar();

	const { data, error, isLoading, mutate } = getInstallations();

	if (error) return <div>failed to load</div>;
	if (isLoading) return <div>loading...</div>;

	if (!resolvedLocation.href.includes("/installations")) {
		return null;
	}

	const activeInstallation = getActiveInstallation(resolvedLocation.href, data);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg">
								{/* TODO: Replace with actual icon */}
								<InfoIcon className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{activeInstallation
										? activeInstallation.description
										: "Not selected"}
								</span>
								<span className="truncate text-xs">
									{activeInstallation ? activeInstallation.url : ""}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Installations
						</DropdownMenuLabel>
						{data?.map((installation, index) => (
							<DropdownMenuItem
								key={installation.id}
								onClick={() =>
									navigate({ to: `/installations/${installation.id}` })
								}
								className="gap-2 p-2 cursor-pointer"
							>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{installation ? installation.description : "Not selected"}
									</span>
									<span className="truncate text-xs">
										{installation ? installation.url : ""}
									</span>
								</div>
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}
						
						<DropdownMenuSeparator />

						<Dialog
							open={dialogCreateInstallationOpen}
							onOpenChange={setDialogCreateInstallationOpen}
						>
							<DialogTrigger asChild>
								<DropdownMenuItem
									className="gap-2 p-2 cursor-pointer"
									onClick={(ev) => {
										ev.stopPropagation();
										setDialogCreateInstallationOpen(true);
										ev.preventDefault();
									}}
								>
									<div className="flex size-6 items-center justify-center rounded-md border bg-background">
										<PlusIcon className="size-4" />
									</div>
									<div className="font-medium text-muted-foreground">
										Add installation
									</div>
								</DropdownMenuItem>
							</DialogTrigger>

							<AddInstallationDialogContent
								mutate={mutate}
								setDialogCreateInstallationOpen={
									setDialogCreateInstallationOpen
								}
							/>
						</Dialog>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
