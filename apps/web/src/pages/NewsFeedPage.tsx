import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Newspaper, Sparkles, ExternalLink, Filter, CheckCircle2, RefreshCw, Search, Tag } from 'lucide-react';

export const NewsFeedPage: React.FC = () => {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const getCategory = (cluster: any): string => {
    const raw = cluster.storyClusterItems?.[0]?.item?.source?.category || '';
    const lower = raw.toLowerCase();
    if (lower.includes('deporte')) return 'Deportes';
    if (
      lower.includes('entreten') ||
      lower.includes('gente') ||
      lower.includes('farand') ||
      lower.includes('chisme') ||
      lower.includes('cultura')
    )
      return 'Entretenimiento';
    if (lower.includes('econom') || lower.includes('finanz') || lower.includes('negocio'))
      return 'Economía';
    if (
      lower.includes('colombia') ||
      lower.includes('actual') ||
      lower.includes('politica') ||
      lower.includes('nacion')
    )
      return 'Actualidad';
    return raw || 'General';
  };

  const categoryBadges: { id: string; label: string; icon: string }[] = [
    { id: 'Todas', label: 'Todas', icon: '📰' },
    { id: 'Deportes', label: 'Deportes', icon: '⚽' },
    { id: 'Entretenimiento', label: 'Entretenimiento / Farándula', icon: '🎭' },
    { id: 'Economía', label: 'Economía', icon: '💼' },
    { id: 'Actualidad', label: 'Actualidad / Colombia', icon: '🇨🇴' },
  ];

  const filteredStories = stories.filter((cluster) => {
    const primaryItem = cluster.storyClusterItems?.[0]?.item;
    const cat = getCategory(cluster);
    const matchesCategory =
      selectedCategory === 'Todas' || cat.toLowerCase() === selectedCategory.toLowerCase();

    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      (primaryItem?.title && primaryItem.title.toLowerCase().includes(searchLower)) ||
      (primaryItem?.excerpt && primaryItem.excerpt.toLowerCase().includes(searchLower)) ||
      (primaryItem?.source?.name && primaryItem.source.name.toLowerCase().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'deportes':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'entretenimiento':
        return 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'economía':
      case 'economia':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'actualidad':
      case 'colombia':
        return 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Noticias Detectadas y Curación</h1>
          <p className="text-sm text-slate-500">
            Filtra por categorías (Deportes, Farándula, Economía) y genera publicaciones para Facebook
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Sincronizando fuentes...' : 'Sincronizar Feeds RSS'}</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Barra de Filtros por Categoría y Buscador */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryBadges.map((cat) => {
              const count =
                cat.id === 'Todas'
                  ? stories.length
                  : stories.filter((s) => getCategory(s).toLowerCase() === cat.id.toLowerCase()).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory.toLowerCase() === cat.id.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      selectedCategory.toLowerCase() === cat.id.toLowerCase()
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por titular, tema o fuente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Cargando feed de noticias...</div>
      ) : filteredStories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <Newspaper className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {stories.length === 0
              ? 'No hay noticias pendientes'
              : `No se encontraron noticias en la categoría "${selectedCategory}"`}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {stories.length === 0
              ? 'Pulsa el botón para consultar los feeds RSS de El Tiempo, El Espectador y Portafolio ahora mismo.'
              : 'Prueba sincronizando los feeds para traer las últimas noticias de Deportes, Entretenimiento y Farándula.'}
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Todas las Categorías Ahora'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStories.map((cluster) => {
            const primaryItem = cluster.storyClusterItems?.[0]?.item;
            const hasDraft = cluster.drafts && cluster.drafts.length > 0;
            const category = getCategory(cluster);

            return (
              <div
                key={cluster.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-5 items-start justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Imagen Real de la Noticia */}
                {primaryItem?.imageUrl && (
                  <div className="w-full md:w-56 h-36 flex-shrink-0 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    <img
                      src={primaryItem.imageUrl}
                      alt={primaryItem.title || 'Imagen de la noticia'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2 flex-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold px-2.5 py-0.5 rounded-full border text-[11px] ${getCategoryColor(
                        category
                      )}`}
                    >
                      {category}
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
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
