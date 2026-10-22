import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Terminal, Cpu, Check } from 'lucide-react';

export const AiTemplatesPage: React.FC = () => {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Estudio de Inteligencia Artificial y Prompts</h1>
        <p className="text-sm text-slate-500">
          Configuración del motor de redacción, validación de esquemas Zod y prohibición de alucinaciones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Proveedor y Parámetros del LLM</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Proveedor de IA Activo
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                <option value="gemini">Google Gemini 1.5 Flash</option>
                <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                <option value="mock">Adaptador Determinado Mock (Sin costo / Testing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Temperatura Editorial: {temperature}</span>
                <span className="text-slate-400 font-normal">Baja temperatura = Cero alucinaciones</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.7"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Directiva Periodística Fija en Backend</span>
            </div>
            <p>
              El prompt del sistema fuerza la atribución de fuente, prohíbe inventar cifras, fechas o nombres, y obliga a devolver un objeto JSON estricto validado por <code>EditorialOutputSchema</code>.
            </p>
          </div>
        </div>

        {/* Estructura del JSON Schema */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Contrato de Salida Zod (Esquema Validado)</span>
          </h2>

          <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "headline": "string (10-150 caracteres)",
  "summary": "string (50-1000 caracteres)",
  "source_attribution": "string (nombre del medio)",
  "source_url": "url (enlace canónico de origen)",
  "verification_notes": "string (resumen de cotejo)",
  "uncertainties": "string | null (aspectos en desarrollo)",
  "hashtags": ["#NoticiasColombia", "#Actualidad"],
  "risk_flags": [
    "HEALTH" | "EMERGENCY" | "CRIME" | 
    "ELECTIONS_POLITICS" | "VIOLENCE" | ...
  ]
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
