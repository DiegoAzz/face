import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  FileEdit,
  Calendar,
  Share2,
  Users,
  Rss,
  Sparkles,
  History,
  Settings,
} from 'lucide-react';

const navItems = [
  { name: 'Inicio (KPIs)', path: '/', icon: LayoutDashboard },
  { name: 'Noticias detectadas', path: '/news', icon: Newspaper },
  { name: 'Sala editorial', path: '/editorial', icon: FileEdit },
  { name: 'Calendario', path: '/calendar', icon: Calendar },
  { name: 'Páginas Facebook', path: '/pages', icon: Share2 },
  { name: 'Grupos (Manual)', path: '/groups', icon: Users },
  { name: 'Fuentes RSS', path: '/sources', icon: Rss },
  { name: 'Plantillas e IA', path: '/templates', icon: Sparkles },
  { name: 'Historial y Métricas', path: '/history', icon: History },
  { name: 'Configuración y Auditoría', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
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
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
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
