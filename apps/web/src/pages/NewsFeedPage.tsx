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
    const primaryItem = cluster.storyClusterItems?.[0]?.item;
    const title = (primaryItem?.title || cluster.title || '').toLowerCase();
    const excerpt = (primaryItem?.excerpt || '').toLowerCase();
    const url = (primaryItem?.canonicalUrl || '').toLowerCase();
    const rawCat = (primaryItem?.source?.category || '').toLowerCase();
    const combined = `${title} ${excerpt} ${url} ${rawCat}`;

    // 1. Salud y Bienestar (cuatrillizos, medicina, hospitales, tratamientos)
    if (
      url.includes('/salud') ||
      rawCat === 'salud' ||
      combined.includes('cuatrillizo') ||
      combined.includes('nacieron') ||
      combined.includes('embarazo') ||
      combined.includes('milagro médico') ||
      combined.includes('médic') ||
      combined.includes('medic') ||
      combined.includes('hospital') ||
      combined.includes('clínica') ||
      combined.includes('clinica') ||
      combined.includes('cirugía') ||
      combined.includes('cirugia') ||
      combined.includes('enfermedad') ||
      combined.includes('cáncer') ||
      combined.includes('vacuna') ||
      combined.includes('paciente')
    ) {
      return 'Salud';
    }

    // 2. Deportes
    if (
      url.includes('/deportes') ||
      rawCat === 'deportes' ||
      combined.includes('deporte') ||
      combined.includes('fútbol') ||
      combined.includes('futbol') ||
      combined.includes('partido') ||
      combined.includes('gol') ||
      combined.includes('ciclismo') ||
      combined.includes('tour') ||
      combined.includes('champions') ||
      combined.includes('copa libertadores') ||
      combined.includes('millonarios') ||
      combined.includes('atletico nacional') ||
      combined.includes('james rodríguez') ||
      combined.includes('luis díaz') ||
      combined.includes('estadio') ||
      combined.includes('selección colombia')
    ) {
      return 'Deportes';
    }

    // 3. Entretenimiento / Farándula
    if (
      url.includes('/gente') ||
      url.includes('/farandula') ||
      url.includes('/entretenimiento') ||
      rawCat === 'entretenimiento' ||
      combined.includes('farandula') ||
      combined.includes('farándula') ||
      combined.includes('chisme') ||
      combined.includes('shakira') ||
      combined.includes('karol g') ||
      combined.includes('maluma') ||
      combined.includes('concierto') ||
      combined.includes('actor') ||
      combined.includes('actriz') ||
      combined.includes('cantante') ||
      combined.includes('novela') ||
      combined.includes('reality') ||
      combined.includes('masterchef') ||
      combined.includes('influencer')
    ) {
      return 'Entretenimiento';
    }

    // 4. Economía y Negocios
    if (
      url.includes('/economia') ||
      url.includes('/negocios') ||
      rawCat === 'economía' ||
      rawCat === 'economia' ||
      combined.includes('dólar') ||
      combined.includes('dolar') ||
      combined.includes('inflación') ||
      combined.includes('inflacion') ||
      combined.includes('banco de la república') ||
      combined.includes('tasa de interés') ||
      combined.includes('ecopetrol') ||
      combined.includes('pib') ||
      combined.includes('reforma tributaria') ||
      combined.includes('salario mínimo') ||
      combined.includes('bursátil') ||
      combined.includes('petróleo')
    ) {
      return 'Economía';
    }

    // 5. Tecnología e IA (usar palabras completas, NUNCA 'ia' como subcadena suelta)
    if (
      url.includes('/tecnosfera') ||
      url.includes('/tecnologia') ||
      url.includes('/innovacion') ||
      rawCat === 'tecnología' ||
      rawCat === 'tecnologia' ||
      combined.includes('inteligencia artificial') ||
      combined.includes('chatgpt') ||
      combined.includes('openai') ||
      combined.includes('smartphone') ||
      combined.includes('iphone') ||
      combined.includes('apple') ||
      combined.includes('google') ||
      combined.includes('ciberseguridad') ||
      combined.includes('videojuego') ||
      combined.includes('playstation') ||
      combined.includes('robótica') ||
      /\b(ia|ai|gadget)\b/i.test(title)
    ) {
      return 'Tecnología';
    }

    // 6. Ciencia y Ambiente
    if (
      url.includes('/ciencia') ||
      url.includes('/ambiente') ||
      rawCat === 'ciencia' ||
      combined.includes('planeta') ||
      combined.includes('espacio') ||
      combined.includes('astronomía') ||
      combined.includes('biodiversidad') ||
      combined.includes('fauna') ||
      combined.includes('flora') ||
      combined.includes('cambio climático') ||
      combined.includes('deforestación') ||
      combined.includes('medio ambiente')
    ) {
      return 'Ciencia';
    }

    // 7. Mundo
    if (
      url.includes('/mundo') ||
      url.includes('/internacional') ||
      rawCat === 'mundo' ||
      combined.includes('ucrania') ||
      combined.includes('rusia') ||
      combined.includes('estados unidos') ||
      combined.includes('trump') ||
      combined.includes('biden') ||
      combined.includes('israel') ||
      combined.includes('gaza') ||
      combined.includes('maduro') ||
      combined.includes('venezuela')
    ) {
      return 'Mundo';
    }

    // 8. Cultura y Estilo
    if (
      url.includes('/cultura') ||
      url.includes('/estilo') ||
      rawCat === 'cultura' ||
      combined.includes('literatura') ||
      combined.includes('libro') ||
      combined.includes('museo') ||
      combined.includes('gastronomía') ||
      combined.includes('turismo') ||
      combined.includes('moda')
    ) {
      return 'Cultura';
    }

    // 9. Actualidad / Colombia (atentados, seguridad, política, ciudades)
    if (
      url.includes('/colombia') ||
      url.includes('/politica') ||
      url.includes('/justicia') ||
      url.includes('/bogota') ||
      rawCat === 'actualidad' ||
      rawCat === 'colombia' ||
      combined.includes('carro bomba') ||
      combined.includes('atentado') ||
      combined.includes('peaje') ||
      combined.includes('policía') ||
      combined.includes('ejército') ||
      combined.includes('captura') ||
      combined.includes('heridos') ||
      combined.includes('gobierno') ||
      combined.includes('presidente') ||
      combined.includes('petro') ||
      combined.includes('congreso') ||
      combined.includes('alcalde') ||
      combined.includes('fiscalía') ||
      combined.includes('casanare') ||
      combined.includes('medellín') ||
      combined.includes('bogotá')
    ) {
      return 'Actualidad';
    }

    return 'Actualidad';
  };

  const categoryBadges: { id: string; label: string; icon: string }[] = [
    { id: 'Todas', label: 'Todas', icon: '📰' },
    { id: 'Tecnología', label: 'Tecnología e IA', icon: '💻' },
    { id: 'Deportes', label: 'Deportes', icon: '⚽' },
    { id: 'Entretenimiento', label: 'Entretenimiento / Farándula', icon: '🎭' },
    { id: 'Economía', label: 'Economía y Negocios', icon: '💼' },
    { id: 'Actualidad', label: 'Actualidad / Colombia', icon: '🇨🇴' },
    { id: 'Mundo', label: 'Mundo', icon: '🌎' },
    { id: 'Salud', label: 'Salud y Bienestar', icon: '🩺' },
    { id: 'Ciencia', label: 'Ciencia y Ambiente', icon: '🌿' },
    { id: 'Cultura', label: 'Cultura y Estilo', icon: '✈️' },
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
      case 'tecnología':
      case 'tecnologia':
        return 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'deportes':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'entretenimiento':
        return 'bg-pink-50 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      case 'economía':
      case 'economia':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'actualidad':
      case 'colombia':
        return 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'mundo':
        return 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'salud':
        return 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'ciencia':
        return 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'cultura':
        return 'bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
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
