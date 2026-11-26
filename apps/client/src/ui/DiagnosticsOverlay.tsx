import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { DiagnosticsCollector, DiagnosticsSnapshot } from '../runtime/diagnostics';

interface DiagnosticsRow {
  label: string;
  value: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const buildRows = (snapshot: DiagnosticsSnapshot): DiagnosticsRow[] => [
  { label: 'FPS', value: snapshot.fps.toFixed(0) },
  { label: 'Frame', value: `${snapshot.frameTimeMs.toFixed(1)} ms` },
  { label: 'Draw calls', value: snapshot.drawCalls.toString() },
  { label: 'Sprites', value: snapshot.visibleSprites.toString() },
  {
    label: 'Latency',
    value: snapshot.latencyMs === null ? '—' : `${Math.round(snapshot.latencyMs)} ms`,
  },
  { label: 'Traffic in', value: formatBytes(snapshot.trafficInBytes) },
  { label: 'Traffic out', value: formatBytes(snapshot.trafficOutBytes) },
  { label: 'Chunks', value: snapshot.chunksLoaded.toString() },
  {
    label: 'Heap',
    value: snapshot.heapUsedMb === null ? 'n/a' : `${snapshot.heapUsedMb.toFixed(1)} MB`,
  },
  {
    label: 'Server tick',
    value: snapshot.serverTickMs === null ? '—' : `${snapshot.serverTickMs.toFixed(1)} ms`,
  },
];

export function DiagnosticsOverlay({
  collector,
}: {
  collector: DiagnosticsCollector;
}): ReactElement {
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot>(() => collector.snapshot());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot(collector.snapshot());
    }, 250);
    return () => {
      clearInterval(timer);
    };
  }, [collector]);

  return (
    <aside className="diagnostics" aria-label="Performance diagnostics">
      <h2>Diagnostics</h2>
      <div className="diagnostics-rows">
        {buildRows(snapshot).map((row) => (
          <div key={row.label} className="diagnostics-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </div>
    </aside>
  );
}
