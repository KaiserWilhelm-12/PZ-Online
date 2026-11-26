import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EntityDelta } from '@lanternfall/protocol';
import { GameConnection, resolveServerEndpoints, type ConnectionStatus } from '../net/connection';
import { requestDevSession } from '../net/dev-auth';
import { DiagnosticsCollector } from '../runtime/diagnostics';
import type { GameRuntime } from '../runtime/game';
import { DiagnosticsOverlay } from './DiagnosticsOverlay';

interface TouchJoystickProps {
  onMove: (moveX: number, moveY: number) => void;
}

function TouchJoystick({ onMove }: TouchJoystickProps): ReactElement {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const base = baseRef.current;
    if (!base) {
      return;
    }
    const bounds = base.getBoundingClientRect();
    const radius = bounds.width * 0.34;
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    onMove(x / radius, y / radius);
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="touch-joystick"
      role="group"
      aria-label="Movement joystick"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          update(event);
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span
        className="touch-joystick-knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

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
  const connectionRef = useRef<GameConnection | null>(null);
  const joystickRef = useRef({ moveX: 0, moveY: 0 });
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
    let runtime: GameRuntime | null = null;
    let latestEntities: readonly EntityDelta[] = [];
    let hasSnapshot = false;
    let controlledEntityId: number | null = null;
    void import('../runtime/game')
      .then(({ GameRuntime: Runtime }) => {
        if (cancelled) {
          return null;
        }
        runtime = new Runtime(host, diagnostics);
        return runtime.start().then(() => runtime);
      })
      .then((startedRuntime) => {
        if (startedRuntime) {
          if (hasSnapshot) {
            startedRuntime.setEntities(latestEntities);
          }
          startedRuntime.setControlledEntity(controlledEntityId);
        }
      })
      .catch((error: unknown) => {
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
        onMessage: (message) => {
          if (message.type === 'welcome') {
            controlledEntityId = message.entityId ?? null;
            runtime?.setControlledEntity(controlledEntityId);
            return;
          }
          if (message.type === 'snapshot') {
            latestEntities = message.entities;
            hasSnapshot = true;
            runtime?.setEntities(latestEntities);
          }
        },
      },
    });
    connectionRef.current = connection;
    connection.start();

    const movementTimer = window.setInterval(() => {
      const facing =
        joystickRef.current.moveX === 0 && joystickRef.current.moveY === 0
          ? 0
          : Math.round(
              (Math.atan2(joystickRef.current.moveY, joystickRef.current.moveX) / (Math.PI * 2)) *
                256 +
                256,
            ) % 256;
      connectionRef.current?.sendInput(
        joystickRef.current.moveX,
        joystickRef.current.moveY,
        facing,
        50,
      );
    }, 50);

    return () => {
      cancelled = true;
      window.clearInterval(movementTimer);
      connectionRef.current = null;
      connection.stop();
      runtime?.destroy();
    };
  }, [diagnostics]);

  return (
    <div className="app-shell">
      <div ref={canvasHostRef} className="canvas-host" />
      <TouchJoystick
        onMove={(moveX, moveY) => {
          joystickRef.current = { moveX, moveY };
        }}
      />

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
        <span>Tap terrain to select a tile · Kestrel Basin survey</span>
        <span>Touch-first · no keyboard</span>
      </footer>
    </div>
  );
}
