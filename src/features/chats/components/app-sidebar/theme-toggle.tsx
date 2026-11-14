"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Menu>
      <MenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Change theme" />}>
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem onClick={() => setTheme("light")}>
          <SunIcon /> Light
        </MenuItem>
        <MenuItem onClick={() => setTheme("dark")}>
          <MoonIcon /> Dark
        </MenuItem>
        <MenuItem onClick={() => setTheme("system")}>
          <MonitorIcon /> System
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}