import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users2,
  LocateIcon,
  User as Profile,
  PowerIcon
} from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Users', icon: Users2 },
    { path: '/blockchain', label: 'Location', icon: LocateIcon },
    { path: '/scan', label: 'Profile', icon: Profile },
    { path: '/users', label: 'Log Out', icon: PowerIcon },
  ];

  return (
    <div className="p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white">RCV System</h2>
        <p className="text-slate-300 text-sm">Product Verification</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};