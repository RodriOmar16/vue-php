<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-2 ga-2">
      <h1 class="text-h5">Marca y contacto</h1>
      <v-spacer />
      <v-btn v-if="urlSitio" variant="tonal" prepend-icon="fa-solid fa-arrow-up-right-from-square" :href="urlSitio" target="_blank" rel="noopener noreferrer">
        Ver mi página
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Lo que cargues acá es lo que ven tus clientes en tu página pública: tu logo, tus colores, los textos de la portada y cómo contactarte.
    </p>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="cargando && !original" indeterminate class="mb-4" />

    <v-row v-if="original">
      <v-col cols="12" lg="7">
        <v-form ref="formulario" @submit.prevent="guardar">
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Identidad</v-card-title>
            <v-card-text>
              <v-text-field v-model="form.nombre" label="Nombre comercial" :rules="[requerido, maximo(150)]" :disabled="!puedeEditar || guardando" />
              <div class="d-flex align-center ga-4 mt-2">
                <v-avatar size="72" color="surface-variant" rounded="lg">
                  <v-img v-if="logoActual" :src="logoActual" alt="Logo actual" />
                  <v-icon v-else>fa-solid fa-image</v-icon>
                </v-avatar>
                <div v-if="puedeEditar">
                  <v-btn size="small" variant="tonal" prepend-icon="fa-solid fa-upload" :loading="subiendoLogo" :disabled="guardando" @click="entradaLogo?.click()">
                    {{ logoActual ? 'Cambiar logo' : 'Subir logo' }}
                  </v-btn>
                  <v-btn v-if="logoActual" size="small" variant="text" class="ml-2" :disabled="subiendoLogo || guardando" @click="quitarElLogo">Quitar</v-btn>
                  <input ref="entradaLogo" type="file" class="d-none" accept="image/jpeg,image/png,image/webp" data-testid="entrada-logo" @change="alElegirLogo" />
                  <div class="text-caption text-medium-emphasis mt-1">JPG, PNG o WebP de hasta 5 MB. Se ve mejor cuadrado y sobre fondo transparente.</div>
                </div>
              </div>
              <v-alert v-if="errorLogo" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ errorLogo }}</v-alert>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Colores</v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="c in coloresCampos" :key="c.campo" cols="12" sm="6">
                  <v-text-field
                    v-model="form[c.campo]"
                    :label="c.etiqueta"
                    :placeholder="c.porDefecto"
                    :hint="c.ayuda"
                    persistent-hint
                    :rules="[regla.color]"
                    :disabled="!puedeEditar || guardando"
                    clearable
                  >
                    <template #append-inner>
                      <input
                        type="color"
                        class="selector-color"
                        :value="colorOPorDefecto(form[c.campo], c.porDefecto)"
                        :aria-label="`Elegir ${c.etiqueta.toLowerCase()}`"
                        :disabled="!puedeEditar || guardando"
                        @input="alElegirColor(c.campo, $event)"
                      />
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Portada y presentación</v-card-title>
            <v-card-text>
              <v-text-field v-model="form.tituloHero" label="Título de la portada" placeholder="Festejá en tu salón" :rules="[maximo(200)]" :disabled="!puedeEditar || guardando" />
              <v-textarea v-model="form.textoHero" label="Texto debajo del título" rows="2" auto-grow :rules="[maximo(1000)]" :disabled="!puedeEditar || guardando" />
              <v-textarea v-model="form.sobreNosotros" label="Sobre nosotros" rows="4" auto-grow :rules="[maximo(5000)]" :disabled="!puedeEditar || guardando" />
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Contacto</v-card-title>
            <v-card-text>
              <v-text-field v-model="form.direccion" label="Dirección" :rules="[maximo(255)]" :disabled="!puedeEditar || guardando" />
              <v-row>
                <v-col cols="12" sm="6"><v-text-field v-model="form.telefono" label="Teléfono" :rules="[maximo(30)]" :disabled="!puedeEditar || guardando" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.email" label="Email de contacto" type="email" :rules="[regla.email]" :disabled="!puedeEditar || guardando" /></v-col>
              </v-row>
              <div class="text-subtitle-2 mt-2 mb-1">Redes</div>
              <v-row dense>
                <v-col v-for="campo in camposRedes" :key="campo.clave" cols="12" sm="6">
                  <CampoRed
                    :etiqueta="campo.etiqueta"
                    :model-value="form.redes[campo.clave]"
                    :regla="regla.url"
                    :deshabilitado="!puedeEditar || guardando"
                    @update:model-value="actualizarRed(campo.clave, $event)"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Cobro de la seña por transferencia</v-card-title>
            <v-card-text>
              <p class="text-body-2 text-medium-emphasis mb-3">
                Tus clientes ven estos datos al reservar para transferir la seña. Después te mandan el comprobante y vos lo aprobás desde Reservas.
                Hace falta al menos el CBU o el alias.
              </p>
              <v-row dense>
                <v-col cols="12" sm="6"><v-text-field v-model="form.banco.titular" label="Titular de la cuenta" :rules="[maximo(100)]" :disabled="!puedeEditar || guardando" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.banco.banco" label="Banco" :rules="[maximo(60)]" :disabled="!puedeEditar || guardando" /></v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.banco.cbu" label="CBU o CVU" inputmode="numeric" counter="22" :rules="[regla.cbu, regla.cbuOAlias]" :disabled="!puedeEditar || guardando" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.banco.alias" label="Alias" :rules="[regla.alias]" :disabled="!puedeEditar || guardando" />
                </v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.banco.cuit" label="CUIT / CUIL (opcional)" :rules="[regla.cuit]" :disabled="!puedeEditar || guardando" /></v-col>
              </v-row>
              <v-textarea
                v-model="form.banco.instrucciones"
                label="Instrucciones para el cliente (opcional)"
                placeholder="Ej.: Transferí la seña y subí el comprobante desde la página de tu reserva."
                rows="2"
                auto-grow
                :rules="[maximo(500)]"
                :disabled="!puedeEditar || guardando"
              />
            </v-card-text>
          </v-card>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3" role="alert">{{ error }}</v-alert>
          <div v-if="puedeEditar" class="d-flex align-center ga-3">
            <v-btn color="primary" variant="flat" type="submit" :loading="guardando" :disabled="!hayCambios">Guardar cambios</v-btn>
            <v-btn variant="text" :disabled="!hayCambios || guardando" @click="restaurar">Descartar</v-btn>
            <span v-if="hayCambios" class="text-caption text-warning" data-testid="sin-guardar">Hay cambios sin guardar</span>
          </div>
        </v-form>
      </v-col>

      <v-col cols="12" lg="5">
        <div class="vista-previa">
          <div class="text-subtitle-2 mb-2">Así se ve tu portada</div>
          <div class="portada" :style="{ backgroundColor: previa.principal, color: previa.texto }" data-testid="vista-previa">
            <div class="d-flex align-center ga-2 mb-4">
              <img v-if="logoActual" :src="logoActual" alt="" class="logo-previa" />
              <strong>{{ form.nombre.trim() || 'Tu salón' }}</strong>
            </div>
            <div class="titulo-previa">{{ form.tituloHero.trim() || `Festejá en ${form.nombre.trim() || 'tu salón'}` }}</div>
            <p class="mt-2 mb-4">{{ form.textoHero.trim() || 'Conocé nuestros salones, combos y juegos para que tu fiesta sea inolvidable.' }}</p>
            <span class="boton-previa" :style="{ backgroundColor: previa.acento, color: previa.textoAcento }">Ver el salón</span>
          </div>
          <p class="text-caption text-medium-emphasis mt-2">
            El color del texto se elige solo para que se lea bien sobre el color que pongas.
          </p>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { actualizarMarca, BYTES_MAXIMOS_LOGO, obtenerMarca, quitarLogo, subirLogo, TIPOS_ACEPTADOS_LOGO } from '@/api/marca';
import { type CambiosMarca, type MarcaEmpresa, REDES, type Red } from '@/api/tipos';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { COLOR_ACENTO_POR_DEFECTO, COLOR_PRINCIPAL_POR_DEFECTO, colorLegible, colorOPorDefecto, esColorHex } from '@/utils/color';
import { email, maximo, requerido } from '@/utils/reglas';
import CampoRed from './CampoRed.vue';

const ETIQUETA_RED: Record<Red, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp (enlace)',
  web: 'Sitio web',
};

const sesion = useSesionStore();
const avisos = genericosStore();
const puedeEditar = computed(() => sesion.esDueno);

// Dirección de tu página pública (el sitio de cara al cliente corre aparte)
const sitio = (import.meta.env.VITE_SITIO_URL as string | undefined) ?? 'http://localhost:3001';
const urlSitio = computed(() => {
  const slug = original.value?.slug;
  return slug ? `${sitio.replace(/\/+$/, '')}/${slug}` : '';
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const entradaLogo = ref<HTMLInputElement | null>(null);
const original = ref<MarcaEmpresa | null>(null);
const cargando = ref(false);
const guardando = ref(false);
const subiendoLogo = ref(false);
const errorCarga = ref('');
const error = ref('');
const errorLogo = ref('');

type CampoTexto = 'nombre' | 'tituloHero' | 'textoHero' | 'sobreNosotros' | 'direccion' | 'telefono' | 'email' | 'colorPrimario' | 'colorSecundario';
const CAMPOS_TEXTO: CampoTexto[] = ['nombre', 'tituloHero', 'textoHero', 'sobreNosotros', 'direccion', 'telefono', 'email', 'colorPrimario', 'colorSecundario'];

type CampoBanco = 'titular' | 'banco' | 'cbu' | 'alias' | 'cuit' | 'instrucciones';
const CAMPOS_BANCO: CampoBanco[] = ['titular', 'banco', 'cbu', 'alias', 'cuit', 'instrucciones'];

const vacioRedes = () => Object.fromEntries(REDES.map((r) => [r, ''])) as Record<Red, string>;
const form = reactive({
  nombre: '', tituloHero: '', textoHero: '', sobreNosotros: '', direccion: '', telefono: '', email: '',
  colorPrimario: '', colorSecundario: '', redes: vacioRedes(),
  banco: { titular: '', banco: '', cbu: '', alias: '', cuit: '', instrucciones: '' } as Record<CampoBanco, string>,
});

const coloresCampos = [
  { campo: 'colorPrimario' as const, etiqueta: 'Color principal', porDefecto: COLOR_PRINCIPAL_POR_DEFECTO, ayuda: 'Portada, botones y detalles' },
  { campo: 'colorSecundario' as const, etiqueta: 'Color de acento', porDefecto: COLOR_ACENTO_POR_DEFECTO, ayuda: 'Para resaltar. Vacío = el color por defecto' },
];

const regla = {
  color: (v: string | null) => !v || esColorHex(v.trim()) || 'Un color de 6 dígitos, por ejemplo #7c3aed',
  email: (v: string) => !v || email(v),
  url: (v: string) => !v || /^https?:\/\/\S+\.\S+/.test(v.trim()) || 'Un enlace que empiece con https://',
  cbu: (v: string) => !v || /^[0-9]{22}$/.test(v.trim()) || 'El CBU o CVU tiene 22 números',
  alias: (v: string) => !v || /^[a-zA-Z0-9.-]{6,20}$/.test(v.trim()) || 'Entre 6 y 20 caracteres: letras, números, punto o guion',
  cuit: (v: string) => !v || /^[0-9]{2}-?[0-9]{8}-?[0-9]$/.test(v.trim()) || 'Un CUIT de 11 números, por ejemplo 30-12345678-9',
  /** si se cargó cualquier dato bancario, el cliente necesita al menos una forma de transferir */
  cbuOAlias: () => !hayDatosBancarios.value || !!limpio(form.banco.cbu) || !!limpio(form.banco.alias) || 'Indicá el CBU o el alias',
};

const alElegirColor = (campo: 'colorPrimario' | 'colorSecundario', evento: Event) => {
  form[campo] = (evento.target as HTMLInputElement).value;
};
const camposRedes = REDES.map((clave) => ({ clave, etiqueta: ETIQUETA_RED[clave] }));
const actualizarRed = (red: Red, valor: string | null) => {
  form.redes[red] = valor ?? '';
};

function rellenar(m: MarcaEmpresa) {
  form.nombre = m.nombre;
  for (const campo of CAMPOS_TEXTO.filter((c) => c !== 'nombre')) form[campo] = m[campo] ?? '';
  for (const r of REDES) form.redes[r] = m.redes?.[r] ?? '';
  for (const k of CAMPOS_BANCO) form.banco[k] = m.datosTransferencia?.[k] ?? '';
}

const limpio = (v: string | null | undefined) => (v ?? '').trim();
const hayDatosBancarios = computed(() => CAMPOS_BANCO.some((k) => limpio(form.banco[k]) !== ''));
const bancoLimpio = (datos: Partial<Record<CampoBanco, string>> | null | undefined) =>
  Object.fromEntries(CAMPOS_BANCO.map((k) => [k, limpio(datos?.[k])]).filter(([, v]) => v !== ''));

/** Sólo lo que cambió: lo vaciado se manda como null (la API lo interpreta como «quitar»). */
const cambios = computed<CambiosMarca>(() => {
  const o = original.value;
  if (!o) return {};
  const res: Record<string, unknown> = {};
  if (limpio(form.nombre) !== o.nombre) res.nombre = limpio(form.nombre);
  for (const campo of CAMPOS_TEXTO.filter((c) => c !== 'nombre')) {
    const nuevo = limpio(form[campo]);
    if (nuevo !== limpio(o[campo])) res[campo] = nuevo === '' ? null : campo.startsWith('color') ? nuevo.toLowerCase() : nuevo;
  }
  const redesNuevas = Object.fromEntries(REDES.map((r) => [r, limpio(form.redes[r])]).filter(([, url]) => url !== ''));
  const redesAntes = Object.fromEntries(REDES.map((r) => [r, limpio(o.redes?.[r])]).filter(([, url]) => url !== ''));
  if (JSON.stringify(redesNuevas) !== JSON.stringify(redesAntes)) {
    res.redes = Object.keys(redesNuevas).length === 0 ? null : redesNuevas; // la API reemplaza todas las redes juntas
  }
  const bancoNuevo = bancoLimpio(form.banco);
  if (JSON.stringify(bancoNuevo) !== JSON.stringify(bancoLimpio(o.datosTransferencia))) {
    res.datosTransferencia = Object.keys(bancoNuevo).length === 0 ? null : bancoNuevo; // la API reemplaza todos los datos juntos
  }
  return res as CambiosMarca;
});
const hayCambios = computed(() => Object.keys(cambios.value).length > 0);

const logoActual = computed(() => original.value?.logoUrl ?? null);

const previa = computed(() => {
  const principal = colorOPorDefecto(form.colorPrimario, COLOR_PRINCIPAL_POR_DEFECTO);
  const acento = colorOPorDefecto(form.colorSecundario, COLOR_ACENTO_POR_DEFECTO);
  return { principal, acento, texto: colorLegible(principal), textoAcento: colorLegible(acento) };
});

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    original.value = await obtenerMarca();
    rellenar(original.value);
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

function restaurar() {
  if (original.value) rellenar(original.value);
  formulario.value?.resetValidation();
  error.value = '';
}

async function guardar() {
  error.value = '';
  if (!hayCambios.value) return;
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  guardando.value = true;
  try {
    original.value = await actualizarMarca(cambios.value);
    rellenar(original.value);
    avisos.setSnackBar('Se guardaron los cambios de tu marca.', 'success');
    await sesion.cargarPerfil(); // el nombre de la empresa se muestra en el panel
  } catch (e) {
    error.value = mensajeDe(e);
  } finally {
    guardando.value = false;
  }
}

async function alElegirLogo(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = '';
  if (!archivo) return;
  errorLogo.value = '';
  if (!TIPOS_ACEPTADOS_LOGO.includes(archivo.type)) {
    errorLogo.value = 'El logo tiene que ser JPG, PNG o WebP.';
    return;
  }
  if (archivo.size > BYTES_MAXIMOS_LOGO) {
    errorLogo.value = 'El logo supera los 5 MB.';
    return;
  }
  subiendoLogo.value = true;
  try {
    // el logo se guarda al instante; lo que se esté escribiendo en el formulario no se pierde
    original.value = { ...original.value!, logoUrl: (await subirLogo(archivo)).logoUrl };
    avisos.setSnackBar('Logo actualizado.', 'success');
  } catch (e) {
    errorLogo.value = mensajeDe(e);
  } finally {
    subiendoLogo.value = false;
  }
}

async function quitarElLogo() {
  errorLogo.value = '';
  subiendoLogo.value = true;
  try {
    original.value = { ...original.value!, logoUrl: (await quitarLogo()).logoUrl };
    avisos.setSnackBar('Logo quitado.', 'success');
  } catch (e) {
    errorLogo.value = mensajeDe(e);
  } finally {
    subiendoLogo.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.selector-color {
  width: 32px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}
.vista-previa {
  position: sticky;
  top: 80px;
}
.portada {
  border-radius: 16px;
  padding: 24px;
  transition: background-color 0.2s;
}
.titulo-previa {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.6rem;
  line-height: 1.2;
}
.logo-previa {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.boton-previa {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
