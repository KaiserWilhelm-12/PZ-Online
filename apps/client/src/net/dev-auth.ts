const IDENTITY_KEY = 'lanternfall.dev.identity.v1';

interface DevIdentity {
  playerId: string;
  characterId: string;
  displayName: string;
}

export interface DevSession {
  token: string;
  playerId: string;
  characterId: string;
  displayName: string;
  serverId: string;
  expiresInSec: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const readIdentity = (): DevIdentity | null => {
  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    const playerId = readString(parsed, 'playerId');
    const characterId = readString(parsed, 'characterId');
    const displayName = readString(parsed, 'displayName');
    if (!playerId || !characterId || !displayName) {
      return null;
    }
    return { playerId, characterId, displayName };
  } catch {
    return null;
  }
};

const writeIdentity = (identity: DevIdentity): void => {
  try {
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Storage can be unavailable in private contexts; the session still works for this tab.
  }
};

export async function requestDevSession(authUrl: string): Promise<DevSession> {
  const stored = readIdentity();
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(stored ?? {}),
  });

  if (!response.ok) {
    throw new Error(
      `Development sign-in is unavailable (${response.status}). Start the game server with DEV_AUTH_ENABLED=true.`,
    );
  }

  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error('Development sign-in returned an invalid response');
  }

  const token = readString(body, 'token');
  const playerId = readString(body, 'playerId');
  const characterId = readString(body, 'characterId');
  const displayName = readString(body, 'displayName');
  const serverId = readString(body, 'serverId');
  if (!token || !playerId || !characterId || !displayName || !serverId) {
    throw new Error('Development sign-in returned an incomplete session');
  }

  writeIdentity({ playerId, characterId, displayName });

  return {
    token,
    playerId,
    characterId,
    displayName,
    serverId,
    expiresInSec: typeof body.expiresInSec === 'number' ? body.expiresInSec : 0,
  };
}
