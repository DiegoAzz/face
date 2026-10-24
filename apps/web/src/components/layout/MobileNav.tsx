import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileEdit,
  Newspaper,
  Share2,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Noticias', path: '/news', icon: Newspaper },
    { name: 'Sala Editorial', path: '/editorial', icon: FileEdit },
    { name: 'Páginas Facebook', path: '/pages', icon: Share2 },
  ];

  return (
    <>
      {/* 1. Barra de Navegación Inferior Fija para Móvil (Estilo App) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-3 z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 sm:px-4 rounded-xl transition ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] leading-tight font-medium">{item.name}</span>
            </NavLink>
          );
        })}

        {/* Botón de Menú / Cuenta */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight font-medium">Cuenta</span>
        </button>
      </nav>

      {/* 2. Drawer / Cajón Lateral Completo para Móvil */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop con desenfoque */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel Lateral Deslizable */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between z-10 shadow-2xl p-4 overflow-y-auto animate-fade-in">
            <div className="space-y-4">
              {/* Cabecera del Drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                    NewsFlow <span className="text-blue-600 font-bold">AI</span>
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Móvil
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista limpia de enlaces */}
              <div className="space-y-1">
                <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Módulos Activos
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Pie del Drawer con usuario y cerrar sesión */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="truncate min-w-0">
                  <div className="font-semibold truncate">{user?.email}</div>
                  <div className="text-[10px] text-slate-400">{user?.role}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
