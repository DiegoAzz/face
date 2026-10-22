import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Share2, Plus, Power, PowerOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const FacebookPagesPage: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const res = await api.get('/pages');
      setPages(res.data);
    } catch (e) {
      console.error('Error cargando páginas:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMeta = async () => {
    try {
      const res = await api.get('/meta/connect/start');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error iniciando flujo OAuth con Meta. Verifique META_APP_ID en .env');
    }
  };

  const togglePublishing = async (page: any) => {
    const action = page.publishingEnabled ? 'disable' : 'enable';
    try {
      await api.post(`/pages/${page.id}/publishing/${action}`);
      await loadPages();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error cambiando estado de publicación');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Páginas Oficiales de Facebook</h1>
          <p className="text-sm text-slate-500">
            Integración mediante Meta Graph API v19+ y Facebook Login for Business
          </p>
        </div>

        <button
          onClick={handleConnectMeta}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar con Meta for Developers</span>
        </button>
      </div>

      {/* Alerta de Políticas de Meta */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Aprobación de Permisos Requeridos en Meta</span>
        </div>
        <p>
          Para publicar automáticamente en Facebook, la app de Meta debe tener aprobados los permisos: <code>pages_manage_posts</code>, <code>pages_read_engagement</code> y <code>pages_show_list</code>.
          Los tokens de acceso de páginas se cifran en reposo mediante <strong>AES-256-GCM</strong> y jamás son transmitidos al navegador.
        </p>
      </div>

      {/* Lista de páginas */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Páginas Administrables ({pages.length})
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando páginas vinculadas...</div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay páginas de Facebook conectadas todavía.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Haz clic en <strong>"Conectar con Meta for Developers"</strong> para autorizar el acceso oficial a tus páginas administradas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pages.map((p) => (
              <div key={p.id} className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{p.pageName}</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {p.pageId}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Estado: <strong className="text-emerald-600">{p.status}</strong> • Publicación automática:{' '}
                    <strong>{p.publishingEnabled ? 'HABILITADA' : 'DESACTIVADA (Modo Seguro)'}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => togglePublishing(p)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      p.publishingEnabled
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {p.publishingEnabled ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Pausar Publicación</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        <span>Habilitar Publicación</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
