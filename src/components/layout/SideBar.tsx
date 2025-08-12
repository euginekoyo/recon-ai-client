import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Zap,
  FileText,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/auth';
import istlLogo from '@/components/layout/Images/istl-logo.png';

interface SideBarProps {
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'VIEW_DASHBOARD',
    gradient: 'from-blue-500 to-cyan-500',
    hoverGlow: 'hover:shadow-blue-500/25'
  },
  {
    name: 'Access Control',
    href: '/access-control',
    icon: Shield,
    permission: 'VIEW_ACCESS_CONTROL',
    gradient: 'from-rose-500 to-pink-500',
    hoverGlow: 'hover:shadow-rose-500/25'
  },
  // {
  //   name: 'Transactions',
  //   href: '/transactions',
  //   icon: CreditCard,
  //   permission: 'VIEW_TRANSACTIONS',
  //   gradient: 'from-emerald-500 to-teal-500',
  //   hoverGlow: 'hover:shadow-emerald-500/25'
  // },
  {
    name: 'Real Time Reconciliation',
    href: '/reconciliation',
    icon: Zap,
    permission: 'VIEW_RECONCILIATION',
    gradient: 'from-violet-500 to-purple-500',
    hoverGlow: 'hover:shadow-violet-500/25'
  },
  {
    name: 'Reconciliation Templates',
    href: '/template-creator',
    icon: FileText,
    permission: 'VIEW_RECONCILIATION',
    gradient: 'from-indigo-500 to-blue-500',
    hoverGlow: 'hover:shadow-indigo-500/25'
  },
  {
    name: 'Reconciled Transactions',
    href: '/reconciled',
    icon: CheckSquare,
    permission: 'VIEW_RECONCILED_TRANSACTIONS',
    gradient: 'from-indigo-500 to-blue-500',
    hoverGlow: 'hover:shadow-indigo-500/25'
  },


  // {
  //   name: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  //   permission: 'VIEW_SETTINGS',
  //   gradient: 'from-slate-500 to-gray-500',
  //   hoverGlow: 'hover:shadow-slate-500/25'
  // },
];

export const SideBar = ({}: SideBarProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
      <>
        <aside className={cn(
            'fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 transition-all duration-500 ease-out overflow-hidden',
            'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl backdrop-saturate-150',
            'border-r border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/50',
            'w-72'
        )}>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-white/30 to-slate-100/50 dark:from-slate-800/50 dark:via-slate-900/30 dark:to-slate-800/50" />
          <div className="absolute top-10 -left-4 w-32 h-32 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
          <div className="absolute bottom-20 -right-4 w-32 h-32 bg-violet-400/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000" />

          <div className="relative flex items-center p-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3 animate-fade-in">

              <div className="flex flex-col">
                <span className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Finance Dashboard
                </span>

              </div>
            </div>
          </div>

          <nav className="relative p-4 space-y-2 overflow-y-auto scrollbar-hide">
            {navigationItems
                .filter(item => hasPermission(item.permission))
                .map((item, index) => {
                  const Icon = item.icon;
                  const isHovered = hoveredItem === item.name;

                  return (
                      <NavLink
                          key={item.name}
                          to={item.href}
                          onMouseEnter={() => setHoveredItem(item.name)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={({ isActive }) =>
                              cn(
                                  'group relative flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300',
                                  'hover:scale-[1.02] hover:shadow-lg transform-gpu',
                                  isActive
                                      ? cn(
                                          'bg-gradient-to-r text-white shadow-lg',
                                          item.gradient,
                                          'shadow-2xl animate-pulse-slow'
                                      )
                                      : cn(
                                          'text-slate-700 dark:text-slate-300 hover:text-black',
                                          'bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-sm',
                                          'border border-slate-200/60 dark:border-slate-700/60',
                                          'hover:bg-gradient-to-r hover:border-transparent',
                                          `hover:${item.gradient}`,
                                          item.hoverGlow
                                      ),
                                  `animate-slide-in-left animation-delay-${index * 100}`
                              )
                          }
                      >
                        <div className={cn(
                            "relative flex items-center justify-center transition-all duration-300",
                            isHovered && "animate-bounce-subtle"
                        )}>
                          <Icon className={cn(
                              "h-5 w-5 flex-shrink-0 transition-all duration-300",
                              isHovered && "drop-shadow-lg"
                          )} />
                          {isHovered && (
                              <div className={cn(
                                  "absolute inset-0 rounded-full blur-md opacity-60 transition-opacity duration-300",
                                  `bg-gradient-to-r ${item.gradient}`
                              )} />
                          )}
                        </div>
                        <span className={cn(
                            "truncate transition-all duration-300 transform",
                            isHovered && "translate-x-1"
                        )}>
                          {item.name}
                        </span>
                        <NavLink to={item.href}>
                          {({ isActive }) => (
                              <>
                                {isActive && (
                                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
                                )}
                              </>
                          )}
                        </NavLink>
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                          <div className={cn(
                              "absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-2xl"
                          )} />
                        </div>
                      </NavLink>
                  );
                })}
          </nav>

          <div className={cn(
              "absolute bottom-0 left-0 right-0 p-6"
          )}>
            <hr className="my-4 border-slate-200 dark:border-slate-700" />
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Engineered by ISTL
              </span>
              <img src={istlLogo} alt="ISTL Logo" className="h-8 w-auto" />
            </div>
          </div>
        </aside>

        <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.4s ease-out;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      </>
  );
};