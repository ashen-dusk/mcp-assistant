import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import Logo from "@/components/common/Logo";
import { ProfileDropdown } from "@/components/common/ProfileDropdown";
import { NavigationLinks } from "@/components/common/NavigationLinks";

import { MobileNav } from "@/components/common/MobileNav";

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4">
        {/* Top Section - Logo and Profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <MobileNav />
            </div>
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-semibold text-foreground hidden sm:inline-block">MCP Assistant</span>
              <span
                className="bg-black/5 text-black/70 border border-black/10 dark:bg-white/10 dark:text-white/70 dark:border-white/20 text-[10px] px-1.5 py-0.5 rounded-lg uppercase font-bold tracking-wide"
                title="This app is in beta — features may change."
              >
                Beta
              </span>
            </Link>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {session?.user ? (
              <ProfileDropdown user={session.user} />
            ) : (
              <Link href="/signin" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Section - Navigation Links */}
        <div className="hidden md:block">
          <NavigationLinks />
        </div>
      </div>
    </nav>
  );
}
