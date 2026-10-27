import { cliente } from './cliente';
import type { CambiosLanding, LandingConfig } from './tipos';

export const obtenerLanding = () => cliente.get<LandingConfig>('/admin/landing');

export const actualizarLanding = (cambios: CambiosLanding) => cliente.patch<LandingConfig>('/admin/landing', cambios);
