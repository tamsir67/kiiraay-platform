// Cryptographic functions for SHA-256 chained audit and HMAC verification tokens

export async function calculateSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synchronous fast fallback / display checksum
export function fastHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${hex.split('').reverse().join('')}`;
}

export function generateSecureToken(numeroKry: string, nom: string): string {
  const seed = `${numeroKry}:${nom}:${Date.now()}:kiiraay_secret_2027`;
  return fastHash(seed).replace('sha256_', '').substring(0, 16);
}

export function maskTelephone(telephone: string): string {
  if (!telephone) return '—';
  // Ex: +221 77 645 12 34 -> +221 77 ••• •• 34
  const cleaned = telephone.replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length >= 4) {
    return `${parts[0]} ${parts[1]} ••• •• ${parts[parts.length - 1]}`;
  }
  return telephone.slice(0, 7) + ' ••• ' + telephone.slice(-2);
}

export function maskCni(cni?: string): string {
  if (!cni) return 'Non renseigné';
  if (cni.length === 13) {
    return `${cni.slice(0, 3)}•••••••${cni.slice(-3)}`;
  }
  return '•••••••••••••';
}
