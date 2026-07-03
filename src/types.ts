/** Tablas del API REST de Velneo (APP_GASTRONOMICA) */

/** art_m — Artículos */
export interface Articulo {
  id: number;
  name: string;
  dsc?: string;
  fam?: string; // id de familia (fam_m)
  prv?: number; // id de proveedor (ent_m), 0 = ninguno
  pvp: number; // precio de venta
  es_nue?: boolean;
  por_dto?: number; // % descuento
  nom_img?: string;
  // Campos opcionales (referencia / código de barras) según config del cliente
  [key: string]: unknown;
}

/** fam_m — Familias */
export interface Familia {
  id: string;
  name: string;
}

/** ent_m — Contactos (proveedores/clientes) */
export interface Entidad {
  id: number;
  es_clt?: boolean;
  nom_fis?: string;
  nom_com?: string;
}

/** art_prv_g — Relación artículo ↔ proveedor (muchos a muchos) */
export interface RelArtPrv {
  art: number; // id de artículo (art_m)
  prv: number; // id de proveedor (ent_m)
  ref_prv?: string;
}

/** Proveedor listo para el desplegable */
export interface Proveedor {
  id: number;
  nombre: string;
}

/** usr_m — Usuarios. Los campos de login son dinámicos (según config). */
export interface Usuario {
  id: number;
  ent_rel?: number;
  [key: string]: unknown;
}

/** Sesión del usuario logueado */
export interface Sesion {
  id: number;
  nombre: string;
}
