/**
 * Lee la configuración por cliente desde `window.__APP_CONFIG__`
 * (definida en /public/config.js, editable tras el build).
 * Si no existe, cae a variables de entorno de Vite (útil en desarrollo).
 */
export interface LoginFields {
  userField: string;
  passField: string;
}

export interface AppConfig {
  clientName: string;
  apiUrl: string;
  apiKey: string;
  login: LoginFields;
  priceDecimals: number;
  currencySymbol: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

export const config: AppConfig = {
  clientName: runtime.clientName ?? import.meta.env.VITE_CLIENT_NAME ?? 'vLatam',
  apiUrl: runtime.apiUrl ?? import.meta.env.VITE_API_URL ?? '',
  apiKey: runtime.apiKey ?? import.meta.env.VITE_API_KEY ?? '',
  login: {
    userField: runtime.login?.userField ?? 'name',
    passField: runtime.login?.passField ?? 'clave',
  },
  priceDecimals: runtime.priceDecimals ?? 2,
  currencySymbol: runtime.currencySymbol ?? '$',
};
