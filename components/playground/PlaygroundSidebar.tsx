"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Network,
  LucideIcon,
  User,
} from "lucide-react";
import { A2AAgentManager } from "./A2AAgentManager";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Image from "next/image";
import { UserProfileSheet } from "./UserProfileSheet";

interface SidebarNavLinkProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const SidebarNavLink = ({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: SidebarNavLinkProps) => {
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"agents">("agents");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest';
  const userImage = user?.user_metadata?.avatar_url;

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
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div
        className={cn(
          "pb-3 space-y-1 border-b flex-shrink-0",
          isOpen ? "px-2" : "px-1"
        )}
      >
        <SidebarNavLink
          icon={Network}
          label="A2A (Experimental)"
          isActive={activeSection === "agents"}
          isCollapsed={!isOpen}
          onClick={() => setActiveSection("agents")}
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
            <div className="h-full pr-4 pl-4 pt-4 overflow-y-auto space-y-4">
              {/* Experimental Note */}
              <div className="rounded-md border border-dashed bg-accent/20 p-3 text-xs text-muted-foreground">
                <strong>Experimental:</strong> A2A protocol support is still in progress.
                Feel free to test interactions with open remote agents that implement the A2A standard.
              </div>
              <A2AAgentManager />
            </div>
          )}
        </div>
      </div>

      {/* Profile Button at Bottom */}
      <div className={cn("border-t p-2 flex-shrink-0", isOpen ? "" : "")}>
        <button
          onClick={() => setIsProfileOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer",
            isOpen ? "justify-start" : "justify-center"
          )}
          title={isOpen ? undefined : "Profile"}
        >
          {userImage ? (
            <Image
              src={userImage}
              alt={userName}
              width={32}
              height={32}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          {isOpen && (
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium truncate w-full">{userName}</span>
              {user?.email && (
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user.email}
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Profile Sheet */}
      <UserProfileSheet
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />
    </div>
  );
};
