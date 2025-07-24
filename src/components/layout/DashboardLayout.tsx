import { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { SideBar } from './SideBar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Handle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <TopBar 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode} 
        sidebarCollapsed={sidebarCollapsed}
      />
      
      {/* Sidebar */}
      <SideBar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Content */}
      <main className={cn(
        'pt-16 transition-all duration-300 ease-in-out min-h-screen',
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};