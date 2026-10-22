import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
  FileEdit,
  CheckCircle,
  XCircle,
  Calendar,
  AlertTriangle,
  History,
  ShieldAlert,
  Send,
} from 'lucide-react';

const parseFlags = (flags: any): string[] => {
  if (Array.isArray(flags)) return flags;
  if (typeof flags === 'string') {
    try {
      const parsed = JSON.parse(flags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const EditorialRoomPage: React.FC = () => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [draftsRes, pagesRes] = await Promise.all([
        api.get('/drafts'),
        api.get('/pages'),
      ]);
      setDrafts(draftsRes.data);
      setPages(pagesRes.data);
      if (draftsRes.data.length > 0 && !selectedDraft) {
        selectDraft(draftsRes.data[0]);
      }
    } catch (e) {
      console.error('Error cargando sala editorial:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectDraft = (draft: any) => {
    setSelectedDraft(draft);
    setEditTitle(draft.title);
    setEditBody(draft.body);
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    setSaving(true);
    try {
      const res = await api.patch(`/drafts/${selectedDraft.id}`, {
        title: editTitle,
        body: editBody,
        reason: 'Ajuste editorial humano en redacción',
      });
      setSelectedDraft(res.data);
      await loadData();
      alert('Cambios guardados con éxito e historial de revisión registrado.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error guardando edición');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDraft) return;
    try {
      await api.post(`/drafts/${selectedDraft.id}/approve`);
      await loadData();
      alert('Borrador aprobado para publicación.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al aprobar');
    }
  };

  const handleReject = async () => {
    if (!selectedDraft) return;
    const reason = prompt('Ingrese el motivo de rechazo editorial:');
    if (!reason) return;
    try {
      await api.post(`/drafts/${selectedDraft.id}/reject`, { reason });
      await loadData();
      alert('Borrador rechazado.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al rechazar');
    }
  };

  const handleSchedule = async () => {
    if (!selectedDraft || !selectedPageId || !scheduledAt) {
      alert('Seleccione una página y una fecha/hora válida para programar.');
      return;
    }
    try {
      await api.post(`/drafts/${selectedDraft.id}/schedule`, {
        pageId: selectedPageId,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      await loadData();
      alert('Publicación programada exitosamente en la cola de Meta.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error programando publicación');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sala Editorial y Moderación</h1>
        <p className="text-sm text-slate-500">
          Revisión humana, verificación de citas, control de banderas de riesgo e historial inmutable
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de borradores (columna izquierda) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Borradores ({drafts.length})
          </h2>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {drafts.map((d) => (
              <div
                key={d.id}
                onClick={() => selectDraft(d)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  selectedDraft?.id === d.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{d.status}</span>
                  <span className="text-[10px] text-slate-400">v{d.version}</span>
                </div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  {d.title}
                </h4>
                <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>Fuente: {d.sourceAttribution}</span>
                  {parseFlags(d.riskFlags).length > 0 && (
                    <span className="text-amber-600 font-semibold">• {parseFlags(d.riskFlags).length} Alerta(s)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor y panel de decisión (columna derecha) */}
        {selectedDraft ? (
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            {/* Metadatos y Banderas de Riesgo */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Estado: {selectedDraft.status}
                </span>
                <span className="text-xs text-slate-500">
                  Versión actual: <strong>v{selectedDraft.version}</strong>
                </span>
              </div>

              {parseFlags(selectedDraft.riskFlags).length > 0 ? (
                <div className="flex items-center space-x-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Banderas: {parseFlags(selectedDraft.riskFlags).join(', ')} (Revisión Obligatoria)</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                  <CheckCircle className="w-4 h-4" />
                  <span>Sin banderas críticas de riesgo</span>
                </div>
              )}
            </div>

            {/* Campos de edición */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Titular Original (Facebook Headline)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Cuerpo de la Publicación (Resumen y Contexto Objetivo)
                </label>
                <textarea
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Atribución de Fuente:</span>
                  <p className="mt-0.5 text-slate-800 dark:text-slate-200">{selectedDraft.sourceAttribution}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">URL Canónica de Origen:</span>
                  <a
                    href={selectedDraft.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 text-blue-600 truncate block hover:underline"
                  >
                    {selectedDraft.sourceUrl}
                  </a>
                </div>
              </div>
            </div>

            {/* Botón de Guardar Edición */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>{saving ? 'Guardando...' : 'Guardar Edición (Crear Revisión)'}</span>
              </button>
            </div>

            {/* Acciones Editoriales: Aprobar / Rechazar / Programar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleApprove}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Aprobar Borrador</span>
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>

              {/* Sección de Programación */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Programar en Página de Facebook Oficial</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Seleccione una Página...</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.pageName} ({p.publishingEnabled ? 'Publicación Activa' : 'Pausada'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />

                  <button
                    onClick={handleSchedule}
                    className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar y Encolar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-slate-400">
            Seleccione un borrador de la lista para editar o moderar.
          </div>
        )}
      </div>
    </div>
  );
};
