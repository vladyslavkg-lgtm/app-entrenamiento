import React, { useState, useMemo } from 'react';
import { BodyMetric } from '../types/fitness';
import { TrendingDown, TrendingUp, Calendar, Scale, Activity } from 'lucide-react';

interface AnthropometricChartProps {
  metrics: BodyMetric[];
}

export const AnthropometricChart: React.FC<AnthropometricChartProps> = ({ metrics }) => {
  const [selectedMetric, setSelectedMetric] = useState<'weightKg' | 'chestCm' | 'waistCm' | 'bicepCm' | 'thighCm'>('weightKg');

  // Chronological order (oldest to newest for plotting)
  const sorted = useMemo(() => {
    return [...metrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [metrics]);

  const metricLabel = {
    weightKg: { name: 'Peso Corporal', unit: 'kg', color: '#10b981' },
    chestCm: { name: 'Pecho', unit: 'cm', color: '#06b6d4' },
    waistCm: { name: 'Cintura', unit: 'cm', color: '#f59e0b' },
    bicepCm: { name: 'Bíceps', unit: 'cm', color: '#a855f7' },
    thighCm: { name: 'Muslo / Cuádriceps', unit: 'cm', color: '#ec4899' },
  }[selectedMetric];

  // Data points with valid numbers for the selected metric
  const points = useMemo(() => {
    return sorted
      .filter((m) => typeof m[selectedMetric] === 'number' && (m[selectedMetric] as number) > 0)
      .map((m) => ({
        date: new Date(m.date),
        val: m[selectedMetric] as number,
      }));
  }, [sorted, selectedMetric]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const initial = points[0].val;
    const current = points[points.length - 1].val;
    const diff = current - initial;
    const min = Math.min(...points.map((p) => p.val));
    const max = Math.max(...points.map((p) => p.val));

    // Rate of change per week if multiple dates
    let weeklyRate = 0;
    if (points.length >= 2) {
      const days = (points[points.length - 1].date.getTime() - points[0].date.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 7) {
        weeklyRate = parseFloat(((diff / days) * 7).toFixed(2));
      }
    }

    return { initial, current, diff, min, max, weeklyRate };
  }, [points]);

  // SVG dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const chartData = useMemo(() => {
    if (points.length < 2) return null;
    const minVal = Math.min(...points.map((p) => p.val));
    const maxVal = Math.max(...points.map((p) => p.val));
    const valRange = maxVal === minVal ? 1 : maxVal - minVal;

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const coords = points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((p.val - minVal) / valRange) * plotHeight;
      return { x, y, date: p.date, val: p.val };
    });

    // Build SVG path string
    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Build SVG area fill path
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z`;

    return { coords, pathD, areaD, minVal, maxVal };
  }, [points, width, height, padding]);

  if (metrics.length === 0) {
    return (
      <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl text-center space-y-2">
        <Activity className="w-8 h-8 text-zinc-500 mx-auto" />
        <h4 className="text-sm font-bold text-white">Sin datos antropométricos</h4>
        <p className="text-xs text-zinc-400">
          Registra tus primeras medidas en el formulario para visualizar tu gráfica de progreso en el tiempo.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            Evolución Antropométrica y Composición
          </h3>
          <p className="text-xs text-zinc-400">
            Tendencia longitudinal de tu masa corporal y medidas clave
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap gap-1 bg-zinc-950/80 p-1 rounded-2xl border border-zinc-800">
          {[
            { id: 'weightKg', label: 'Peso' },
            { id: 'chestCm', label: 'Pecho' },
            { id: 'waistCm', label: 'Cintura' },
            { id: 'bicepCm', label: 'Bíceps' },
            { id: 'thighCm', label: 'Muslo' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedMetric === tab.id
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Inicial</span>
            <span className="font-mono text-base font-bold text-white">
              {stats.initial} {metricLabel.unit}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Actual</span>
            <span className="font-mono text-base font-bold text-white">
              {stats.current} {metricLabel.unit}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Variación Total</span>
            <span
              className={`font-mono text-base font-bold flex items-center gap-1 ${
                stats.diff > 0
                  ? 'text-emerald-400'
                  : stats.diff < 0
                  ? 'text-cyan-400'
                  : 'text-zinc-400'
              }`}
            >
              {stats.diff > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 inline" />
              ) : stats.diff < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 inline" />
              ) : null}
              {stats.diff > 0 ? `+${stats.diff.toFixed(1)}` : stats.diff.toFixed(1)} {metricLabel.unit}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Tasa Semanal</span>
            <span className="font-mono text-base font-bold text-purple-400">
              {stats.weeklyRate > 0 ? `+${stats.weeklyRate}` : stats.weeklyRate} {metricLabel.unit}/sem
            </span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      {chartData ? (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[500px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metricLabel.color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={metricLabel.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = padding.top + (height - padding.top - padding.bottom) * pct;
                const val = chartData.maxVal - pct * (chartData.maxVal - chartData.minVal);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#71717a"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={chartData.areaD} fill="url(#chartGradient)" />

              {/* Line */}
              <path
                d={chartData.pathD}
                fill="none"
                stroke={metricLabel.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Circles */}
              {chartData.coords.map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#090d16"
                    stroke={metricLabel.color}
                    strokeWidth="2.5"
                    className="hover:r-6 transition-all"
                  />
                  {/* Tooltip on hover */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="opacity-0 group-hover:opacity-100 transition duration-150"
                  >
                    {pt.val} {metricLabel.unit}
                  </text>
                  {/* X Axis Date */}
                  {(i === 0 || i === chartData.coords.length - 1 || i === Math.floor(chartData.coords.length / 2)) && (
                    <text
                      x={pt.x}
                      y={height - 12}
                      fill="#71717a"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {pt.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center text-xs text-zinc-400">
          Registra al menos 2 mediciones de {metricLabel.name} para dibujar la gráfica de evolución temporal.
        </div>
      )}
    </div>
  );
};
