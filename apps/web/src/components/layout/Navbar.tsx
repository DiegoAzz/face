import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  LogOut,
  Shield,
  User,
  Volume2,
  VolumeX,
  Laptop,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  X,
  Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  } catch {
    return 'Reciente';
  }
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    alerts,
    unreadCount,
    desktopEnabled,
    soundEnabled,
    permissionStatus,
    activeToast,
    toggleDesktop,
    toggleSound,
    markAllAsRead,
    dismissToast,
    triggerTestAlert,
  } = useNotifications();

  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenDropdown = () => {
    setOpenDropdown((prev) => !prev);
    if (!openDropdown && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleAlertClick = (alert: any) => {
    setOpenDropdown(false);
    navigate('/news');
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-lg text-slate-800 dark:text-slate-100">
            NewsFlow <span className="text-blue-600 font-bold">AI</span>
          </span>
          <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
            {user?.organizationName || 'Colombia'}
          </span>
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Monitoreo 24/7 en Segundo Plano</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Campana de Notificaciones y Alertas en Segundo Plano */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleOpenDropdown}
              className={`relative p-2 rounded-xl transition border ${
                openDropdown
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 border-blue-300 dark:border-blue-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}
              title="Alertas de noticias en segundo plano"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Menú Desplegable de Alertas */}
            {openDropdown && (
              <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
                {/* Cabecera del Centro de Notificaciones */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Alertas de Noticias
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                    Segundo plano activo
                  </span>
                </div>

                {/* Controles de Configuración de Alertas */}
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    onClick={toggleDesktop}
                    className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg font-medium transition ${
                      desktopEnabled && permissionStatus === 'granted'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="Activar alertas nativas de Windows/Mac/Android"
                  >
                    <Laptop className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {permissionStatus === 'granted' && desktopEnabled ? 'Escritorio ✓' : 'Escritorio'}
                    </span>
                  </button>

                  <button
                    onClick={toggleSound}
                    className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg font-medium transition ${
                      soundEnabled
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="Sonido de campana para noticias de última hora"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Sonido ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Silencio</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={triggerTestAlert}
                    className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 transition"
                    title="Probar notificación ahora mismo"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Probar</span>
                  </button>
                </div>

                {/* Lista de Noticias Recientes Detectadas */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Esperando nuevas noticias de los medios...
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAlertClick(item)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition flex items-start space-x-3 text-xs"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-100 dark:border-slate-800"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-lg flex-shrink-0">
                            📰
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              {item.source?.category || 'Noticia'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(item.publishedAt || item.fetchedAt)}
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Fuente: {item.source?.name || 'Oficial'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pie del menú */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setOpenDropdown(false);
                      navigate('/news');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <span>Ver todas las noticias</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={markAllAsRead}
                    className="text-slate-500 hover:text-slate-700 text-[11px]"
                  >
                    Marcar leídas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rol y usuario */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Rol: <strong className="text-slate-700 dark:text-slate-200">{user?.role}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="flex items-center space-x-1.5 text-sm text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-xs truncate max-w-[120px]">{user?.email}</span>
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

      {/* Floating Toast Notification (Aparece en pantalla cuando ingresa nueva noticia en segundo plano) */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 animate-slide-up flex items-start space-x-3">
          {activeToast.imageUrl ? (
            <img
              src={activeToast.imageUrl}
              alt=""
              className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-slate-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-600/30 flex items-center justify-center text-2xl flex-shrink-0">
              ⚡
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                🚨 Nueva Noticia en Segundo Plano
              </span>
              <button
                onClick={dismissToast}
                className="text-slate-400 hover:text-white p-0.5 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-semibold text-xs text-white line-clamp-2 leading-snug">
              {activeToast.title}
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {activeToast.source?.name || 'Medio Oficial'}
              </span>
              <button
                onClick={() => {
                  dismissToast();
                  navigate('/news');
                }}
                className="text-[11px] font-bold text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>Ver y Redactar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
