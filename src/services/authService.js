import { apiFetch } from './api';

// Función para iniciar sesión
export const iniciarSesion = async (usuario, contrasenia) => {
  return await apiFetch('auth.php', {
    method: 'POST',
    body: JSON.stringify({ usuario, contrasenia }),
  });
};

// Función para registrarse (si la necesitas)
export const registrarse = async (usuario, email, contrasenia) => {
  return await apiFetch('register.php', {
    method: 'POST',
    body: JSON.stringify({ usuario, email, contrasenia }),
  });
};
