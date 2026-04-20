import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Leaf, Box, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, BarChart3,
  LineChart as LineChartIcon, LayoutDashboard, TrendingUp,
  Calendar, Moon, Sun, Tag, Search, CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { getFilters, getTimeSeriesData, getSummaryStats, getDateRange, getAllCategories, getBenchmarks } from '../services/api';

// ─── colour palette ────────────────────────────────────────────────────────────
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6',
  '#f43f5e', '#d946ef', '#0ea5e9', '#eab308', '#2dd4bf', '#fb923c',
];

const ALL_STATIC_CATEGORIES = [
  // PLANT RELATED
  { name: 'Drogestof onderzoek plant', type: 'plant' },
  { name: 'Drogestof onderzoek plant compleet', type: 'plant' },
  { name: 'Vruchtanalyse Plus', type: 'plant' },
  { name: 'Brix-waarde bepaling', type: 'plant' },

  // SOIL RELATED
  { name: 'N-min 0-90 cm', type: 'soil' },
  { name: 'pH + O.S.', type: 'soil' },
  { name: 'Verticilium onderzoek in grond', type: 'soil' },
  { name: 'Beschikbare voorraad N + K', type: 'soil' },
  { name: 'Stengelaaltjes', type: 'soil' },
  { name: 'Longidorus en Xiphinema', type: 'soil' },
  { name: 'N-Mineraal Totaal', type: 'soil' },
  { name: 'Bemesting uitgebreid 0-90 cm', type: 'soil' },
  { name: 'pH', type: 'soil' },
  { name: 'Aaltjes + 28 dgn incubatie', type: 'soil' },

  // MIXED / BOTH
  { name: 'Bemesting Uitgebreid', type: 'mixed' },
  { name: 'Aaltjes + 14 dgn Incubatie', type: 'mixed' },
  { name: 'In de teelt bemesting - BASIS', type: 'mixed' },
  { name: 'Aaltjes + 14 dgn incubatie + Cystenonderzoek', type: 'mixed' },
  { name: 'In de teelt bemesting - UITGEBREID', type: 'mixed' },
  { name: 'Bemesting Basis', type: 'mixed' },
  { name: 'Tussentijdse rapportage Aaltjes', type: 'mixed' },
  { name: 'Bemesting Uitgebreid + Fosfaatdifferentiatie', type: 'mixed' },
  { name: 'Aaltjes - Zonder incubatie', type: 'mixed' },
  { name: 'In de teelt bemesting - CHECKMONSTER', type: 'mixed' },
  { name: 'N-mineraal', type: 'mixed' },
  { name: 'Zware Metalen', type: 'mixed' },
  { name: 'Wateronderzoek', type: 'mixed' },
  { name: 'Plantsap monsters', type: 'mixed' },
  { name: 'Fosfaatdifferentiatie', type: 'mixed' },
  { name: 'Derogatie (veehouderij)', type: 'mixed' },
  { name: 'Mestonderzoek (vast/vloeibaar)', type: 'mixed' },
  { name: 'Scheurmonster grasland', type: 'mixed' },
  { name: 'Bemesting uitgebreid + Klei/Zand/Silt verhouding', type: 'mixed' },
  { name: 'Vrijwillig AM onderzoek', type: 'mixed' },
  { name: 'Bietencysten onderzoek grond', type: 'mixed' },
  { name: 'Bemesting basis + EC', type: 'mixed' },
  { name: 'Fosfaatdifferentiatie + pH', type: 'mixed' },
  { name: 'E-coli wateronderzoek', type: 'mixed' },
  { name: 'Aaltjes zonder incubatie + Cysten', type: 'mixed' }
];

const MEASURE_LABELS = {
  'Opbrengst vers': 'Fresh Yield', 'Opbrengst droge stof': 'Dry Matter Yield',
  'Aluminium': 'Al', 'N-leverend vermogen': 'N-Rated Power',
  'Totaal-Stikstof': 'Total Nitrogen', 'Fosfaat': 'P₂O₅', 'Chloride': 'Cl',
  'Nitraatstikstof': 'Nitrate Nitrogen', 'Ammoniumstikstof': 'Ammonium Nitrogen',
  'Seleen': 'Selenium',
};
function measureLabel(n) { const e = MEASURE_LABELS[n]; return e ? `${n} (${e})` : n; }

// ─── date helpers ──────────────────────────────────────────────────────────────
function parseDatePart(tick) {
  if (!tick || typeof tick === 'number') return '';
  const s = String(tick), m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.split(' ')[0];
}
function formatTooltipLabel(tick) {
  if (!tick || typeof tick === 'number') return '';
  const s = String(tick), dp = parseDatePart(s);
  const bm = s.match(/\(Batch ([^)]+)\)/), batch = bm ? `  ·  Batch ${bm[1]}` : '';
  try {
    const d = new Date(dp), tp = s.split(' ')[1] || '';
    return `Sampled: ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${tp}${batch}`;
  } catch { return s; }
}

function LayersSVG({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

// Data processing helpers
function applyWindowFilter(data, selectedWindow, availableWindows) {
  if (selectedWindow === 'All') return data;
  const win = availableWindows.find(w => w.value === selectedWindow); if (!win) return data;
  return data.filter(d => {
    const m = String(d.date).match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})|(\d{4}-\d{2}-\d{2})/);
    if (!m) return true;
    const dt = new Date(m[0]); return dt >= win.firstSample && dt <= win.lastSample;
  });
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const ds = formatTooltipLabel(d.date) + (d.ageDays != null ? `  ·  Day ${d.ageDays}` : '');
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.14)] p-5 min-w-[280px]">
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px]">{ds}</h4>
        {d.Crop && d.SoilType && <p className="text-[11px] font-black text-slate-400 mt-1.5 uppercase tracking-wider">{d.Crop} · {d.SoilType}</p>}
        {d.CropStartDate && d.CropEndDate && (
          <div className="mt-1 flex items-center gap-1.5 font-bold text-[11px] text-slate-500 flex-wrap">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Planted: {d.CropStartDate}</span>
            <span className="text-slate-300">→</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">End: {d.CropEndDate}</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-6 text-[13px]">
            <div className="flex items-center gap-2 font-bold" style={{ color: e.color }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />{e.name}
            </div>
            <div className="font-black text-slate-700 dark:text-slate-300">
              {e.value != null ? Number(e.value).toFixed(2) : '—'} <span className="text-[11px] text-slate-400 font-semibold">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Category Component Scope
// ══════════════════════════════════════════════════════════════════════════════
function CategoryBlock({ categoryName, categoryType = 'mixed', categoryData = [], categorySummary = [], benchmarks = {}, plotType, selectedWindow, availableWindows, activeTab, isDark }) {
  const [selectedMeasures, setSelectedMeasures] = useState(new Set());
  const [pieViewMode, setPieViewMode] = useState('mean');
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedCompositionDate, setSelectedCompositionDate] = useState('');

  const sortedSummaryData = useMemo(() => [...categorySummary].sort((a, b) => b.latest - a.latest).filter(s => s.max > 0), [categorySummary]);

  // Auto-select top parameters when category loads
  useEffect(() => {
    if (selectedMeasures.size === 0 && sortedSummaryData.length > 0) {
      setSelectedMeasures(new Set(sortedSummaryData.slice(0, 6).map(s => s.measure)));
    }
  }, [sortedSummaryData, selectedMeasures.size]);

  const isSoilCategory = categoryType === 'soil';

  const filteredChartData = useMemo(() => {
    let res = applyWindowFilter(categoryData, selectedWindow, availableWindows).map(d => ({ ...d }));
    let minDt = Infinity;
    res.forEach(d => {
      const dp = parseDatePart(d.date);
      if (dp) {
        const ms = new Date(dp).getTime();
        if (ms && ms < minDt) minDt = ms;
      }
    });
    if (minDt !== Infinity) {
      res.forEach(row => {
        const dp = parseDatePart(row.date);
        if (dp) {
          const ms = new Date(dp).getTime();
          row.ageDays = Math.floor((ms - minDt) / (1000 * 60 * 60 * 24));
          try {
            row.dateLabel = new Date(dp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
          } catch { row.dateLabel = dp; }
        } else {
          row.ageDays = 0;
          row.dateLabel = '';
        }
      });
      if (isSoilCategory) {
        res.sort((a, b) => new Date(parseDatePart(a.date)) - new Date(parseDatePart(b.date)));
      } else {
        res.sort((a, b) => a.ageDays - b.ageDays);
      }
    }
    return res;
  }, [categoryData, selectedWindow, availableWindows, categoryType]);

  const visibleSummaryData = useMemo(() => {
    return sortedSummaryData.map((s, i) => ({
      ...s,
      color: COLORS[i % COLORS.length]
    })).filter(s => selectedMeasures.has(s.measure));
  }, [sortedSummaryData, selectedMeasures]);

  const toggleMeasure = m => { const n = new Set(selectedMeasures); n.has(m) ? n.delete(m) : n.add(m); setSelectedMeasures(n); };
  const toggleAll = () => { setSelectedMeasures(selectedMeasures.size === sortedSummaryData.length ? new Set() : new Set(sortedSummaryData.map(s => s.measure))); };

  function buildMeasuresByUnit(sd) {
    const g = {};
    sd.forEach((s) => {
      const u = (s.unit || '').trim();
      const key = u === '' || u.toLowerCase() === 'unknown' ? 'Unit' : u;
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    return g;
  }
  const measuresByUnit = useMemo(() => buildMeasuresByUnit(visibleSummaryData), [visibleSummaryData]);

  const presentAge = useMemo(() => {
    if (!filteredChartData.length) return null;
    // Soil: never show an age badge — soil samples are not tied to a crop lifecycle.
    if (categoryType === 'soil') return null;
    // Mixed: use CropStartDate / CropEndDate from plant-side rows only.
    // Soil-only rows in a mixed dataset don't carry these fields, so they are
    // automatically excluded — result is purely the crop cultivation span.
    if (categoryType === 'mixed') {
      const starts = filteredChartData
        .map(d => d.CropStartDate ? new Date(d.CropStartDate).getTime() : null)
        .filter(t => t != null && !isNaN(t));
      const ends = filteredChartData
        .map(d => d.CropEndDate ? new Date(d.CropEndDate).getTime() : null)
        .filter(t => t != null && !isNaN(t));
      if (starts.length && ends.length) {
        const days = Math.floor((Math.max(...ends) - Math.min(...starts)) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : null;
      }
      // Fallback: span between first and last actual sample dates (no crop metadata)
      const ts = filteredChartData
        .map(d => { const dp = parseDatePart(d.date); return dp ? new Date(dp).getTime() : null; })
        .filter(t => t != null && !isNaN(t));
      if (ts.length < 2) return null;
      const days2 = Math.floor((Math.max(...ts) - Math.min(...ts)) / (1000 * 60 * 60 * 24));
      return days2 > 0 ? days2 : null;
    }
    // Plant: max ageDays across filtered data (days from first sample in window).
    return Math.max(...filteredChartData.map(d => d.ageDays || 0));
  }, [filteredChartData, categoryType]);

  // Plot Renderer
  function renderPlot(unit, measures, data) {
    let CC = LineChart;
    if (plotType === 'bar') CC = BarChart;
    if (plotType === 'area') CC = AreaChart;
    const gc = isDark ? '#334155' : '#E2E8F0', ac = isDark ? '#94a3b8' : '#475569', alc = isDark ? '#475569' : '#cbd5e1';
    const fmtTick = v => { const n = Number(v); return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`; };

    const xKey = isSoilCategory ? 'dateLabel' : 'ageDays';
    const xLabel = isSoilCategory ? 'Sample Date' : 'Crop Age (Days from Start)';
    const xTickFmt = isSoilCategory ? v => v : t => `Day ${t != null ? t : ''}`;

    const typePillStyle = categoryType === 'plant'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : categoryType === 'soil'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-indigo-100 text-indigo-700 border-indigo-200';

    const series = measures.map(m => {
      if (plotType === 'bar') return <Bar key={m.measure} dataKey={m.measure} fill={m.color} yAxisId="left" radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={false} />;
      if (plotType === 'area') return <Area key={m.measure} type="monotone" dataKey={m.measure} yAxisId="left" stroke={m.color} fill={m.color} fillOpacity={0.12} strokeWidth={2.5} connectNulls isAnimationActive={false} dot={{ r: 4, fill: m.color, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: m.color, stroke: '#fff', strokeWidth: 2 }} />;
      return <Line key={m.measure} type="monotone" dataKey={m.measure} yAxisId="left" stroke={m.color} strokeWidth={2.5} connectNulls isAnimationActive={false} dot={{ r: 4, fill: m.color, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: m.color, stroke: '#fff', strokeWidth: 2 }} />;
    });

    return (
      <div key={unit} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 mt-6 overflow-hidden shadow-sm">
        {/* ── Chart Header ── */}
        <div className="px-5 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`shrink-0 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${typePillStyle}`}>
              {categoryName}
            </span>
            <span className="text-[15px] font-black text-slate-700 dark:text-slate-200">
              Unit: <span className="text-indigo-600 dark:text-indigo-400">{unit}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
              · X-Axis: <span className="text-slate-600 dark:text-slate-400">{xLabel}</span>
            </span>
          </div>
        </div>
        {/* ── Chart Body ── */}
        <div className="h-[420px] px-2 pt-3 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <CC data={data} margin={{ top: 10, right: 20, left: -10, bottom: isSoilCategory ? 45 : 20 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gc} />
              <XAxis dataKey={xKey}
                tickFormatter={xTickFmt}
                tick={{ fontSize: 11, fill: ac, fontWeight: 700 }} tickMargin={10} axisLine={{ stroke: alc, strokeWidth: 1.5 }} tickLine={false}
                interval="preserveStartEnd" textAnchor={isSoilCategory ? 'end' : 'middle'} angle={isSoilCategory ? -30 : 0} height={isSoilCategory ? 60 : 45} />
              <YAxis yAxisId="left" orientation="left"
                tick={{ fontSize: 11, fill: ac, fontWeight: 700 }} axisLine={false} tickLine={false} width={52}
                domain={['auto', 'auto']} tickFormatter={fmtTick} />
              <Tooltip cursor={{ strokeDasharray: '4 4', strokeWidth: 1.5, stroke: alc }} content={<CustomTooltip unit={unit} />} />
              <Legend wrapperStyle={{ paddingTop: 8, paddingBottom: 4 }} iconType="circle" iconSize={10} verticalAlign="top"
                formatter={v => <span style={{ fontWeight: 700, fontSize: 12, color: isDark ? '#94a3b8' : '#334155' }}>{measureLabel(v)}</span>} />
              {series}
            </CC>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const stickyDotColor = categoryType === 'plant' ? 'bg-emerald-500' : categoryType === 'soil' ? 'bg-amber-500' : 'bg-indigo-500';
  const stickyPillStyle = categoryType === 'plant'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : categoryType === 'soil'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 shadow-md rounded-3xl mb-8">

      {/* ── STICKY CATEGORY BANNER ── */}
      <div className="sticky top-[93px] z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 md:px-8 py-3 flex items-center gap-3 shadow-sm rounded-t-3xl overflow-hidden">
        <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${stickyDotColor}`} />
        <span className="text-xl font-black text-slate-800 dark:text-slate-100 truncate flex-1 tracking-tight">{categoryName}</span>
        
        {presentAge !== null && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 shrink-0 shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Crop Age: {presentAge} Days
            </span>
          </div>
        )}

        <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${stickyPillStyle}`}>
          {categoryType === 'plant' ? 'Plant' : categoryType === 'soil' ? 'Soil' : 'Mixed'} Analysis
        </span>
      </div>

      <div className="px-6 md:px-8 pt-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 overflow-hidden dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Filters / Parameters
            </span>
            <button onClick={toggleAll} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">
              {selectedMeasures.size === sortedSummaryData.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          {sortedSummaryData.length === 0 ? (
            <p className="text-slate-400 text-sm font-bold">No parameter data found for this category.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {sortedSummaryData.map(stat => {
                const checked = selectedMeasures.has(stat.measure);
                return (
                  <label key={stat.measure} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-all cursor-pointer ${checked ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleMeasure(stat.measure)} />
                    {checked ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className="text-[13px] font-bold">{measureLabel(stat.measure)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8">
        {selectedMeasures.size === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl">
            <LineChartIcon className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Select parameters to visualise data</p>
          </div>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            {activeTab === 'summary' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {visibleSummaryData.map(stat => {
                  const up = stat.latest >= stat.average;
                  return (
                    <div key={stat.measure} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300">
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 line-clamp-3 leading-snug">{measureLabel(stat.measure)}</h3>
                        <div className={`p-2 rounded-xl shrink-0 ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {up ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                      </div>
                      <span className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none">{stat.latest.toFixed(1)}</span>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1.5 block pb-4 border-b border-slate-100">{stat.unit}</span>
                      <div className="mt-4 flex justify-between text-xs font-bold text-slate-500">
                        <div><span className="text-[10px] text-slate-400 uppercase block mb-0.5">Mean</span><span className="text-slate-800 dark:text-slate-200 text-base">{stat.average.toFixed(1)}</span></div>
                        <div className="text-right"><span className="text-[10px] text-slate-400 uppercase block mb-0.5">Peak</span><span className="text-slate-800 dark:text-slate-200 text-base">{stat.max.toFixed(1)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TRENDS */}
            {activeTab === 'trends' && (
              <div className="space-y-8">
                {Object.keys(measuresByUnit).map(unit => renderPlot(unit, measuresByUnit[unit], filteredChartData))}
              </div>
            )}

            {/* COMPOSITIONS */}
            {activeTab === 'composition' && (() => {
              const allEntries = filteredChartData.map(row => {
                const raw = String(row.date);
                const dm = raw.match(/(\d{4}-\d{2}-\d{2})/), tm = raw.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/), bm = raw.match(/\(Batch ([^)]+)\)/);
                const dateStr = dm ? new Date(dm[1]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : raw;
                const batchId = bm ? bm[1] : 'Unknown';
                return { value: row.date, label: `Batch ${batchId}  ·  ${dateStr}${tm ? '  ' + tm[1] : ''}`, batchId };
              });
              const searchTerm = batchSearch.trim().toLowerCase();
              const filteredEntries = searchTerm ? allEntries.filter(e => e.batchId.toLowerCase().includes(searchTerm)) : allEntries;
              const validVals = new Set(filteredEntries.map(e => e.value));
              const activeDate = validVals.has(selectedCompositionDate) ? selectedCompositionDate : (filteredEntries[0]?.value ?? '');
              const selectedRow = filteredChartData.find(r => r.date === activeDate) ?? null;
              const sampleAge = selectedRow?.ageDays ?? -1;
              const measureCols = visibleSummaryData.map((s, i) => ({ key: s.measure, color: COLORS[i % COLORS.length] }));

              // MODIFIED: Breakdown logic follows pieViewMode and handles benchmarking
              let breakdown = [];
              if (pieViewMode === 'mean') {
                breakdown = visibleSummaryData.map((s, i) => ({
                  key: s.measure,
                  color: COLORS[i % COLORS.length],
                  value: s.average,
                  historical: s.average,
                  median: s.median
                })).filter(m => m.value > 0);
              } else {
                breakdown = measureCols.map(m => {
                  const val = selectedRow && selectedRow[m.key] != null ? selectedRow[m.key] : null;
                  const summary = visibleSummaryData.find(s => s.measure === m.key);

                  // Age-relative benchmark
                  let benchmarkAtAge = null;
                  if (benchmarks && benchmarks[categoryName] && benchmarks[categoryName][sampleAge]) {
                    benchmarkAtAge = benchmarks[categoryName][sampleAge][m.key];
                  }

                  return {
                    ...m,
                    value: val,
                    historical: benchmarkAtAge ?? summary?.average,
                    isAgeRelativeFlag: !!benchmarkAtAge,
                    median: summary?.median
                  };
                }).filter(m => m.value != null);
              }

              const total = breakdown.reduce((s, m) => s + m.value, 0);

              // Group breakdown items by unit for the Pie charts
              const activePieDataGrouped = {};
              breakdown.forEach(item => {
                const summaryMatch = visibleSummaryData.find(s => s.measure === item.key);
                const unitLabel = (summaryMatch?.unit || 'Units').trim().toUpperCase();
                if (!activePieDataGrouped[unitLabel]) activePieDataGrouped[unitLabel] = [];
                activePieDataGrouped[unitLabel].push({
                  name: item.key,
                  value: item.value,
                  fill: item.color
                });
              });
              // Sort slices by value descending
              Object.values(activePieDataGrouped).forEach(arr => arr.sort((a, b) => b.value - a.value));

              return (
                <div>
                  {Object.keys(activePieDataGrouped).map(unit => {
                    const slices = activePieDataGrouped[unit], pieTotal = slices.reduce((s, e) => s + e.value, 0), pieMax = slices[0]?.value ?? 1;
                    return (
                      <div key={unit} className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start mt-6">
                        {/* PIE */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200">
                          <div className="flex justify-between items-center w-full mb-6 pb-4 border-b border-slate-200">
                            <div>
                              <h4 className="text-xl font-black text-slate-800 dark:text-slate-200">{pieViewMode === 'mean' ? 'Mean Composition (All Time)' : 'Latest Sample'}</h4>
                              <span className="text-xs font-black text-indigo-500 bg-indigo-100 px-3 py-1 rounded-full mt-2 inline-block uppercase tracking-widest">{unit}</span>
                            </div>
                            <select value={pieViewMode} onChange={e => setPieViewMode(e.target.value)} className="bg-white border border-slate-200 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700">
                              <option value="mean">Mean (All Time)</option><option value="latest">Latest Sample</option>
                            </select>
                          </div>
                          {slices.length === 0 ? (
                            <div className="py-24 text-center text-slate-400 font-bold uppercase text-xs">No values representable in pie.</div>
                          ) : (
                            <>
                              <div className="w-full h-[360px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Tooltip formatter={v => `${Number(v).toFixed(2)} ${unit}`} contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px' }} itemStyle={{ fontWeight: 700 }} />
                                    <Pie data={slices} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none">
                                      {slices.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>

                              {/* custom scrollable legend */}
                              <div className="mt-4 max-h-48 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 custom-scrollbar">
                                {slices.map((e, i) => (
                                  <div key={i} className="flex items-center justify-between text-[11.5px] font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-xs">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.fill }} />
                                      <span className="truncate" title={measureLabel(e.name)}>{measureLabel(e.name)}</span>
                                    </div>
                                    <span className="whitespace-nowrap tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm">{Number(e.value).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* BAR LIST */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /> {pieViewMode === 'mean' ? 'Average Breakdown' : 'Sample Breakdown'}</h4>
                            <span className="text-[11px] font-black text-slate-400 bg-white px-3 py-1 rounded-full uppercase tracking-widest">{pieViewMode === 'mean' ? 'Aggregate' : `${filteredEntries.length} Records`}</span>
                          </div>

                          {pieViewMode === 'latest' && (
                            <div className="flex flex-col md:flex-row gap-3 mb-4 border-b border-slate-200 pb-4">
                              <div className="flex-1">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input type="text" value={batchSearch} onChange={e => { setBatchSearch(e.target.value); setSelectedCompositionDate(''); }} placeholder="Search Batch..."
                                    className="w-full bg-white border border-slate-200 text-slate-700 py-2 pl-9 pr-3 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder:font-normal outline-none" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <select value={activeDate} onChange={e => setSelectedCompositionDate(e.target.value)} disabled={filteredEntries.length === 0}
                                  className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold outline-none">
                                  {filteredEntries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                            </div>
                          )}

                          <div className="overflow-y-auto pr-2" style={{ maxHeight: pieViewMode === 'mean' ? '400px' : '300px' }}>
                            {pieViewMode === 'latest' && !selectedRow ? (<div className="py-16 text-center text-slate-400 font-bold uppercase text-xs">No data for selected date</div>)
                              : (() => {
                                const unitFilteredBreakdown = breakdown.filter(m => {
                                  const sm = visibleSummaryData.find(s => s.measure === m.key);
                                  return (sm?.unit || 'Units').trim().toUpperCase() === unit;
                                });

                                if (unitFilteredBreakdown.length === 0) return <div className="py-16 text-center text-slate-400 font-bold uppercase text-xs">No measurements found</div>;

                                const maxValInList = unitFilteredBreakdown.reduce((p, c) => Math.max(p, c.value), 0);
                                const unitTotal = unitFilteredBreakdown.reduce((s, m) => s + m.value, 0);

                                return unitFilteredBreakdown.map((m, idx) => {
                                  const pct = unitTotal > 0 ? (m.value / unitTotal) * 100 : 0, barW = maxValInList > 0 ? (m.value / maxValInList) * 100 : 0;

                                  // Calculate Delta compared to historical average at same age
                                  const diff = m.historical && m.historical > 0 ? (m.value - m.historical) : 0;
                                  const diffPct = m.historical && m.historical > 0 ? (diff / m.historical) * 100 : 0;
                                  const isUp = diff > 0;
                                  const isMajor = Math.abs(diffPct) > 15;

                                  return (
                                    <div key={m.key} className="mb-4 bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{measureLabel(m.key)}</span>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Avg at Age: {m.historical?.toFixed(2)}{unit}</span>
                                            {m.median != null && (
                                              <>
                                                <span className="text-slate-300">·</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Median: {m.median.toFixed(2)}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-[14px] font-black text-slate-900 dark:text-slate-100">{Number(m.value).toFixed(2)}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
                                          </div>
                                          {pieViewMode === 'latest' && m.historical != null && (
                                            <div className={`flex items-center justify-end gap-0.5 text-[10px] font-black uppercase mt-0.5 ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                              {Math.abs(diffPct).toFixed(1)}% {isUp ? 'Higher' : 'Lagging'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${barW}%`, backgroundColor: m.color }} />
                                        {m.historical != null && maxValInList > 0 && (
                                          <div className="absolute inset-y-0 w-0.5 bg-slate-400/50 dark:bg-slate-500/50 z-10" style={{ left: `${(m.historical / maxValInList) * 100}%` }} title={`Benchmark: ${m.historical.toFixed(2)}`} />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              })()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </section>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [plotType, setPlotType] = useState('line');
  const [selectedWindow, setSelectedWindow] = useState('All');

  const [filters, setFilters] = useState({ crops: [], soil_types: [] });
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedSoil, setSelectedSoil] = useState('');

  // Dropdown multiple category handling
  const [allCategories] = useState(ALL_STATIC_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState(['pH + O.S.', 'N-min 0-90 cm']); // Defaults
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Data per category
  const [categoryDataGroups, setCategoryDataGroups] = useState({});
  const [categorySummaryGroups, setCategorySummaryGroups] = useState({});
  const [benchmarks, setBenchmarks] = useState({});

  const [cropDateRange, setCropDateRange] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive selection profile
  const selectionProfile = useMemo(() => {
    if (selectedCategories.length === 0) return { hasSoil: false, hasPlant: false, hasMixed: false };
    const types = new Set(selectedCategories.map(name => allCategories.find(c => c.name === name)?.type));
    return {
      hasSoil: types.has('soil'),
      hasPlant: types.has('plant'),
      hasMixed: types.has('mixed'),
      isExclusivelySoil: types.has('soil') && !types.has('plant') && !types.has('mixed'),
      isExclusivelyPlant: types.has('plant') && !types.has('soil') && !types.has('mixed'),
    };
  }, [selectedCategories, allCategories]);

  // Grouped Categories for Rendering
  const groupedCategories = useMemo(() => {
    return {
      'Plant Related': allCategories.filter(c => c.type === 'plant'),
      'Soil Related': allCategories.filter(c => c.type === 'soil'),
      'Mixed / Multi-Purpose': allCategories.filter(c => c.type === 'mixed'),
    };
  }, [allCategories]);

  // Handle mutual exclusivity of filters
  // Soil type is NEVER blocked — plant analysis still depends on the soil field
  useEffect(() => {
    if (selectionProfile.isExclusivelySoil) {
      if (selectedCrop !== 'All Crops') setSelectedCrop('All Crops');
    }
  }, [selectionProfile, selectedCrop]);

  // Handle click outside for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);

  useEffect(() => {
    getFilters().then(data => {
      setFilters(data);
      if (data.crops.length) setSelectedCrop(data.crops[0]);
      if (data.soil_types.length) setSelectedSoil(data.soil_types[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCrop || !selectedSoil || selectedCategories.length === 0) {
      setCategoryDataGroups({});
      setCategorySummaryGroups({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const catQuery = selectedCategories.join(',');

    Promise.all([
      getTimeSeriesData(selectedCrop, selectedSoil, catQuery, null),
      getSummaryStats(selectedCrop, selectedSoil, catQuery, null),
      getDateRange(selectedCrop, selectedSoil),
      getBenchmarks(selectedCrop, selectedSoil, catQuery),
    ]).then(([tData, sData, dateRange, bData]) => {

      const tGroups = {};
      const sGroups = {};
      selectedCategories.forEach(c => { tGroups[c] = []; sGroups[c] = []; });

      tData.forEach(row => {
        if (row.Category && tGroups[row.Category]) { tGroups[row.Category].push(row); }
      });
      sData.forEach(row => {
        if (row.category && sGroups[row.category]) { sGroups[row.category].push(row); }
      });

      setCategoryDataGroups(tGroups);
      setCategorySummaryGroups(sGroups);
      setBenchmarks(bData);
      setCropDateRange(dateRange);
      setSelectedWindow('All');
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedCrop, selectedSoil, selectedCategories]);

  const availableWindows = useMemo(() => {
    if (!Array.isArray(cropDateRange) || cropDateRange.length === 0) return [];
    const seen = new Set(), out = [];
    cropDateRange.forEach(w => { if (seen.has(w.label)) return; seen.add(w.label); out.push({ label: w.label, value: w.label, firstSample: new Date(w.first_sample), lastSample: new Date(w.last_sample) }); });
    return out.sort((a, b) => a.firstSample - b.firstSample);
  }, [cropDateRange]);

  const toggleCategory = cat => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors">
      <div className="px-4 md:px-8 pt-[120px] pb-24 max-w-[1920px] mx-auto">

        {/* ── UNIFIED FIXED TOP BAR ── */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.13)] border-b border-slate-200 dark:border-slate-700">

          {/* ROW 1 — Brand + Filter Controls */}
          <div className="flex flex-row items-center justify-between px-5 md:px-8 gap-8 border-b border-slate-100 dark:border-slate-800 min-h-[90px] py-2">

            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Soil Analytics</h1>
                <p className="text-[11px] font-semibold text-emerald-500 tracking-widest uppercase mt-1">Multi-Category Dashboard</p>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block w-px self-stretch my-3 bg-slate-200 dark:bg-slate-700 shrink-0 mx-2" />

            {/* Filter Controls — Scrollable row to prevent vertical overflow */}
            <div className="flex items-center gap-6 justify-end flex-1 flex-nowrap py-3 pr-2" style={{ overflowX: 'visible' }}>

              {/* Categories multi-select */}
              <div className="flex flex-col gap-1.5 w-[220px] shrink-0" ref={dropdownRef}>
                <label className="text-[10px] font-black text-indigo-500 flex items-center justify-between uppercase tracking-widest px-0.5">
                  <span>Categories Tested</span>
                  <span className="text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full font-black">{selectedCategories.length}</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700 text-slate-700 dark:text-slate-200 px-3 rounded-xl text-[13px] font-bold hover:border-indigo-400 transition-all h-[40px]">
                    <span className="truncate pr-1">{selectedCategories.length === 0 ? 'Select categories' : selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} Selected`}</span>
                    <ChevronDown className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 sm:w-[320px] mt-2 bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl rounded-2xl py-3 px-2 z-[100] max-h-[400px] overflow-y-auto flex flex-col gap-1">
                      <button onClick={() => setSelectedCategories(selectedCategories.length === allCategories.length ? [] : allCategories.map(c => c.name))} className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 px-2 pb-2 border-b text-left hover:text-indigo-800 transition-colors">
                        {selectedCategories.length === allCategories.length ? 'Deselect All' : 'Select All Categories'}
                      </button>
                      {Object.entries(groupedCategories).map(([groupName, categories]) => (
                        <div key={groupName} className="mb-4 last:mb-0">
                          <div className="px-2 py-1 mb-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800/50 rounded-lg">{groupName}</div>
                          {categories.map(c => (
                            <label key={c.name} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group select-none">
                              <input type="checkbox" className="sr-only" checked={selectedCategories.includes(c.name)} onChange={() => toggleCategory(c.name)} />
                              <div className="mt-0.5">
                                {selectedCategories.includes(c.name) ? <CheckSquare className="w-5 h-5 text-indigo-500 flex-shrink-0" /> : <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />}
                              </div>
                              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{c.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart type */}
              <div className="flex flex-col gap-1 shrink-0">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5 flex items-center gap-1"><LineChartIcon className="w-3 h-3" /> Chart Type</label>
                <div className="relative">
                  <select value={plotType} onChange={e => setPlotType(e.target.value)}
                    className="appearance-none h-[40px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 font-bold cursor-pointer text-[13px] transition-colors">
                    <option value="line">Line</option><option value="bar">Bar</option><option value="area">Area</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-1 w-[165px] shrink-0">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Timeline Focus</label>
                <div className="relative">
                  <select value={selectedWindow} onChange={e => setSelectedWindow(e.target.value)}
                    className="appearance-none h-[40px] w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 font-bold cursor-pointer text-[13px] transition-colors">
                    <option value="All">Complete History</option>
                    {availableWindows.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Crop */}
              <div className={`flex flex-col gap-1 w-[120px] shrink-0 transition-opacity duration-300 ${selectionProfile.isExclusivelySoil ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-0.5 flex items-center gap-1">
                  Crop {selectionProfile.isExclusivelySoil && <Box className="w-3 h-3" />}
                </label>
                <div className="relative">
                  <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)} disabled={selectionProfile.isExclusivelySoil}
                    className="appearance-none h-[40px] w-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 pl-3 pr-8 rounded-xl focus:outline-none font-bold cursor-pointer text-[13px] transition-colors disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400">
                    {filters.crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                </div>
              </div>

              {/* Soil Type */}
              <div className="flex flex-col gap-1 w-[120px] shrink-0">
                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-0.5">Soil Type</label>
                <div className="relative">
                  <select value={selectedSoil} onChange={e => setSelectedSoil(e.target.value)}
                    className="appearance-none h-[40px] w-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 pl-3 pr-8 rounded-xl focus:outline-none font-bold cursor-pointer text-[13px] transition-colors">
                    {filters.soil_types.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                </div>
              </div>

              {/* Dark mode toggle */}
              <div className="flex flex-col gap-1 shrink-0 self-end">
                <button onClick={() => setIsDark(!isDark)}
                  className="h-[40px] w-[40px] flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  {isDark ? <Sun className="w-[18px] h-[18px] text-amber-500" /> : <Moon className="w-[18px] h-[18px] text-indigo-500" />}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* ── GLOBAL TAB SELECTOR (MOVED OUT OF FIXED HEADER) ── */}
        <div className="flex overflow-x-auto py-2 mb-6 gap-4">
          {[
            { key: 'summary', label: 'Insight Cards', icon: <LayoutDashboard className="w-4 h-4 ml-1" /> },
            { key: 'trends', label: 'Trajectory Plots', icon: <TrendingUp className="w-4 h-4 ml-1" /> },
            { key: 'composition', label: 'Composition Split', icon: <PieChartIcon className="w-4 h-4 ml-1" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex justify-center items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-[14px] transition-all whitespace-nowrap min-w-[160px] flex-1 md:flex-none
                ${activeTab === tab.key
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-lg transform scale-100 ring-2 ring-indigo-500/20'
                  : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 hover:shadow shadow-sm bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── PAGE CONTENT / CATEGORY MAP ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-6 text-slate-400 font-bold tracking-widest uppercase text-sm">Loading category data…</p>
          </div>
        ) : selectedCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 py-32 rounded-3xl text-center border border-slate-100 flex flex-col items-center shadow-sm">
            <Box className="w-20 h-20 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300">No categories selected</h3>
            <p className="text-slate-400 mt-3 max-w-md font-medium text-lg">Use the dropdown above to selectively display tracking blocks for multiple categories.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedCategories.map(cat => {
              const catType = allCategories.find(c => c.name === cat)?.type || 'mixed';
              return (
                <CategoryBlock
                  key={cat}
                  categoryName={cat}
                  categoryType={catType}
                  categoryData={categoryDataGroups[cat] || []}
                  categorySummary={categorySummaryGroups[cat] || []}
                  benchmarks={benchmarks}
                  plotType={plotType}
                  selectedWindow={selectedWindow}
                  availableWindows={availableWindows}
                  activeTab={activeTab}
                  isDark={isDark}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}