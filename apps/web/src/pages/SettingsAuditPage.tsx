import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Clock, Lock } from 'lucide-react';

export const SettingsAuditPage: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    try {
      const res = await api.get('/audit');
      setAuditLogs(res.data);
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración del Sistema y Auditoría</h1>
        <p className="text-sm text-slate-500">
          Trazabilidad inmutable de decisiones, control RBAC y políticas organizacionales
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Organización Activa</span>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-slate-500">Nombre: <strong className="text-slate-800 dark:text-slate-200">{user?.organizationName}</strong></p>
            <p className="text-slate-500">Zona horaria: <strong className="text-slate-800 dark:text-slate-200">{user?.timezone || 'America/Bogota'}</strong></p>
            <p className="text-slate-500">Rol asignado: <strong className="text-blue-600">{user?.role}</strong></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Cifrado y Seguridad</span>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-slate-500">Tokens de Meta: <strong className="text-emerald-600">AES-256-GCM</strong></p>
            <p className="text-slate-500">Contraseñas: <strong className="text-emerald-600">Bcrypt / Salt 12</strong></p>
            <p className="text-slate-500">Filtro SSRF: <strong className="text-emerald-600">RFC 1918 Bloqueado</strong></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Políticas de Publicación</span>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-slate-500">Autopublicación: <strong className="text-amber-600">DESHABILITADA (Por Defecto)</strong></p>
            <p className="text-slate-500">Revisión humana: <strong className="text-emerald-600">OBLIGATORIA para Riesgos</strong></p>
            <p className="text-slate-500">Límite diario: <strong className="text-slate-800 dark:text-slate-200">3 posts/página</strong></p>
          </div>
        </div>
      </div>

      {/* Tabla de Logs de Auditoría */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Registro de Auditoría Inmutable ({auditLogs.length} eventos recientes)
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando registros...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Actor / Usuario</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Tipo de Entidad</th>
                  <th className="px-4 py-3">Detalle / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                      {log.actor?.email || 'Sistema Automático'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      {log.targetType}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                      {JSON.stringify(log.metadataRedacted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
