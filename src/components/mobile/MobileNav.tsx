import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FolderOpen, 
  Search, 
  Settings, 
  Camera,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/scan', icon: Camera, label: 'Scan', highlight: true },
  { href: '/datasets', icon: Database, label: 'Datasets' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                item.highlight && !isActive && "relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.highlight ? (
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full -mt-6 shadow-lg",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/90 text-primary-foreground"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
