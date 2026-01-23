"use client";

import type * as React from "react";

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

import { getNavInfo } from "./nav-utils";

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
