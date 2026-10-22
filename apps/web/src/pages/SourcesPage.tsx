import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Rss, Plus, CheckCircle, AlertTriangle, Play, Shield } from 'lucide-react';

export const SourcesPage: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Formulario nueva fuente
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [licenseNotes, setLicenseNotes] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const res = await api.get('/sources');
      setSources(res.data);
    } catch (e) {
      console.error('Error cargando fuentes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSource = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.post(`/sources/${id}/test`);
      alert(`Prueba exitosa:\nLatencia: ${res.data.latencyMs}ms\nFeed XML válido: ${res.data.isValidFeed ? 'Sí' : 'No'}`);
      await loadSources();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error probando la conectividad de la fuente');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sources', {
        name,
        url,
        category,
        licenseNotes,
        locale: 'es-CO',
        pollingIntervalMinutes: 30,
      });
      setShowAdd(false);
      setName('');
      setUrl('');
      setCategory('General');
      setLicenseNotes('');
      await loadSources();
      alert('Fuente RSS agregada con éxito');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error creando fuente RSS. Asegúrese de que no infrinja la política SSRF.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fuentes de Noticias y Sindicación</h1>
          <p className="text-sm text-slate-500">
            Medios autorizados de Colombia y el mundo • Protección anti-SSRF activa
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Fuente RSS</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-500 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registrar Nueva Fuente RSS Oficial</h3>
          <form onSubmit={handleCreateSource} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Nombre del Medio (ej. El Espectador)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="Categoría (ej. Colombia, Economía, Tecnología)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <input
              type="url"
              required
              placeholder="URL oficial del Feed RSS (https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />

            <input
              type="text"
              placeholder="Términos de licencia o notas (ej. Cita obligatoria con enlace canónico)"
              value={licenseNotes}
              onChange={(e) => setLicenseNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
              >
                Guardar Fuente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de fuentes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Catálogo de Fuentes Activas ({sources.length})
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando catálogo...</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sources.map((src) => (
              <div key={src.id} className="py-4 flex items-center justify-between">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">{src.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      {src.category}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono text-[11px]">Intervalo: {src.pollingInterval}m</span>
                  </div>

                  <p className="text-xs text-slate-500 font-mono truncate">{src.url}</p>

                  {src.licenseNotes && (
                    <p className="text-[11px] text-slate-400">
                      <strong>Licencia:</strong> {src.licenseNotes}
                    </p>
                  )}

                  {src.lastError && (
                    <div className="flex items-center space-x-1 text-[11px] text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Último error: {src.lastError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleTestSource(src.id)}
                    disabled={testingId === src.id}
                    className="flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 text-emerald-600" />
                    <span>{testingId === src.id ? 'Probando...' : 'Probar Conexión'}</span>
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
