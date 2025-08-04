import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { SideBar } from './SideBar';
import { cn } from '@/lib/utils';
import { ProfileModal } from '@/components/layout/profile/ProfileModal';
import { ChangePasswordModal } from '@/components/layout/profile/ChangePasswordModal';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    // Apply dark mode to document
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Handle responsive sidebar collapse on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarCollapsed(true);
            } else {
                setSidebarCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Toggle sidebar collapse for mobile
    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-500">
            {/* Animated background patterns, hidden when modals are open */}
            {(!isProfileOpen && !isChangePasswordOpen) && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
                </div>
            )}

            {/* Top Navigation */}
            <TopBar
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
                sidebarCollapsed={sidebarCollapsed}
                toggleSidebar={toggleSidebar}
                onOpenProfile={() => setIsProfileOpen(true)}
                onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
            {/* Sidebar */}
            <SideBar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            {/* Main Content */}
            <main
                className={cn(
                    'pt-16 transition-all duration-500 ease-out luft, min-h-screen relative z-10',
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
                )}
                aria-label="Main content"
            >
                <div className="p-8">
                    {/* Content wrapper with glassmorphic background */}
                    <div className="relative">
                        {/* Subtle gradient overlay for content area */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 rounded-3xl backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-900/5 dark:shadow-slate-900/20" />
                        {/* Actual content */}
                        <div className="relative p-8 rounded-3xl">
                            {children}
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};