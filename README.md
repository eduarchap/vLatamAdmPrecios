# vLatam Adm Precios

Aplicación web para el **cambio rápido de precios** de artículos sobre el API REST
de Velneo (vLatamERP). Login contra `usr_m`, búsqueda de artículos por nombre /
descripción / código, filtrado por familia y proveedor, y edición inline del precio
(`pvp`) con guardado directo.

## Stack
React 18 · TypeScript · Vite · MUI 6 · Axios · notistack

## Puesta en marcha (desarrollo)
```bash
npm install
npm run dev
```
La configuración se lee de `public/config.js` (ver abajo). Para desarrollo también
puedes crear un `.env` a partir de `.env.example`.

## Build
```bash
npm run build      # genera /dist
npm run preview    # sirve /dist localmente
```

## ⭐ Configuración por cliente (replicar el proyecto)

Todo lo específico de cada cliente vive en **un solo fichero**:

### `public/config.js`
```js
window.__APP_CONFIG__ = {
  clientName: 'Karibe',
  apiUrl: 'https://app.karibe.com.ar/KARIBE_API/vLatamERP_db_dat/v1',
  apiKey: 'KARIBE_API_2025',
  login: { userField: 'name', passField: 'clave' },
  priceDecimals: 2,
  currencySymbol: '$',
};
```

- `apiUrl` / `apiKey`: endpoint y clave del proyecto Velneo del cliente.
- `login.userField` / `login.passField`: nombres de los campos de `usr_m` que
  expongas en el API para usuario y contraseña.
- `priceDecimals` / `currencySymbol`: formato de precio.

**Para un cliente nuevo:** copia el sitio desplegado (o el repo) y edita únicamente
`config.js`. Este fichero se sirve con `Cache-Control: no-cache`, por lo que puedes
cambiarlo en el hosting sin recompilar.

## Requisitos en el API REST de Velneo
Para que la app funcione, el recurso del API debe exponer:

1. **`art_m` con permiso de modificación (POST)** — necesario para guardar precios
   (`POST /art_m/{id}` con `{ id, pvp }`).
2. **`usr_m` con los campos de usuario y contraseña** indicados en `config.login`.
3. **CORS habilitado** para el dominio donde se despliega la app (Netlify).

## Despliegue en Netlify
El repo incluye `netlify.toml` (build `npm run build`, publish `dist`, SPA fallback).
