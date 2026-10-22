import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Newspaper, Sparkles, ExternalLink, Filter, CheckCircle2, RefreshCw } from 'lucide-react';

export const NewsFeedPage: React.FC = () => {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const res = await api.get('/stories');
      setStories(res.data);
    } catch (e) {
      console.error('Error cargando historias:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await api.post('/news/sync');
      setMessage(res.data?.message || 'Sincronización completada con éxito');
      await loadStories();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error sincronizando fuentes RSS');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateDraft = async (clusterId: string) => {
    setGeneratingId(clusterId);
    setMessage(null);
    try {
      await api.post(`/stories/${clusterId}/generate-draft`);
      setMessage('Borrador generado exitosamente y enviado a la Sala Editorial');
      await loadStories();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error generando borrador con IA');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Noticias Detectadas y Curación</h1>
          <p className="text-sm text-slate-500">Agrupadas por acontecimientos únicos para evitar publicaciones repetidas</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Sincronizando...' : 'Sincronizar Feeds RSS'}</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Cargando feed de noticias...</div>
      ) : stories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <Newspaper className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No hay noticias pendientes</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Pulsa el botón para consultar los feeds RSS de El Tiempo, El Espectador y Portafolio ahora mismo.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Fuentes Oficiales Ahora'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stories.map((cluster) => {
            const primaryItem = cluster.storyClusterItems?.[0]?.item;
            const hasDraft = cluster.drafts && cluster.drafts.length > 0;

            return (
              <div
                key={cluster.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      {primaryItem?.source?.name || 'Fuente Oficial'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      Score de Relevancia: <strong>{cluster.relevanceScore?.toFixed(0) || 85}/100</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      Estado: <strong className="text-slate-700 dark:text-slate-300">{cluster.verificationStatus}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {primaryItem?.title || cluster.topic}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {primaryItem?.excerpt}
                  </p>

                  <div className="flex items-center space-x-4 pt-1 text-xs text-slate-500">
                    <a
                      href={primaryItem?.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-600 hover:underline"
                    >
                      <span>Ver fuente original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span>
                      Publicado:{' '}
                      {primaryItem?.publishedAt
                        ? new Date(primaryItem.publishedAt).toLocaleString('es-CO')
                        : 'Reciente'}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center">
                  {hasDraft ? (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                      Borrador Creado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleGenerateDraft(cluster.id)}
                      disabled={generatingId === cluster.id}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatingId === cluster.id ? 'Redactando...' : 'Generar Borrador'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
