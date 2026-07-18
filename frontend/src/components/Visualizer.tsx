import React from 'react';

interface VisualizationData {
  type: 'charts' | 'heatmap' | 'ranking' | 'timeline' | 'radar' | 'stats';
  title: string;
  description?: string;
  data: any;
}

export default function Visualizer({ visualization }: { visualization: VisualizationData }) {
  const { type, data } = visualization;
  if (!Array.isArray(data) || data.length === 0) return null;

  if (type === 'ranking') {
    return (
      <div className="space-y-3 font-mono text-[11px]">
        {data.map((item: any, idx: number) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-secondary-text">
              <span className="font-semibold text-primary-text">{item.name}</span>
              <span className="text-primary font-bold">{item.score}%</span>
            </div>
            <div className="w-full h-2.5 bg-elevated border border-border-color rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                style={{ width: `${item.score}%` }}
              />
              <div
                className="absolute h-full w-[2px] bg-success top-0"
                style={{ left: `${item.classAvg || 80}%` }}
                title="Class Average"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'timeline') {
    const points = data.map((item: any, idx: number) => ({
      x: 50 + idx * 140,
      y: 140 - (item.SofiaScore || item.score || 50) * 1.1,
      label: item.period || item.date,
    }));
    const polyline = points.map((p: any) => `${p.x},${p.y}`).join(' ');

    return (
      <svg className="w-full h-36 bg-elevated/40 rounded-xl border border-border-color p-2" viewBox="0 0 400 150">
        <line x1="40" y1="30" x2="380" y2="30" stroke="var(--border-color)" strokeDasharray="3" opacity="0.4" />
        <line x1="40" y1="85" x2="380" y2="85" stroke="var(--border-color)" strokeDasharray="3" opacity="0.4" />
        <line x1="40" y1="130" x2="380" y2="130" stroke="var(--border-color)" strokeDasharray="3" opacity="0.4" />
        <polyline fill="none" stroke="var(--primary)" strokeWidth="2.5" points={polyline} />
        {points.map((p: any, idx: number) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" className="fill-surface stroke-primary stroke-2" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fill="var(--primary)" fontSize="10" fontFamily="monospace" fontWeight="bold">
              {Math.round((140 - p.y) / 1.1)}%
            </text>
            <text x={p.x} y="145" textAnchor="middle" fill="var(--muted-text)" fontSize="8" fontFamily="monospace">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (type === 'heatmap') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.map((item: any, idx: number) => {
          const mastery = item.mastery || 60;
          let theme = 'border-error/30 bg-error/10 text-error';
          let label = 'Urgent Remedial';
          if (mastery >= 85) { theme = 'border-success/30 bg-success/10 text-success'; label = 'Secure Mastery'; }
          else if (mastery >= 70) { theme = 'border-secondary/30 bg-secondary/10 text-secondary'; label = 'Developing'; }

          return (
            <div key={idx} className={`border rounded-xl p-3 flex flex-col gap-1 transition-colors ${theme}`}>
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase">{label}</span>
              <span className="text-xs font-bold font-display truncate mt-1">{item.topic || item.subject}</span>
              <h5 className="text-md font-extrabold font-mono mt-1">{mastery}%</h5>
            </div>
          );
        })}
      </div>
    );
  }

  // stats (default)
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="bg-surface border border-border-color rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-muted-text uppercase leading-tight">{item.label}</span>
          <span className="text-xs font-bold text-primary-text mt-2 break-words">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
