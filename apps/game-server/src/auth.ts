import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AuthenticatedIdentity {
  playerId: string;
  characterId: string | null;
  displayName: string | null;
}

export interface IdentityVerifierOptions {
  supabaseJwtSecret?: string | undefined;
  supabaseJwksUrl?: string | undefined;
  issuer?: string | undefined;
  audience?: string | undefined;
  devJwtSecret?: string | undefined;
  devAuthEnabled: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readClaim = (payload: JWTPayload, key: string): string | null => {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const toIdentity = (payload: JWTPayload): AuthenticatedIdentity => {
  const subject = payload.sub;
  if (!subject || !UUID_PATTERN.test(subject)) {
    throw new Error('Token subject must be a UUID');
  }

  const characterClaim = readClaim(payload, 'character_id') ?? readClaim(payload, 'characterId');
  const characterId = characterClaim && UUID_PATTERN.test(characterClaim) ? characterClaim : null;

  return {
    playerId: subject,
    characterId,
    displayName: readClaim(payload, 'display_name') ?? readClaim(payload, 'name'),
  };
};

export function createIdentityVerifier(
  options: IdentityVerifierOptions,
): (token: string) => Promise<AuthenticatedIdentity> {
  const supabaseKey = options.supabaseJwtSecret
    ? new TextEncoder().encode(options.supabaseJwtSecret)
    : null;
  const jwks = options.supabaseJwksUrl
    ? createRemoteJWKSet(new URL(options.supabaseJwksUrl))
    : null;
  const devKey =
    options.devAuthEnabled && options.devJwtSecret
      ? new TextEncoder().encode(options.devJwtSecret)
      : null;

  if (!supabaseKey && !jwks && !devKey) {
    throw new Error('No identity verification source is configured');
  }

  const verifySupabase = async (token: string): Promise<AuthenticatedIdentity> => {
    if (!supabaseKey && !jwks) {
      throw new Error('Supabase verification is not configured');
    }
    let payload: JWTPayload;
    if (supabaseKey) {
      ({ payload } = await jwtVerify(token, supabaseKey, {
        issuer: options.issuer,
        audience: options.audience,
        clockTolerance: 5,
        algorithms: ['HS256'],
      }));
    } else if (jwks) {
      ({ payload } = await jwtVerify(token, jwks, {
        issuer: options.issuer,
        audience: options.audience,
        clockTolerance: 5,
        algorithms: ['ES256', 'RS256'],
      }));
    } else {
      throw new Error('Supabase verification is not configured');
    }
    return toIdentity(payload);
  };

  const verifyDev = async (token: string): Promise<AuthenticatedIdentity> => {
    if (!devKey) {
      throw new Error('Development verification is not configured');
    }
    const { payload } = await jwtVerify(token, devKey, {
      issuer: 'lanternfall-dev',
      audience: 'lanternfall-dev',
      clockTolerance: 5,
      algorithms: ['HS256'],
    });
    return toIdentity(payload);
  };

  return async (token: string): Promise<AuthenticatedIdentity> => {
    const attempts: Array<() => Promise<AuthenticatedIdentity>> = [];
    if (supabaseKey || jwks) {
      attempts.push(() => verifySupabase(token));
    }
    if (devKey) {
      attempts.push(() => verifyDev(token));
    }

    let lastError: unknown = new Error('Token verification failed');
    for (const attempt of attempts) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Token verification failed');
  };
}

export interface DevTokenInput {
  secret: string;
  playerId: string;
  characterId: string;
  displayName?: string;
  expiresIn?: string;
}

export async function signDevToken(input: DevTokenInput): Promise<string> {
  const key = new TextEncoder().encode(input.secret);
  return new SignJWT({
    character_id: input.characterId,
    display_name: input.displayName ?? 'Field Tester',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.playerId)
    .setIssuer('lanternfall-dev')
    .setAudience('lanternfall-dev')
    .setIssuedAt()
    .setExpirationTime(input.expiresIn ?? '12h')
    .sign(key);
}
