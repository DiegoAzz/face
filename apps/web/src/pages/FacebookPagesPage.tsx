import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Share2, Plus, Power, PowerOff, ShieldCheck, Key, HelpCircle, ExternalLink, X } from 'lucide-react';

export const FacebookPagesPage: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para vinculación directa de Token
  const [showModal, setShowModal] = useState(false);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/pages/manual', {
        pageId: pageId.trim(),
        pageName: pageName.trim() || undefined,
        pageAccessToken: pageAccessToken.trim(),
      });
      setShowModal(false);
      setPageId('');
      setPageName('');
      setPageAccessToken('');
      await loadPages();
      alert('¡Página de Facebook verificada y vinculada exitosamente!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error verificando la página con Meta');
    } finally {
      setSubmitting(false);
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
            Integración mediante Meta Graph API v19+ y Cifrado AES-256-GCM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Key className="w-4 h-4" />
            <span>Vincular con Token de Página (Directo)</span>
          </button>
          <button
            onClick={handleConnectMeta}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Facebook OAuth</span>
          </button>
        </div>
      </div>

      {/* Modal de Vinculación Manual de Página */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Vincular Fan Page de Facebook
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  ID de la Página (Page ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 104829104810291"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Lo encuentras en Facebook: Tu Página → Información → Transparencia de la página.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nombre de la Página (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mi Periódico Digital"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Token de Acceso de Página (Page Access Token) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Pega el token que empieza por EAAB..."
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Generado con los permisos <code>pages_manage_posts</code> y <code>pages_read_engagement</code>.
                </span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>¿Cómo obtener este Token en 1 minuto?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Entra al{' '}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-blue-600 dark:text-blue-400"
                  >
                    Graph API Explorer de Meta <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  , selecciona tu app, en <em>User or Page</em> elige tu Página, marca <code>pages_manage_posts</code> y haz clic en <em>Generate Access Token</em>.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                >
                  {submitting ? 'Verificando con Meta...' : 'Verificar y Guardar Página'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerta de Políticas de Meta */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Seguridad Criptográfica y Políticas de Meta</span>
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
          <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay páginas de Facebook conectadas todavía.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Haz clic en <strong>"Vincular con Token de Página (Directo)"</strong> para registrar tu Fan Page en 2 minutos.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Key className="w-4 h-4" />
              <span>Vincular mi primera página ahora</span>
            </button>
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
