/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, p. ej. http://localhost:3000/api */
  readonly VITE_API_URL?: string;
  /** Solo desarrollo (.env.development.local): entrar solo con estas credenciales */
  readonly VITE_DEV_EMAIL?: string;
  readonly VITE_DEV_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
