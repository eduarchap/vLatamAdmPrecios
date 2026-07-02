import { list } from '@/api/client';
import { config } from '@/config';
import type { Usuario, Sesion } from '@/types';

/**
 * Valida credenciales contra usr_m.
 * Los nombres de campo (usuario/contraseña) vienen de la config del cliente
 * (`login.userField` / `login.passField`), ya que dependen de los campos que
 * se expongan en el recurso usr_m del API.
 */
export async function autenticar(nombre: string, clave: string): Promise<Sesion> {
  const { userField, passField } = config.login;
  const { items } = await list<Usuario>('usr_m', { pageSize: 1000 });

  const n = nombre.trim().toLowerCase();
  const match = items.find(
    (u) => String(u[userField] ?? '').trim().toLowerCase() === n
  );

  if (!match) throw new Error('Usuario no encontrado');
  if (String(match[passField] ?? '') !== clave) throw new Error('Contraseña incorrecta');

  return {
    id: match.id,
    nombre: String(match[userField] ?? `Usuario ${match.id}`),
  };
}
