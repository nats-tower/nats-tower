"use client";

import { ChevronsUpDown, InfoIcon, Save } from "lucide-react";

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
import useSWR from "swr";
import { pb } from "@/lib/pocketbase";
import type { NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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

	const { data, error, isLoading, mutate } = useSWR(
		"/installations",
		async () => {
			return pb
				.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
				.getFullList();
		},
	);

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
							<DialogContent className="sm:max-w-xl">
								<form
									className="space-y-4"
									onSubmit={async (e) => {
										e.preventDefault();
										const form = e.target as HTMLFormElement;
										const url =
											form.querySelector<HTMLInputElement>("#url")?.value;
										const description =
											form.querySelector<HTMLInputElement>(
												"#description",
											)?.value;
										if (!url || !description) {
											return;
										}
										await pb
											.collection<NatsAuthOperatorsRecord>(
												"nats_auth_operators",
											)
											.create({
												url,
												description,
											});

										mutate();
										setDialogCreateInstallationOpen(false);
									}}
								>
									<DialogHeader>
										<DialogTitle>Add new installation</DialogTitle>
										<DialogDescription>
											Fill in URLs and a description for the new installation.
										</DialogDescription>
									</DialogHeader>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="url">
												URL
											</Label>
											<p className="text-sm text-gray-500">Enter NATS server URL(s) - comma separated</p>
											<Input
												id="url"
												defaultValue=""
												placeholder="nats://localhost:4222,nats://localhost:4223"
												required
											/>
										</div>
									</div>
									<div className="flex items-center space-x-2 mt-2">
										<div className="grid flex-1 gap-2">
											<Label htmlFor="description">
												Description
											</Label>
											<p className="text-sm text-gray-500">Enter installation description (prod, stage, etc.)</p>
											<Input
												id="description"
												defaultValue=""
												placeholder="prod-eu"
												required
											/>
										</div>
									</div>
									<DialogFooter className="justify-end mt-2">
										<DialogClose asChild>
											<Button type="button" variant="secondary">
												Close
											</Button>
										</DialogClose>
										<Button type="submit" className="px-3">
											<Save />
											<span>Add Installation</span>
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
