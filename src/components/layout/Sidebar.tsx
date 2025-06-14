import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Car, Wrench, Users, ClipboardList, Package, 
  FileText, MessageSquare, Gift, LayoutDashboard,
  ChevronLeft, ChevronRight, DollarSign, Settings,
  Phone
} from 'lucide-react';

type SidebarItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
};

const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  { title: 'Accounts', path: '/accounts', icon: <DollarSign size={20} /> },
  { title: 'Staff', path: '/staff', icon: <Users size={20} /> },
  { title: 'Job Cards', path: '/job-cards', icon: <ClipboardList size={20} /> },
  { title: 'Inventory', path: '/inventory', icon: <Package size={20} /> },
  { title: 'Garage Services', path: '/garage-services', icon: <Wrench size={20} /> },
  { title: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
  { title: 'WhatsApp', path: '/whatsapp', icon: <MessageSquare size={20} /> },
  { title: 'Promotions', path: '/promotions', icon: <Gift size={20} /> },
  { title: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  { title: 'Biometric', path: '/biometric', icon: <Wrench size={20} /> },
  { title: 'Leads', path: '/leads', icon: <Phone size={20} /> },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sidebar h-screen transition-all duration-300 relative border-r border-gray-700",
        collapsed ? "w-20" : "w-64"
      )}
      style={{background: "#1F2937"}}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        <div className="flex items-center">
          <div className="icon-bg" style={{background:'#e4e9f7'}}><Car className="text-primary" size={24} /></div>
          {!collapsed && (
            <h1 className="ml-2 text-lg font-bold text-white tracking-tight">AutoShop Pro</h1>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:bg-primary hover:text-white"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-all font-medium gap-3 group",
                    isActive
                      ? "sidebar-active bg-primary text-white shadow"
                      : "text-gray-200 hover:bg-primary/80 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                  style={isActive ? {background: "#1E3A8A"} : {}}
                >
                  <span className="icon-bg">{React.cloneElement(item.icon as React.ReactElement, { size: 20, color: isActive ? "#fff" : "#1E3A8A" })}</span>
                  {!collapsed && <span className="ml-2">{item.title}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
