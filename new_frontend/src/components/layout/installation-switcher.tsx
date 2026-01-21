"use client";

import { ChevronsUpDown } from "lucide-react";

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
import { pb } from "@/lib/pocketbase";

function getActiveInstallation(
  href: string | undefined,
  installations: NatsAuthOperatorsRecord[] | undefined
) {
  if (!href || !installations) {
    return;
  }
  const installationId = href.split("/")[2];
  return installations.find(
    (installation) => installation.id === installationId
  );
}

const svgBlack = "rgb(0%,0%,0%)";

export function InstallationSwitcher() {
  const [dialogCreateInstallationOpen, setDialogCreateInstallationOpen] =
    useState(false);
  const navigate = useNavigate();
  const { resolvedLocation } = useRouterState();
  const { isMobile } = useSidebar();

  const { data, error, isLoading, mutate } = getInstallations();

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  if (!resolvedLocation || !resolvedLocation.href.includes("/installations")) {
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  width="255px"
                  height="255px"
                  viewBox="0 0 255 255"
                  version="1.1"
                  aria-labelledby="installationIconTitle"
                >
                  <title id="installationIconTitle">Installation Icon</title>
                  <g id="surface1">
                    <path
                      style={{
                        fill: "rgb(100%,100%,100%)",
                        strokeWidth: 1,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        stroke: svgBlack,
                        strokeOpacity: 1,
                        strokeMiterlimit: 4,
                      }}
                      d="M 11.007353 12.007353 C 11.007353 12.553309 11.454044 13 12 13 C 12.545956 13 12.992647 12.553309 12.992647 12.007353 C 12.992647 11.444853 12.545956 10.998162 12 10.998162 C 11.454044 10.998162 11.007353 11.444853 11.007353 12.007353 "
                      transform="matrix(7,0,0,7,45,50)"
                    />
                    <path
                      style={{
                        fill: "none",
                        strokeWidth: 1,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        stroke: svgBlack,
                        strokeOpacity: 1,
                        strokeMiterlimit: 4,
                      }}
                      d="M 16.615809 13.915882 C 17.492647 11.831324 16.847426 9.415882 15.044118 8.042721 C 13.257353 6.653015 10.742647 6.653015 8.955882 8.042721 C 7.152574 9.415882 6.507353 11.831324 7.384191 13.915882 "
                      transform="matrix(7,0,0,7,45,50)"
                    />
                    <path
                      style={{
                        fill: "none",
                        strokeWidth: 1,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        stroke: svgBlack,
                        strokeOpacity: 1,
                        strokeMiterlimit: 4,
                      }}
                      d="M 20.305147 15.466103 C 21.876838 11.710588 20.71875 7.359485 17.476103 4.877867 C 14.25 2.379706 9.75 2.379706 6.507353 4.877867 C 3.28125 7.359485 2.123162 11.710588 3.694853 15.466103 "
                      transform="matrix(7,0,0,7,45,50)"
                    />
                    <path
                      style={{
                        fill: "none",
                        strokeWidth: 1,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        stroke: svgBlack,
                        strokeOpacity: 1,
                        strokeMiterlimit: 4,
                      }}
                      d="M 9.005515 21.005823 L 12 12.005823 L 14.994485 21.005823 "
                      transform="matrix(7,0,0,7,45,50)"
                    />
                    <path
                      style={{
                        fill: "none",
                        strokeWidth: 1,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        stroke: svgBlack,
                        strokeOpacity: 1,
                        strokeMiterlimit: 4,
                      }}
                      d="M 9.998162 18.993975 L 14.001838 18.993975 "
                      transform="matrix(7,0,0,7,45,50)"
                    />
                  </g>
                </svg>
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

            {pb.authStore.isSuperuser ? (
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
            ) : undefined}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
