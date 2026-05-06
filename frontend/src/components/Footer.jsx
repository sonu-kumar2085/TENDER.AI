import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-government-footerBg text-government-footerText w-full mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="space-y-2">
          <div className="text-white font-bold text-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-white flex items-center justify-center text-[8px]">GOI</div>
            TENDER.AI
          </div>
          <div className="text-government-primaryPale">Government Procurement Intelligence System</div>
          <div className="text-government-primaryPale pt-4">© 2025 Government of India. All Rights Reserved.</div>
        </div>
        
        <div className="space-y-2 flex flex-col">
          <a href="#" className="text-white hover:text-government-primaryPale transition-colors py-1">Home</a>
          <a href="#" className="text-white hover:text-government-primaryPale transition-colors py-1">Active Tenders</a>
          <a href="#" className="text-white hover:text-government-primaryPale transition-colors py-1">Audit Logs</a>
          <a href="#" className="text-white hover:text-government-primaryPale transition-colors py-1">Help & Documentation</a>
          <a href="#" className="text-white hover:text-government-primaryPale transition-colors py-1">RTI Portal</a>
        </div>
        
        <div className="space-y-2">
          <div className="text-white">Nodal Officer: procurement@gov.in</div>
          <div className="text-white">Helpline: 1800-XXX-XXXX (Toll Free)</div>
          <div className="text-white pt-2">NIC Data Centre Hosted</div>
          <div className="text-white">ISO 27001 Certified</div>
        </div>
      </div>
      
      <div className="bg-[#0D3D11] text-center py-3 text-xs text-government-primaryPale">
        Site designed and developed by National Informatics Centre (NIC) | Best viewed in Chrome 90+ at 1280x720<br/>
        All evaluation actions are recorded under the Electronic Evidence Act. Audit trail is CAG-compliant and RTI-ready.
      </div>
    </footer>
  );
};

export default Footer;
