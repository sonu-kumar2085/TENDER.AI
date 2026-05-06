import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[12px] shadow-cardHover w-full max-w-[560px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-government-border">
          <h2 className="text-lg font-semibold text-government-textPrimary">{title}</h2>
          <button onClick={onClose} className="text-government-textMuted hover:text-government-primary transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
