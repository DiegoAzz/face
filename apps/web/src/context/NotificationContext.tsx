import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

export interface NewsAlert {
  id: string;
  title: string;
  excerpt: string;
  imageUrl?: string | null;
  canonicalUrl: string;
  source?: {
    name: string;
    category: string;
  };
  publishedAt: string;
  fetchedAt: string;
}

interface NotificationContextType {
  alerts: NewsAlert[];
  unreadCount: number;
  desktopEnabled: boolean;
  soundEnabled: boolean;
  permissionStatus: NotificationPermission;
  activeToast: NewsAlert | null;
  requestDesktopPermission: () => Promise<boolean>;
  toggleDesktop: () => void;
  toggleSound: () => void;
  markAllAsRead: () => void;
  dismissToast: () => void;
  triggerTestAlert: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Síntesis de sonido con Web Audio API (no requiere archivos externos)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Si el navegador bloquea audio sin interacción previa
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<NewsAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [desktopEnabled, setDesktopEnabled] = useState<boolean>(() => {
    return localStorage.getItem('newsflow_desktop_alerts') !== 'false';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('newsflow_sound_alerts') !== 'false';
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const [activeToast, setActiveToast] = useState<NewsAlert | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);
  const toastTimeoutRef = useRef<any>(null);

  // Solicitar permiso de notificaciones nativas de escritorio
  const requestDesktopPermission = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      alert('Tu navegador no soporta notificaciones de escritorio.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        setDesktopEnabled(true);
        localStorage.setItem('newsflow_desktop_alerts', 'true');
        return true;
      } else {
        setDesktopEnabled(false);
        localStorage.setItem('newsflow_desktop_alerts', 'false');
        return false;
      }
    } catch {
      return false;
    }
  };

  const toggleDesktop = async () => {
    if (!desktopEnabled) {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        await requestDesktopPermission();
      } else {
        setDesktopEnabled(true);
        localStorage.setItem('newsflow_desktop_alerts', 'true');
      }
    } else {
      setDesktopEnabled(false);
      localStorage.setItem('newsflow_desktop_alerts', 'false');
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('newsflow_sound_alerts', next ? 'true' : 'false');
      if (next) playNotificationChime();
      return next;
    });
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  // Lanzar notificación de escritorio
  const fireDesktopNotification = (item: NewsAlert) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted' || !desktopEnabled) return;

    try {
      const notif = new Notification(`📢 Nueva Noticia: ${item.source?.name || 'Colombia'}`, {
        body: item.title,
        icon: item.imageUrl || '/favicon.ico',
        tag: `news-${item.id}`,
      });

      notif.onclick = () => {
        window.focus();
        window.location.href = '/news';
      };
    } catch {
      // Ignorar si el sistema operativo restringe la notificación
    }
  };

  // Botón para probar alerta inmediata
  const triggerTestAlert = () => {
    const testItem: NewsAlert = {
      id: `test-${Date.now()}`,
      title: '🚨 Alerta de Prueba: Sistema de noticias en segundo plano activo y funcionando',
      excerpt: 'Las notificaciones de escritorio y sonido están configuradas correctamente.',
      canonicalUrl: 'https://face.appzplay.online/news',
      source: { name: 'NewsFlow AI', category: 'Sistema' },
      publishedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    };

    if (soundEnabled) playNotificationChime();
    fireDesktopNotification(testItem);
    setActiveToast(testItem);
    setUnreadCount((c) => c + 1);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 7000);
  };

  // Consulta periódica en segundo plano cada 30 segundos
  useEffect(() => {
    if (!user) return;

    const pollAlerts = async () => {
      try {
        const res = await api.get('/news/alerts');
        const items: NewsAlert[] = res.data || [];

        if (isFirstLoadRef.current) {
          // Primera carga: registrar existentes sin disparar spam de alertas
          items.forEach((it) => seenIdsRef.current.add(it.id));
          setAlerts(items);
          isFirstLoadRef.current = false;
          return;
        }

        // Detectar nuevos ítems
        const newItems = items.filter((it) => !seenIdsRef.current.has(it.id));

        if (newItems.length > 0) {
          newItems.forEach((it) => seenIdsRef.current.add(it.id));

          // Actualizar lista y contador
          setAlerts(items);
          setUnreadCount((prev) => prev + newItems.length);

          // Disparar alertas para la noticia más reciente
          const latest = newItems[0];
          if (soundEnabled) playNotificationChime();
          if (desktopEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            fireDesktopNotification(latest);
          }

          // Mostrar toast flotante en pantalla
          setActiveToast(latest);
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 7000);
        }
      } catch {
        // Silenciar errores de sondeo en segundo plano
      }
    };

    pollAlerts();
    const interval = setInterval(pollAlerts, 30000); // Cada 30s

    return () => clearInterval(interval);
  }, [user, desktopEnabled, soundEnabled]);

  return (
    <NotificationContext.Provider
      value={{
        alerts,
        unreadCount,
        desktopEnabled,
        soundEnabled,
        permissionStatus,
        activeToast,
        requestDesktopPermission,
        toggleDesktop,
        toggleSound,
        markAllAsRead,
        dismissToast,
        triggerTestAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de un NotificationProvider');
  }
  return context;
};
