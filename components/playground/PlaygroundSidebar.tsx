"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Users, MessageSquarePlus, LucideIcon } from "lucide-react";
import { A2AAgentManager } from "./A2AAgentManager";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const SidebarNavLink = ({ icon: Icon, label, isActive, isCollapsed, onClick }: SidebarNavLinkProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
        isCollapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );
};

export const PlaygroundSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<"agents">("agents");

  const handleNewChat = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out border-r relative flex flex-col bg-background",
        isOpen ? "w-80" : "w-12"
      )}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-end pt-3 pr-2 pb-2 flex-shrink-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className={cn("pb-3 space-y-1 border-b flex-shrink-0", isOpen ? "px-2" : "px-1")}>
        <SidebarNavLink
          icon={Users}
          label="A2A Agents"
          isActive={activeSection === "agents"}
          isCollapsed={!isOpen}
          onClick={() => setActiveSection("agents")}
        />
        <SidebarNavLink
          icon={MessageSquarePlus}
          label="New Chat"
          isCollapsed={!isOpen}
          onClick={handleNewChat}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div
          className={cn(
            "h-full transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {isOpen && (
            <div className="h-full pr-4 pl-4 pt-4 overflow-y-auto">
              <A2AAgentManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
