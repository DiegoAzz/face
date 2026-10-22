import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { History, ExternalLink, RefreshCw, CheckCircle, AlertOctagon, Clock } from 'lucide-react';

export const HistoryAnalyticsPage: React.FC = () => {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      const res = await api.get('/publications');
      setPublications(res.data);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await api.post(`/publications/${id}/retry`);
      alert(`Resultado del reintento: ${res.data.status}`);
      await loadPublications();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error reintentando publicación');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de Publicaciones y Auditoría</h1>
          <p className="text-sm text-slate-500">
            Registro con ID remotos de Meta, intentos de transmisión y reconciliación
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Trazabilidad de Trabajos de Publicación ({publications.length})
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando historial...</div>
        ) : publications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-dashed rounded-lg">
            No se han registrado trabajos de publicación todavía.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {publications.map((pub) => {
              const isPublished = pub.status === 'PUBLISHED';
              const isFailed = pub.status.includes('FAILED');

              return (
                <div key={pub.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center space-x-2 text-xs">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : isFailed
                            ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {pub.status}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {pub.page?.pageName}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Intentos: {pub.attempts}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {pub.draft?.title}
                    </h3>

                    {pub.remotePostId && (
                      <div className="flex items-center space-x-2 text-xs text-blue-600 font-mono">
                        <span>Remote Post ID: {pub.remotePostId}</span>
                        <a
                          href={`https://facebook.com/${pub.remotePostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center space-x-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {pub.lastErrorCode && (
                      <p className="text-xs text-red-600 font-mono">
                        Código de error Meta: {pub.lastErrorCode}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center space-x-2">
                    {isFailed && (
                      <button
                        onClick={() => handleRetry(pub.id)}
                        disabled={retryingId === pub.id}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retryingId === pub.id ? 'animate-spin' : ''}`} />
                        <span>Reintentar Envio</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
