import { apiFetch } from './api';

// Obtener usuarios (con filtros opcionales o todos)
export const obtenerUsuarios = async (filtros = {}) => {
  const queryString = new URLSearchParams(filtros).toString(); // Convierte filtros en una query string
  const endpoint = queryString ? `usuarios.php?${queryString}` : 'usuarios.php';
  return await apiFetch(endpoint, { method: 'GET' });
};

// Crear un nuevo usuario
export const crearUsuario = async (usuario) => {
  return await apiFetch('usuarios.php', {
    method: 'POST',
    body: JSON.stringify(usuario),
  });
};

// Editar un usuario existente
export const editarUsuario = async (id, datos) => {
  return await apiFetch(`usuarios.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
};

// Eliminar un usuario
export const eliminarUsuario = async (id) => {
  return await apiFetch(`usuarios.php?id=${id}`, { method: 'DELETE' });
};
