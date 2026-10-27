<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-2 ga-2">
      <h1 class="text-h5">Mi página</h1>
      <v-spacer />
      <v-btn v-if="urlSitio" variant="tonal" prepend-icon="fa-solid fa-arrow-up-right-from-square" :href="urlSitio" target="_blank" rel="noopener noreferrer">
        Ver mi página
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Elegí qué secciones ven tus clientes en tu página, en qué orden y cómo se ve el encabezado. Los textos de portada, el «sobre nosotros», el contacto y la dirección se cargan en Marca.
    </p>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="cargando && !original" indeterminate class="mb-4" />

    <v-form v-if="original" ref="formulario" @submit.prevent="guardar">
      <v-row>
        <v-col cols="12" lg="8">
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Secciones</v-card-title>
            <v-card-text>
              <p class="text-body-2 text-medium-emphasis mb-2">Prendé las que quieras mostrar y ordenalas con las flechas. Una sección sin contenido no se muestra aunque esté prendida.</p>
              <v-list lines="two" data-testid="secciones">
                <v-list-item v-for="(s, i) in form.secciones" :key="s.tipo" :data-testid="`seccion-${s.tipo}`">
                  <template #prepend>
                    <v-switch
                      v-model="s.visible"
                      :aria-label="`Mostrar ${DATOS_SECCION[s.tipo].titulo}`"
                      color="primary"
                      hide-details
                      density="compact"
                      :disabled="!puedeEditar || guardando || s.tipo === 'salones'"
                      class="mr-3"
                    />
                  </template>
                  <v-list-item-title>{{ DATOS_SECCION[s.tipo].titulo }}</v-list-item-title>
                  <v-list-item-subtitle class="text-wrap">
                    {{ DATOS_SECCION[s.tipo].ayuda }}
                    <v-chip v-if="s.visible && sinContenido(s.tipo)" size="x-small" color="warning" variant="tonal" class="ml-1" :data-testid="`vacia-${s.tipo}`">
                      {{ DATOS_SECCION[s.tipo].falta }}
                    </v-chip>
                  </v-list-item-subtitle>
                  <template v-if="puedeEditar" #append>
                    <v-btn icon variant="text" size="small" :aria-label="`Subir ${DATOS_SECCION[s.tipo].titulo}`" :disabled="i === 0 || guardando" @click="mover(form.secciones, i, -1)">
                      <v-icon>fa-solid fa-arrow-up</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" :aria-label="`Bajar ${DATOS_SECCION[s.tipo].titulo}`" :disabled="i === form.secciones.length - 1 || guardando" @click="mover(form.secciones, i, 1)">
                      <v-icon>fa-solid fa-arrow-down</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Encabezado</v-card-title>
            <v-card-text>
              <v-radio-group v-model="form.encabezado" :disabled="!puedeEditar || guardando" hide-details>
                <v-radio value="foto" label="Con la foto de portada de tu salón (si no hay foto, usa el color de tu marca)" />
                <v-radio value="color" label="Solo con el color de tu marca" />
              </v-radio-group>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Ubicación</v-card-title>
            <v-card-text>
              <v-switch v-model="form.mostrarMapa" label="Mostrar el mapa" color="primary" hide-details density="compact" :disabled="!puedeEditar || guardando" />
              <p class="text-body-2 text-medium-emphasis mt-1">
                El mapa se arma solo con la dirección que cargaste en Marca, y hay un botón «Cómo llegar». Para que se vea, prendé también la sección «Ubicación».
              </p>
              <v-alert v-if="marcaCargada && !direccion" type="info" variant="tonal" density="compact" class="mt-3" data-testid="sin-direccion">
                Todavía no cargaste tu dirección: cargala en Marca para que aparezca la ubicación.
              </v-alert>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Preguntas frecuentes</v-card-title>
            <v-card-text>
              <p class="text-body-2 text-medium-emphasis mb-3">Hasta {{ MAXIMO_PREGUNTAS }} preguntas, en texto simple. Por ejemplo: «¿Hay estacionamiento?» o «¿Se puede llevar torta?».</p>
              <p v-if="form.preguntas.length === 0" class="text-body-2 text-medium-emphasis" data-testid="sin-preguntas">Todavía no cargaste preguntas.</p>
              <div v-for="(p, i) in form.preguntas" :key="p.clave" class="pregunta mb-4" :data-testid="`pregunta-${i}`">
                <div class="d-flex align-start ga-2">
                  <div class="flex-grow-1">
                    <v-text-field v-model="p.pregunta" :label="`Pregunta ${i + 1}`" counter="150" :rules="[requerido, regla.pregunta]" :disabled="!puedeEditar || guardando" density="compact" />
                    <v-textarea v-model="p.respuesta" :label="`Respuesta ${i + 1}`" rows="2" auto-grow counter="1000" :rules="[requerido, maximo(1000)]" :disabled="!puedeEditar || guardando" density="compact" />
                  </div>
                  <div v-if="puedeEditar" class="d-flex flex-column">
                    <v-btn icon variant="text" size="small" :aria-label="`Subir la pregunta ${i + 1}`" :disabled="i === 0 || guardando" @click="mover(form.preguntas, i, -1)"><v-icon>fa-solid fa-arrow-up</v-icon></v-btn>
                    <v-btn icon variant="text" size="small" :aria-label="`Bajar la pregunta ${i + 1}`" :disabled="i === form.preguntas.length - 1 || guardando" @click="mover(form.preguntas, i, 1)"><v-icon>fa-solid fa-arrow-down</v-icon></v-btn>
                    <v-btn icon variant="text" size="small" color="error" :aria-label="`Quitar la pregunta ${i + 1}`" :disabled="guardando" @click="quitarPregunta(i)"><v-icon>fa-solid fa-trash</v-icon></v-btn>
                  </div>
                </div>
              </div>
              <v-btn v-if="puedeEditar" variant="tonal" prepend-icon="fa-solid fa-plus" :disabled="form.preguntas.length >= MAXIMO_PREGUNTAS || guardando" @click="agregarPregunta">
                Agregar una pregunta
              </v-btn>
              <span v-if="form.preguntas.length >= MAXIMO_PREGUNTAS" class="text-caption text-medium-emphasis ml-2">Llegaste al máximo.</span>
            </v-card-text>
          </v-card>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3" role="alert">{{ error }}</v-alert>
          <div v-if="puedeEditar" class="d-flex align-center ga-3">
            <v-btn color="primary" variant="flat" type="submit" :loading="guardando" :disabled="!hayCambios">Guardar cambios</v-btn>
            <v-btn variant="text" :disabled="!hayCambios || guardando" @click="restaurar">Descartar</v-btn>
            <span v-if="hayCambios" class="text-caption text-warning" data-testid="sin-guardar">Hay cambios sin guardar</span>
          </div>
        </v-col>
      </v-row>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { actualizarLanding, obtenerLanding } from '@/api/landing';
import { obtenerMarca } from '@/api/marca';
import type { CambiosLanding, EncabezadoLanding, LandingConfig, MarcaEmpresa, SeccionLanding } from '@/api/tipos';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { maximo, requerido } from '@/utils/reglas';

const MAXIMO_PREGUNTAS = 10;

const DATOS_SECCION: Record<SeccionLanding, { titulo: string; ayuda: string; falta: string }> = {
  salones: { titulo: 'Salones', ayuda: 'Tus salones con su foto y el botón para reservar. Siempre se muestra.', falta: '' },
  galeria: { titulo: 'Galería de fotos', ayuda: 'Usa las fotos que ya subiste a tus salones (hasta 12).', falta: 'Subí fotos a tus salones' },
  nosotros: { titulo: 'Sobre nosotros', ayuda: 'El texto que cargaste en Marca.', falta: 'Cargalo en Marca' },
  preguntas: { titulo: 'Preguntas frecuentes', ayuda: 'Las preguntas y respuestas de más abajo.', falta: 'Agregá al menos una pregunta' },
  ubicacion: { titulo: 'Ubicación', ayuda: 'La dirección de Marca, con el mapa si lo prendés.', falta: 'Cargá tu dirección en Marca' },
  contacto: { titulo: 'Contacto', ayuda: 'Teléfono, email y redes que cargaste en Marca.', falta: 'Cargalo en Marca' },
};

interface PreguntaForm {
  /** identifica la fila mientras se edita (no se guarda) */
  clave: number;
  pregunta: string;
  respuesta: string;
}

const sesion = useSesionStore();
const avisos = genericosStore();
const puedeEditar = computed(() => sesion.esDueno);

const sitio = (import.meta.env.VITE_SITIO_URL as string | undefined) ?? 'http://localhost:3001';
const slug = computed(() => sesion.usuario?.empresa?.slug ?? null);
const urlSitio = computed(() => (slug.value ? `${sitio.replace(/\/+$/, '')}/${slug.value}` : null));

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const original = ref<LandingConfig | null>(null);
const marca = ref<MarcaEmpresa | null>(null);
const marcaCargada = computed(() => marca.value !== null);
const cargando = ref(false);
const guardando = ref(false);
const errorCarga = ref('');
const error = ref('');

let siguienteClave = 0;
const form = reactive({
  encabezado: 'foto' as EncabezadoLanding,
  secciones: [] as LandingConfig['secciones'],
  preguntas: [] as PreguntaForm[],
  mostrarMapa: false,
});

const regla = {
  pregunta: (v: string) => (v ?? '').trim().length >= 3 || 'Escribí al menos 3 caracteres',
};
const limpio = (v: string | null | undefined) => (v ?? '').trim();
const direccion = computed(() => limpio(marca.value?.direccion));

/** ¿La sección está prendida pero todavía no tiene nada para mostrar? (el sitio la va a esconder) */
const sinContenido = (tipo: SeccionLanding): boolean => {
  if (tipo === 'preguntas') return form.preguntas.every((p) => limpio(p.pregunta) === '' || limpio(p.respuesta) === '');
  if (!marca.value) return false; // sin los datos de Marca no se puede saber: no se avisa nada
  const m = marca.value;
  if (tipo === 'nosotros') return limpio(m.sobreNosotros) === '';
  if (tipo === 'ubicacion') return limpio(m.direccion) === '';
  if (tipo === 'contacto') return !limpio(m.telefono) && !limpio(m.email) && !Object.values(m.redes ?? {}).some((u) => limpio(u) !== '');
  return false; // salones y galería dependen de las fotos de los salones: se ve en la página
};

function rellenar(l: LandingConfig) {
  form.encabezado = l.encabezado;
  form.secciones = l.secciones.map((s) => ({ ...s }));
  form.preguntas = l.preguntas.map((p) => ({ clave: ++siguienteClave, ...p }));
  form.mostrarMapa = l.mostrarMapa;
}

const preguntasLimpias = () => form.preguntas.map((p) => ({ pregunta: limpio(p.pregunta), respuesta: limpio(p.respuesta) }));

/** Solo lo que cambió. Las listas viajan completas (la API las reemplaza). */
const cambios = computed<CambiosLanding>(() => {
  const o = original.value;
  if (!o) return {};
  const res: CambiosLanding = {};
  if (form.encabezado !== o.encabezado) res.encabezado = form.encabezado;
  if (JSON.stringify(form.secciones) !== JSON.stringify(o.secciones)) res.secciones = form.secciones.map((s) => ({ ...s }));
  if (JSON.stringify(preguntasLimpias()) !== JSON.stringify(o.preguntas)) res.preguntas = preguntasLimpias();
  if (form.mostrarMapa !== o.mostrarMapa) res.mostrarMapa = form.mostrarMapa;
  return res;
});
const hayCambios = computed(() => Object.keys(cambios.value).length > 0);

function mover<T>(lista: T[], desde: number, paso: -1 | 1) {
  const hasta = desde + paso;
  if (hasta < 0 || hasta >= lista.length) return;
  [lista[desde], lista[hasta]] = [lista[hasta]!, lista[desde]!];
}
const agregarPregunta = () => {
  if (form.preguntas.length < MAXIMO_PREGUNTAS) form.preguntas.push({ clave: ++siguienteClave, pregunta: '', respuesta: '' });
};
const quitarPregunta = (i: number) => form.preguntas.splice(i, 1);

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  errorCarga.value = '';
  cargando.value = true;
  try {
    original.value = await obtenerLanding();
    rellenar(original.value);
    // la marca solo sirve para avisar qué secciones quedarían vacías: si falla, la pantalla funciona igual
    obtenerMarca().then((m) => (marca.value = m), () => undefined);
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
    original.value = await actualizarLanding(cambios.value);
    rellenar(original.value);
    avisos.setSnackBar('Se guardaron los cambios de tu página. Pueden tardar hasta un minuto en verse.', 'success');
  } catch (e) {
    error.value = mensajeDe(e);
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>
