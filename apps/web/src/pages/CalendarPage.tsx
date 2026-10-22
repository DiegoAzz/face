import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Calendar, Clock, AlertCircle, CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [publications, setPublications] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      const [pubRes, pagesRes] = await Promise.all([
        api.get('/publications'),
        api.get('/pages'),
      ]);
      setPublications(pubRes.data);
      setPages(pagesRes.data);
    } catch (e) {
      console.error('Error cargando calendario:', e);
    } finally {
      setLoading(false);
    }
  };

  const scheduledList = publications.filter((p) => p.status === 'SCHEDULED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendario de Publicaciones</h1>
          <p className="text-sm text-slate-500">
            Zona horaria: <strong>America/Bogota</strong> • Cuota: Máximo 3 publicaciones/día por página
          </p>
        </div>
      </div>

      {/* Reglas de programación */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-blue-800 dark:text-blue-300">
          <Clock className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <span>
            Franjas sugeridas por defecto: <strong>08:00</strong> (Matutina), <strong>12:00</strong> (Mediodía), <strong>18:00</strong> (Vespertina).
            Los trabajos se encolan con clave de idempotencia única para prevenir duplicados ante reintentos de red.
          </span>
        </div>
      </div>

      {/* Lista de envíos programados */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Envíos Programados Pendientes ({scheduledList.length})</span>
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando calendario...</div>
        ) : scheduledList.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No hay publicaciones en la cola programada. Puedes programar un borrador desde la Sala Editorial.
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledList.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-blue-600">Página: {job.page?.pageName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono">
                      Hora: {new Date(job.scheduledAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {job.draft?.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {job.draft?.body}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md font-medium">
                    Programado
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
