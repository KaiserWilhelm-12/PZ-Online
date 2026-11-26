import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameConnection, resolveServerEndpoints, type ConnectionStatus } from '../net/connection';
import { requestDevSession } from '../net/dev-auth';
import { DiagnosticsCollector } from '../runtime/diagnostics';
import { GameRuntime } from '../runtime/game';
import { DiagnosticsOverlay } from './DiagnosticsOverlay';

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  authenticating: 'Signing in',
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  error: 'Connection error',
};

export function App(): ReactElement {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const diagnostics = useMemo(() => new DiagnosticsCollector(), []);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    const runtime = new GameRuntime(host, diagnostics);
    void runtime.start().catch((error: unknown) => {
      if (!cancelled) {
        setRenderError(error instanceof Error ? error.message : 'Unknown renderer error');
      }
    });

    const endpoints = resolveServerEndpoints();
    const connection = new GameConnection({
      wsUrl: endpoints.wsUrl,
      diagnostics,
      getSession: async () => {
        const session = await requestDevSession(endpoints.authUrl);
        return { token: session.token, serverId: session.serverId };
      },
      callbacks: {
        onStatus: (nextStatus, detail) => {
          setStatus(nextStatus);
          setStatusDetail(detail ?? null);
        },
      },
    });
    connection.start();

    return () => {
      cancelled = true;
      connection.stop();
      runtime.destroy();
    };
  }, [diagnostics]);

  return (
    <div className="app-shell">
      <div ref={canvasHostRef} className="canvas-host" />

      <header className="hud-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <div>
            <h1>Lanternfall</h1>
            <p>Kestrel Basin field test</p>
          </div>
        </div>

        <div
          className={`connection-chip connection-${status}`}
          role="status"
          aria-live="polite"
          title={statusDetail ?? STATUS_LABELS[status]}
        >
          <span className="connection-dot" aria-hidden="true" />
          <span>{STATUS_LABELS[status]}</span>
          {statusDetail && <span className="connection-detail">{statusDetail}</span>}
        </div>

        <button
          type="button"
          className="hud-button"
          aria-pressed={showDiagnostics}
          onClick={() => {
            setShowDiagnostics((visible) => !visible);
          }}
        >
          Diagnostics
        </button>
      </header>

      {showDiagnostics && <DiagnosticsOverlay collector={diagnostics} />}

      {renderError && (
        <div className="notice" role="alert">
          Renderer unavailable: {renderError}
        </div>
      )}

      <div className="rotate-hint">Turn the iPad to landscape for the full view</div>

      <footer className="hud-bottom">
        <span>Bootstrap chunk · Kestrel Basin survey</span>
        <span>Touch-first · no keyboard</span>
      </footer>
    </div>
  );
}
