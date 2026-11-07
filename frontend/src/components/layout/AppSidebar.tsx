import { Link, useRouterState } from "@tanstack/react-router";
import { Atom } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useEngineStatus } from "@/lib/physics/SimulationContext";
import { cn } from "@/lib/utils";
import { isActivePath, navItems } from "./navigation";

const statusCopy = {
  ready: { dot: "bg-green", text: "C++ engine ready" },
  loading: { dot: "bg-amber status-dot", text: "Loading WebAssembly…" },
  error: { dot: "bg-red", text: "Engine offline" },
} as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const status = useEngineStatus();
  const engine = statusCopy[status];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 py-0">
        <Link to="/" className="flex items-center gap-2.5 rounded-md outline-offset-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Atom className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block text-[15px] font-semibold tracking-tight">KINETIQ</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              Physics simulation platform
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "relative h-9 gap-3 text-[13.5px] font-medium text-sidebar-foreground/80",
                        "data-[active=true]:text-sidebar-accent-foreground",
                        // active indicator: a blue bar on the leading edge
                        "before:absolute before:-left-2 before:top-1.5 before:h-6 before:w-[3px] before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity",
                        "data-[active=true]:before:opacity-100",
                      )}
                    >
                      <Link to={item.to} aria-current={active ? "page" : undefined}>
                        <item.icon
                          className={cn("size-[18px]", active && "text-primary")}
                          aria-hidden
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground group-data-[collapsible=icon]:justify-center">
          <span className={cn("size-2 shrink-0 rounded-full", engine.dot)} aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">{engine.text}</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
