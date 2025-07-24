import { Bell, Moon, Sun, User, LogOut, Settings, Key } from 'lucide-react';
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
import logo from '@/assets/logo.png';

interface TopBarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sidebarCollapsed: boolean;
}

export const TopBar = ({ isDarkMode, toggleDarkMode, sidebarCollapsed }: TopBarProps) => {
  return (
    <header className="h-16 bg-topbar border-b border-topbar-border flex items-center justify-between px-4 shadow-soft-sm">
      {/* Logo and Brand */}
      <div className={`flex items-center gap-3 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-0' : 'ml-60'
      }`}>
        <img src={logo} alt="FinanceSync" className="h-8 w-8" />
        <h1 className="text-xl font-bold text-topbar-foreground">FinanceSync</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleDarkMode}
          className="text-topbar-foreground hover:bg-accent"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-topbar-foreground hover:bg-accent"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            3
          </Badge>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mr-4" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">John Doe</p>
              <p className="text-xs leading-none text-muted-foreground">
                john.doe@company.com
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Key className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};