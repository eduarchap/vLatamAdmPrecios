/* =========================================================================
 *  CONFIGURACIÓN POR CLIENTE  —  vLatam Adm Precios
 * =========================================================================
 *  Este fichero se puede editar DESPUÉS de compilar/desplegar, sin volver a
 *  hacer build. Para dar de alta un nuevo cliente basta con copiar el sitio
 *  y cambiar los valores de aquí abajo.
 *
 *  En Netlify: Deploys → "Deploy file browser", o subiendo un nuevo config.js.
 * ========================================================================= */
window.__APP_CONFIG__ = {
  /* Nombre del cliente/negocio (se muestra en la cabecera y el login) */
  clientName: 'Karibe',

  /* URL base del API REST de Velneo (incluye .../v1, SIN barra final) */
  apiUrl: 'https://app.karibe.com.ar/KARIBE_API/vLatamERP_db_dat/v1',

  /* API Key del proyecto */
  apiKey: 'KARIBE_API_2025',

  /* --- Campos de la tabla de usuarios (USR_M) usados para el login ---------
   * Ajusta estos nombres a los campos que expongas en el recurso usr_m del
   * API REST. 'userField' = campo de usuario/login; 'passField' = contraseña.
   */
  /* userField: campo de usr_m con el nombre a mostrar (si existe). Si está
   *   vacío/ausente, el nombre se resuelve desde ent_m vía ent_rel.
   * passField: campo de usr_m con la contraseña. */
  login: {
    userField: 'name',
    passField: 'pwd',
  },

  /* --- Campos opcionales de art_m (referencia y código de barras) ----------
   * Pon el nombre del campo tal cual está expuesto en el API. Déjalo en ''
   * (cadena vacía) si el campo no existe: la app lo ignora sin romperse.
   */
  fields: {
    referencia: 'ref',
    codigoBarras: 'cod_bar',
  },

  /* Nº de decimales para mostrar/editar precios (ARS suele usar 0 ó 2) */
  priceDecimals: 2,

  /* Símbolo de moneda mostrado junto al precio */
  currencySymbol: '$',
};
