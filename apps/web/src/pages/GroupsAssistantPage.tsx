import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Users, Copy, ExternalLink, Check, Plus, AlertCircle, Bookmark } from 'lucide-react';

export const GroupsAssistantPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal para agregar grupo
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsRes, draftsRes] = await Promise.all([
        api.get('/groups'),
        api.get('/drafts?status=APPROVED'),
      ]);
      setGroups(groupsRes.data);
      setDrafts(draftsRes.data);
      if (draftsRes.data.length > 0) {
        setSelectedDraft(draftsRes.data[0]);
      }
    } catch (e) {
      console.error('Error cargando grupos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!selectedDraft) return;
    const textToCopy = `${selectedDraft.title}\n\n${selectedDraft.body}\n\nFuente: ${selectedDraft.sourceAttribution}\nEnlace: ${selectedDraft.sourceUrl}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups', {
        name: newGroupName,
        url: newGroupUrl,
        rulesNotes: newGroupRules,
      });
      setShowAddGroup(false);
      setNewGroupName('');
      setNewGroupUrl('');
      setNewGroupRules('');
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error guardando marcador de grupo');
    }
  };

  const handleMarkShared = async (groupId: string) => {
    if (!selectedDraft) {
      alert('Seleccione primero una noticia para registrar el envío.');
      return;
    }
    const notes = prompt('Notas opcionales sobre el compartido en este grupo:');
    try {
      await api.post(`/groups/${groupId}/mark-manual-share`, {
        groupId,
        draftId: selectedDraft.id,
        notes: notes || 'Compartido manualmente por el operador',
      });
      await loadData();
      alert('Compartición manual registrada en la auditoría con éxito.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error registrando compartición manual');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bandeja de Asistencia para Grupos</h1>
          <p className="text-sm text-slate-500">
            Preparación de contenido, checklist de reglas y registro de compartición manual oficial
          </p>
        </div>

        <button
          onClick={() => setShowAddGroup(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Marcador de Grupo</span>
        </button>
      </div>

      {/* Advertencia estricta de cumplimiento de políticas Meta */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-semibold">Política de Publicación Manual en Grupos (Cumplimiento Meta 2024–2026):</span>
          <p className="mt-0.5">
            Meta retiró la Groups API y el permiso <code>publish_to_groups</code>. Esta plataforma no realiza llamadas automáticas a grupos, no inyecta cookies ni usa bots no autorizados. El operador revisa las reglas del grupo, copia el texto preparado con el botón, abre el grupo en Facebook y marca como compartido manualmente.
          </p>
        </div>
      </div>

      {/* Modal para agregar marcador de grupo */}
      {showAddGroup && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-500 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nuevo Marcador de Grupo de Facebook</h3>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Nombre del Grupo (ej. Noticias y Comunidad Bogotá)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <input
              type="url"
              required
              placeholder="URL oficial del grupo (https://www.facebook.com/groups/...)"
              value={newGroupUrl}
              onChange={(e) => setNewGroupUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              placeholder="Reglas o notas del grupo (ej. Solo noticias verificadas, no spam, máximo 1 post al día)"
              value={newGroupRules}
              onChange={(e) => setNewGroupRules(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
              >
                Guardar Grupo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preparador de contenido para copiar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            1. Seleccionar Noticia Aprobada
          </h2>

          <select
            value={selectedDraft?.id || ''}
            onChange={(e) => {
              const d = drafts.find((item) => item.id === e.target.value);
              setSelectedDraft(d || null);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            {drafts.length === 0 && <option>No hay noticias aprobadas</option>}
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>

          {selectedDraft && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg space-y-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Texto formateado para grupo:</span>
              <p className="font-bold text-slate-900 dark:text-white">{selectedDraft.title}</p>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedDraft.body}</p>
              <p className="text-slate-500 font-mono text-[11px]">Fuente: {selectedDraft.sourceAttribution}</p>

              <button
                onClick={handleCopyText}
                className="w-full mt-2 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Texto Preparado'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Directorio de grupos para compartir */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            2. Grupos de Destino ({groups.length})
          </h2>

          {groups.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed rounded-lg">
              No tienes grupos registrados. Haz clic en <strong>"Agregar Marcador de Grupo"</strong> para comenzar.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Bookmark className="w-4 h-4 text-blue-600" />
                      <span>{group.name}</span>
                    </h3>

                    <div className="flex items-center space-x-2">
                      <a
                        href={group.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-md hover:underline font-medium"
                      >
                        <span>Abrir Grupo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => handleMarkShared(group.id)}
                        className="flex items-center space-x-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md font-medium transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Marcar Compartido</span>
                      </button>
                    </div>
                  </div>

                  {group.rulesNotes && (
                    <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                      <strong>Reglas:</strong> {group.rulesNotes}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-400">
                    Historial:{' '}
                    {group.manualGroupShares?.length > 0
                      ? `Último envío el ${new Date(group.manualGroupShares[0].sharedAt).toLocaleDateString('es-CO')} por ${group.manualGroupShares[0].user?.email}`
                      : 'Sin envíos previos registrados'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
