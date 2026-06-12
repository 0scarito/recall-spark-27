export function getApiUrl(path: string): string {
  const envBase = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE) || (window as any).__API_BASE__;
  if (envBase && typeof envBase === 'string') {
    return `${envBase.replace(/\/$/, '')}${path}`;
  }
  return `${window.location.origin}${path}`;
}


