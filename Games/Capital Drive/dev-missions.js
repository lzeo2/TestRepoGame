const CONFIGURED_SHA = '34d0976c134642939b6f7a10256d161fec8f111e6567d00527c05c50cd49bd91';
const INVULNERABILITY_SHA = '37f58d7ebcbb5d37e41d5c5f4c1be3c99ff018ac93a37742e2a329b7cfed49b6';

export async function matchesMissionCode(value, { crypto = globalThis.crypto, digest = CONFIGURED_SHA } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 32 || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return false;
  try {
    if (typeof crypto?.subtle?.digest !== 'function') return false;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    const actual = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
    return actual === digest;
  } catch {
    return false;
  }
}

export const matchesGodModeCode = value => matchesMissionCode(value,{digest:INVULNERABILITY_SHA});
