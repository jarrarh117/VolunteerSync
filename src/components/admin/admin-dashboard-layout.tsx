
'use client';
import { useAdminAuth } from './admin-auth-provider';
import { Button } from '../ui/button';
import { LayoutDashboard, Settings, ShieldCheck, ListTodo, Users } from 'lucide-react';
import { ThemeToggle } from '../theme-toggle';
import Starfield from '../auth/starfield';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/tasks', label: 'Task Monitoring', icon: ListTodo },
  ];

  return (
    <TooltipProvider>
    <div className="min-h-screen w-full bg-background text-foreground flex">
      <Starfield />
      <aside className="fixed top-0 left-0 h-full w-16 lg:w-64 border-r bg-background/80 backdrop-blur-md z-20 flex flex-col transition-all duration-300">
        <div className="flex items-center justify-center lg:justify-start h-16 border-b px-4 lg:px-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="hidden lg:block ml-3 text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="flex-grow py-4 px-2 lg:px-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                    pathname === item.href && "bg-muted text-primary font-bold"
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <item.icon className="h-5 w-5" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="block lg:hidden">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t p-4">
           <Button onClick={logout} variant="outline" className="w-full justify-center lg:justify-start">
             <Settings className="h-5 w-5" />
             <span className="hidden lg:block ml-2">Logout</span>
           </Button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 ml-16 lg:ml-64">
        <header className="sticky top-0 h-16 flex items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-6 z-10">
          <div className="flex-1">
             <h2 className="text-xl font-semibold">
                {navItems.find(item => item.href === pathname)?.label || 'Overview'}
             </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              Welcome, <span className="font-bold text-foreground">{user?.email}</span>
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 relative">
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
