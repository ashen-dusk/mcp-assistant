"use client";

import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Settings, LogOut } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/common/SignOutButton";
import { ThemeSelector } from "./ThemeSelector";

interface UserProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
}

export function UserProfileSheet({ isOpen, onClose, user }: UserProfileSheetProps) {
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest';
  const userImage = user?.user_metadata?.avatar_url;
  const userEmail = user?.email;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info Section */}
          <div className="flex items-center gap-4">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{userName}</h3>
              {userEmail && (
                <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Preferences Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h3 className="text-base font-semibold">Preferences</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="theme-selector">Theme</Label>
                <ThemeSelector />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sign Out Section */}
          {user && (
            <div className="pt-2">
              <SignOutButton />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
