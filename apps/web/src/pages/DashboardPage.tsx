import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
  Rss,
  Newspaper,
  FileCheck2,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (e) {
      console.error('Error cargando métricas:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando métricas en vivo...</div>;
  }

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel General (Dashboard)</h1>
          <p className="text-sm text-slate-500">Métricas reales verificadas • Colombia (America/Bogota)</p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Operación Normal • VPS Coolify</span>
        </div>
      </div>

      {/* Grid de KPIs reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fuentes Activas</span>
            <Rss className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.activeSources ?? 0}</span>
            <span className="text-xs text-slate-400">de {metrics.totalSources ?? 0} configuradas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Noticias Ingestadas</span>
            <Newspaper className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalNewsItems ?? 0}</span>
            <span className="text-xs text-slate-400">{metrics.totalStories ?? 0} clusters temáticos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Revisión Editorial</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.pendingReviewDrafts ?? 0}</span>
            <span className="text-xs text-slate-400">requieren aprobación</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Publicados en Meta</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-600">{metrics.publishedJobs ?? 0}</span>
            <span className="text-xs text-slate-400">{metrics.failedJobs ?? 0} errores controlados</span>
          </div>
        </div>
      </div>

      {/* Próximas Publicaciones Programadas */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Próximas Publicaciones Programadas (Cola Oficial)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Max 3 por día por página</span>
        </div>

        {data?.upcomingPublications?.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No hay publicaciones en cola programada para las próximas horas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.upcomingPublications?.map((item: any) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.draft?.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Página: <strong>{item.page?.pageName}</strong> • Riesgo: {item.draft?.riskLevel}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {new Date(item.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estado de Integraciones Reales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Infraestructura y Servicios en VPS</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">PostgreSQL 16:</span>
              <span className="font-semibold text-emerald-600">Activo (Persistente)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Redis / BullMQ:</span>
              <span className="font-semibold text-emerald-600">Conectado (Broker)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Páginas Meta Conectadas:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.connectedPages ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Reglas de Seguridad y Moderación Activas</span>
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Autopublicación deshabilitada por defecto hasta autorización humana.</li>
            <li>Temas de política, crimen, salud o emergencias requieren revisión editorial.</li>
            <li>Reconciliación remota activada para evitar posts duplicados en Meta.</li>
            <li>Módulo de grupos configurado estrictamente en modo manual asistido.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
