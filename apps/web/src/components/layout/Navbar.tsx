import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, Shield, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <span className="font-semibold text-lg text-slate-800 dark:text-slate-100">
          NewsFlow <span className="text-blue-600 font-bold">AI</span>
        </span>
        <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
          {user?.organizationName || 'Colombia'}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Rol: <strong className="text-slate-700 dark:text-slate-200">{user?.role}</strong></span>
          <span className="text-slate-400">•</span>
          <span>TZ: <strong>America/Bogota</strong></span>
        </div>

        <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-4">
          <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-xs truncate max-w-[150px]">{user?.email}</span>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
