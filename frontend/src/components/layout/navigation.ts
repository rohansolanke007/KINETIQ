import {
  Atom,
  BookOpen,
  FlaskConical,
  Info,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: "/" | "/lab" | "/concepts" | "/experiments" | "/analytics" | "/about";
  label: string;
  title: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", title: "Dashboard", icon: LayoutDashboard },
  { to: "/lab", label: "Simulation Lab", title: "Simulation Lab", icon: Atom },
  { to: "/concepts", label: "Physics Concepts", title: "Physics Concepts", icon: BookOpen },
  { to: "/experiments", label: "Experiments", title: "Experiments", icon: FlaskConical },
  { to: "/analytics", label: "Analytics", title: "Analytics", icon: LineChart },
  { to: "/about", label: "About KINETIQ", title: "About KINETIQ", icon: Info },
];

export const isActivePath = (pathname: string, to: NavItem["to"]) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
