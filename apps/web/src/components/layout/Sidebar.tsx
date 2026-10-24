import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Newspaper,
  FileEdit,
  Share2,
} from 'lucide-react';

const navItems = [
  { name: 'Noticias detectadas', path: '/news', icon: Newspaper },
  { name: 'Sala editorial', path: '/editorial', icon: FileEdit },
  { name: 'Páginas Facebook', path: '/pages', icon: Share2 },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col justify-between min-h-[calc(100vh-4rem)] flex-shrink-0">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Operación Editorial
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Coolify VPS Conectado</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          NewsFlow AI v1.0 • Meta Graph v19
        </div>
      </div>
    </aside>
  );
};
