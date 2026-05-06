import React, { useState } from 'react';
import { ChevronDown, LogOut, Users } from 'lucide-react';

const Navbar = ({ breadcrumbs }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const officerStr = localStorage.getItem('officer');
  const officer = officerStr ? JSON.parse(officerStr) : { name: 'Officer', department: 'Department' };
  const initials = officer.name ? officer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'OF';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('officer');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-government-navbarBg border-b border-government-navbarBorder w-full sticky top-0 z-50 flex flex-col">
      <div className="h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-government-primary flex items-center justify-center text-government-primary text-xs font-bold">
            GOI
          </div>
          <span className="text-government-primary font-bold text-xl tracking-wide">TENDER.AI</span>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 text-government-textMuted font-medium">
          Procurement Portal
        </div>

        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-government-surfaceHover p-1.5 rounded-lg transition-colors relative"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <div className="w-10 h-10 rounded-full bg-government-primary text-white flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-government-textPrimary">{officer.name}</span>
            <span className="text-xs text-government-textMuted">{officer.department}</span>
          </div>
          <ChevronDown size={16} className="text-government-textMuted ml-1" />
          
          {showProfileMenu && (
            <div className="absolute top-14 right-0 bg-white shadow-lg border border-government-border rounded-btn py-2 w-48 z-50">
              {officer.role === 'admin' && (
                <div 
                  className="px-4 py-2 text-sm text-government-textPrimary hover:bg-government-surfaceHover flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => { window.location.href = '/officers'; }}
                >
                  <Users size={16} />
                  Manage Officers
                </div>
              )}
              <div 
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
      
      {breadcrumbs && (
        <div className="h-10 border-t border-government-navbarBorder flex items-center px-6 text-sm text-government-textMuted bg-government-bg">
          {breadcrumbs}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
