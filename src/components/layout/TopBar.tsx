import { Bell, Moon, Sun, User, LogOut, Key, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  logout,
  getUsername,
  getUserRoles,
  getUserPermissions,
  isAuthenticated,
  isAdmin,
  isModerator
} from '@/lib/auth';

interface TopBarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sidebarCollapsed: boolean;
  onAuthChange?: () => void;
  onOpenChangePassword?: () => void;
  onOpenProfile?: () => void;
}

export const TopBar = ({ isDarkMode, toggleDarkMode, sidebarCollapsed, onAuthChange, onOpenChangePassword, onOpenProfile }: TopBarProps) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: null as string | null,
    roles: [] as string[],
    permissions: [] as string[],
    isAuthenticated: false,
    isAdmin: false,
    isModerator: false
  });

  useEffect(() => {
    const loadUserData = () => {
      const authenticated = isAuthenticated();

      if (authenticated) {
        setUserInfo({
          username: getUsername(),
          roles: getUserRoles(),
          permissions: getUserPermissions(),
          isAuthenticated: true,
          isAdmin: isAdmin(),
          isModerator: isModerator()
        });
      } else {
        setUserInfo({
          username: null,
          roles: [],
          permissions: [],
          isAuthenticated: false,
          isAdmin: false,
          isModerator: false
        });
      }
    };

    loadUserData();
  }, []);

  const handleLogout = () => {
    logout();
    setUserInfo({
      username: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isAdmin: false,
      isModerator: false
    });

    if (onAuthChange) {
      onAuthChange();
    }

    window.location.href = '/';
  };

  const getDisplayName = () => {
    if (!userInfo.username) return 'Guest User';

    if (userInfo.username.includes('@')) {
      return userInfo.username.split('@')[0]
          .split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
    }

    return userInfo.username;
  };

  const getInitials = () => {
    const displayName = getDisplayName();
    if (displayName === 'Guest User') return 'GU';

    return displayName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
  };

  const getUserTitle = () => {
    if (!userInfo.isAuthenticated) return 'Not Authenticated';
    if (userInfo.isAdmin) return 'Administrator';
    if (userInfo.isModerator) return 'Moderator';
    return 'User';
  };

  const getUserEmail = () => {
    if (!userInfo.username) return 'guest@example.com';
    if (userInfo.username.includes('@')) return userInfo.username;
    return `${userInfo.username}@company.com`;
  };

  return (
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-gray-200/80 dark:border-gray-700/80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="relative flex items-center justify-between h-full px-4">

          {/* Minimal Logo */}
          <div className={cn(
              "flex items-center gap-3 transition-all duration-300",
              sidebarCollapsed ? "ml-0" : "ml-64"
          )}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 dark:bg-white">
              <Sparkles className="w-4 h-4 text-white dark:text-gray-900" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              FinanceSync
            </span>
          </div>

          {/* Compact Search */}
          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                  type="text"
                  placeholder="Search..."
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={cn(
                      "w-full h-9 pl-9 pr-3 rounded-lg text-sm transition-all duration-200",
                      "bg-gray-100 dark:bg-gray-800 border border-transparent",
                      "text-gray-900 dark:text-gray-100 placeholder:text-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 focus:bg-white dark:focus:bg-gray-700"
                  )}
              />
            </div>
          </div>

          {/* Minimal Actions */}
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDarkMode ? (
                  <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                  <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-gray-900">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/api/placeholder/24/24" alt="User" />
                    <AvatarFallback className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                  className="w-64 mr-2 mt-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
                  align="end"
                  forceMount
              >
                {/* Compact User Info */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/api/placeholder/40/40" alt="User" />
                      <AvatarFallback className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{getDisplayName()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getUserTitle()}</p>
                    </div>
                  </div>
                  {userInfo.roles.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {userInfo.roles.slice(0, 2).map((role, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {role.replace('ROLE_', '')}
                            </Badge>
                        ))}
                      </div>
                  )}
                </div>

                {/* Compact Menu Items */}
                <div className="p-1">
                  <DropdownMenuItem
                      onClick={onOpenProfile}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4 text-gray-500" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                      onClick={onOpenChangePassword}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Key className="h-4 w-4 text-gray-500" />
                    <span>Change Password</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-700" />

                  <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
  );
};