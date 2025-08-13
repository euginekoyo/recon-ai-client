import { Bell, User, LogOut, Key } from 'lucide-react';
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
import bankLogo from '@/components/layout/images/bank-logo.png';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onAuthChange?: () => void;
  onOpenChangePassword?: () => void;
  onOpenProfile?: () => void;
}

export const TopBar = ({ sidebarCollapsed, onAuthChange, onOpenChangePassword, onOpenProfile }: TopBarProps) => {
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
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200/80 bg-gray-100 backdrop-blur-sm">
        <div className="relative flex items-center justify-between h-full px-4">

          {/* Logo at far left */}
          <div className="flex items-center">
            <img src={bankLogo} alt="Bank Logo" className="h-16 w-auto" />
          </div>

          {/* Centered Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-bold text-gray-900">
            MatchFusion
          </div>

          {/* Minimal Actions */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            {/*<div className="relative">*/}
            {/*  <Button*/}
            {/*      variant="ghost"*/}
            {/*      size="sm"*/}
            {/*      className="h-8 w-8 rounded-md hover:bg-gray-100 transition-colors"*/}
            {/*  >*/}
            {/*    <Bell className="h-5 w-5 text-gray-600" />*/}
            {/*  </Button>*/}
            {/*  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white">*/}
            {/*    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />*/}
            {/*  </div>*/}
            {/*</div>*/}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/api/placeholder/28/28" alt="User" />
                    <AvatarFallback className="bg-gray-900 text-white text-xs font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                  className="w-64 mr-2 mt-1 border border-gray-200 bg-white rounded-lg shadow-lg"
                  align="end"
                  forceMount
              >
                {/* Compact User Info */}
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/api/placeholder/40/40" alt="User" />
                      <AvatarFallback className="bg-gray-900 text-white text-sm font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
                      <p className="text-xs text-gray-500">{getUserTitle()}</p>
                    </div>
                  </div>
                  {userInfo.roles.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {userInfo.roles.slice(0, 2).map((role, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700">
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
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                  >
                    <User className="h-5 w-5 text-gray-500" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                      onClick={onOpenChangePassword}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                  >
                    <Key className="h-5 w-5 text-gray-500" />
                    <span>Change Password</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-gray-200" />

                  <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-red-50 text-red-600"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
  );
}