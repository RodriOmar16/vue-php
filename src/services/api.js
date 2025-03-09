const API_BASE_URL = 'http://localhost/miapp-api/'; // Cambia esto a la URL de tu API 

// Método genérico para peticiones HTTP usando `fetch`
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && {Authorization: `Bearer ${token}` })
    };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options, // Extiende con las opciones proporcionadas (método, body, etc.)
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    return await response.json(); // Retorna la respuesta JSON si todo está bien
  } catch (error) {
    console.error('Error al realizar la petición:', error);
    return { resultado: 0, msj: 'Error de conexión con el servidor' }; // Retorna un error estándar para manejarlo en el frontend
  }
};
