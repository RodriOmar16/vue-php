import { apiFetch } from './api';

// Función para iniciar sesión
export const iniciarSesion = async (usuario, contrasenia) => {
  const res = await apiFetch('auth.php', {
    method: 'POST',
    body: JSON.stringify({ nombre: usuario, contrasenia }),
  });
  if (res.resultado !== 0 && res.token) {
    localStorage.setItem('token', res.token); // Guardar el token
  }
  return res;
};
export const cerrarSesion = () => {
  localStorage.removeItem('token'); // Eliminar el token
};

// Función para registrarse (si la necesitas)
export const registrarse = async (usuario, email, contrasenia) => {
  const res = await apiFetch('register.php', {
    method: 'POST',
    body: JSON.stringify({ nombre: usuario, email, contrasenia }),
  });
  console.log("authServices - res: ", res)
  if(res.resultado == 1 && res.token){
    localStorage.setItem('token',res.token);
  }
  return res;
};
