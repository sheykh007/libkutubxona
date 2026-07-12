import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Repeat, Users, CreditCard, LogOut, Library } from 'lucide-react';

export function DashboardLayout({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Katalog', path: '/dashboard/catalog', icon: <BookOpen size={20} /> },
    { name: "Cirkulyatsiya", path: '/dashboard/circulation', icon: <Repeat size={20} /> },
    { name: "A'zolar", path: '/dashboard/members', icon: <Users size={20} /> },
    { name: 'Moliya', path: '/dashboard/finance', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] flex">
      {/* Sidebar - Glass */}
      <aside className="w-64 glass-panel m-4 flex flex-col justify-between hidden md:flex shrink-0 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
        <div>
          <div className="p-6 border-b border-white/5 flex items-center gap-3 relative">
             <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
               <Library size={24} />
             </div>
             <div>
                <span className="font-bold text-lg text-white block leading-tight">LMS Pro</span>
                <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">Enterprise Edition</span>
             </div>
          </div>
          <nav className="p-4 space-y-1 relative">
            {navItems.map((item) => (
              <NavLink 
                key={item.name} 
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-white/5 relative">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium">
            <LogOut size={20} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:pl-0 h-screen overflow-hidden flex flex-col">
         {/* Top Header Small (for mobile or extra global actions) */}
         <div className="h-16 glass-panel mb-4 flex items-center justify-end px-6 shrink-0 md:hidden">
            <span className="font-bold text-white">LMS Pro</span>
         </div>
         
         {/* Dynamic Outlet */}
         <div className="flex-1 overflow-y-auto rounded-2xl pr-2 custom-scrollbar">
            <Outlet />
         </div>
      </main>
    </div>
  );
}
