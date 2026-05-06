import React from 'react';
import { ChevronDown } from 'lucide-react';
import { officer } from '../data/mockData';

const Navbar = ({ breadcrumbs }) => {
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

        <div className="flex items-center gap-3 cursor-pointer hover:bg-government-surfaceHover p-1.5 rounded-lg transition-colors">
          <div className="w-10 h-10 rounded-full bg-government-primary text-white flex items-center justify-center font-bold">
            {officer.initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-government-textPrimary">{officer.name}</span>
            <span className="text-xs text-government-textMuted">{officer.department}</span>
          </div>
          <ChevronDown size={16} className="text-government-textMuted ml-1" />
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
