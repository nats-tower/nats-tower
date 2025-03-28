import { ArchiveIcon } from "@radix-ui/react-icons";
import type { IconProps } from "@radix-ui/react-icons/dist/types";
import type { LinkProps } from "@tanstack/react-router";

export interface MenuEntry {
  icon: React.ForwardRefExoticComponent<
    IconProps & React.RefAttributes<SVGSVGElement>
  >;
  label: string;
  href: LinkProps["to"];
}

export const getMenuEntries = (): MenuEntry[] => {
  return [
    {
      href: "/installations/$installationId/accounts",
      icon: ArchiveIcon,
      label: "Accounts",
    },
  ];
};
