"use client";

import { ChevronsUpDown, Info, Link, LogOut } from "lucide-react";

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
import { pb } from "@/lib/api/pocketbase";
import { EnterIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useBuildInfo } from "@/features/buildinfo/api/use-buildinfo";
import { useAuth } from "@/features/auth/lib/auth-context";

export function NavUser() {
  const { isMobile } = useSidebar();
  const [dialogBuildInfoOpen, setDialogBuildInfoOpen] = useState(false);
  const { user, logout } = useAuth();

  const {
    data: buildInfoData,
    error: buildInfoError,
    isLoading: buildInfoLoading,
  } = useBuildInfo();

  if (buildInfoError) return <div>failed to load</div>;
  if (buildInfoLoading) {
    return <div>loading...</div>;
  }
  if (!buildInfoData) {
    return <div>no data</div>;
  }

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

  const isAdmin = user.collectionName === "_superusers";
  const initials = (user.name || user.email || "U")[0].toUpperCase();
  const primaryName = user.name || user.email;
  const secondaryName = user.name ? user.email : null;

  let avatarUrl: string | undefined = undefined;

  // Type assertion or check if avatar exists on user object
  // UsersResponse has avatar field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userWithAvatar = user as any; 

  if (isAdmin && userWithAvatar.avatar && Number.isFinite(userWithAvatar.avatar)) {
    // This is to handle the default admin user avatar that is stored as a number
    avatarUrl = `${pb.baseURL}_/images/avatars/avatar${userWithAvatar.avatar}.svg`;
  } else if (userWithAvatar.avatar) {
    avatarUrl = pb.files.getURL(user, userWithAvatar.avatar);
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
                setDialogBuildInfoOpen(true);
              }}
            >
              <Info />
              About
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => {
                logout();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog open={dialogBuildInfoOpen} onOpenChange={setDialogBuildInfoOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Build info</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-2">
            <div className="grid flex-1 gap-2">
              <p className="text-sm text-gray-700">
                <strong>Go Version:</strong> {buildInfoData.go_version}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Settings:</strong>
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {buildInfoData.settings.map((setting: any) => {
                  return (
                    <li key={setting.key} className="flex items-center">
                      <strong className="mr-1">{setting.key}:</strong>{" "}
                      <span className="relative group inline-block">
                        <span className="break-words max-w-[300px] inline-block overflow-hidden text-ellipsis whitespace-nowrap">
                          {setting.value}
                        </span>
                        <span className="invisible group-hover:visible absolute left-0 top-[calc(100%+4px)] z-10 bg-white dark:bg-gray-800 shadow-md p-2 rounded border max-w-[400px] max-h-[200px] overflow-auto break-words text-xs">
                          {setting.value}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <DialogFooter className="justify-end mt-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
