"use client";

import { ChevronsUpDown, Link, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { pb } from "@/lib/pocketbase";
import { EnterIcon } from "@radix-ui/react-icons";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@radix-ui/react-tooltip";

export function NavUser() {
	const { isMobile } = useSidebar();
	const user = pb.authStore.record;

	if (!user) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						to="/signin"
						className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
					>
						<Avatar>
							<AvatarFallback>
								<EnterIcon className="w-5 h-5" />
							</AvatarFallback>
						</Avatar>
						<span className="sr-only">Login</span>
					</Link>
				</TooltipTrigger>
				<TooltipContent side="right">Login</TooltipContent>
			</Tooltip>
		);
	}

	const isAdmin = pb.authStore.isSuperuser;
	const initials = (user.name || user.email || "U")[0].toUpperCase();
	const primaryName = user.name || user.email;
	const secondaryName = user.name ? user.email : null;

	let avatarUrl: string | undefined = undefined;

	if (isAdmin && user.avatar && Number.isFinite(user.avatar)) {
		// This is to handle the default admin user avatar that is stored as a number
		avatarUrl = `${pb.baseURL}_/images/avatars/avatar${user.avatar}.svg`;
	} else if (user.avatar) {
		avatarUrl = pb.files.getURL(user, user.avatar);
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={avatarUrl} alt={user.name || user.email} />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{primaryName}</span>
								<span className="truncate text-xs">{secondaryName}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuItem
							className="cursor-pointer hover:bg-gray-100"
							onClick={() => {
								pb.authStore.clear();
								location.reload();
							}}
						>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
