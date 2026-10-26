<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-2 mb-2">
      <h3 class="text-subtitle-1">Fotos</h3>
      <span class="text-caption text-medium-emphasis" data-testid="contador-fotos">{{ medios.length }} de {{ tope }}</span>
      <v-spacer />
      <template v-if="editable">
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          prepend-icon="fa-solid fa-image"
          :loading="subiendo"
          :disabled="lleno || trabajando"
          @click="entrada?.click()"
        >
          Agregar fotos
        </v-btn>
        <input
          ref="entrada"
          type="file"
          class="d-none"
          accept="image/jpeg,image/png,image/webp"
          multiple
          data-testid="entrada-fotos"
          @change="alElegir"
        />
      </template>
    </div>
    <p v-if="editable" class="text-caption text-medium-emphasis mb-2">
      JPG, PNG o WebP de hasta 8 MB. Se optimizan solas. La primera es la principal: la que se ve en las listas.
    </p>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-2" role="alert" closable @click:close="error = ''">{{ error }}</v-alert>
    <v-progress-linear v-if="cargando" indeterminate class="mb-2" />

    <p v-if="!cargando && medios.length === 0" class="text-body-2 text-medium-emphasis" data-testid="sin-fotos">
      Todavía no hay fotos.
    </p>

    <v-row dense>
      <v-col v-for="(m, i) in medios" :key="m.id" cols="6" sm="4">
        <v-card variant="outlined" :data-testid="`foto-${m.id}`">
          <div class="miniatura">
            <img :src="m.url" :alt="m.alt || `Foto ${i + 1}`" loading="lazy" />
            <v-chip v-if="m.esPortada" size="x-small" color="primary" class="insignia">Principal</v-chip>
          </div>
          <div v-if="m.alt" class="text-caption px-2 pt-1 text-truncate">{{ m.alt }}</div>
          <v-card-actions v-if="editable" class="px-1 py-0 flex-wrap">
            <v-btn size="x-small" variant="text" icon :disabled="i === 0 || trabajando" :aria-label="`Mover la foto ${i + 1} antes`" @click="mover(i, -1)">
              <v-icon>fa-solid fa-arrow-left</v-icon>
            </v-btn>
            <v-btn size="x-small" variant="text" icon :disabled="i === medios.length - 1 || trabajando" :aria-label="`Mover la foto ${i + 1} después`" @click="mover(i, 1)">
              <v-icon>fa-solid fa-arrow-right</v-icon>
            </v-btn>
            <v-btn v-if="!m.esPortada" size="x-small" variant="text" icon :disabled="trabajando" :aria-label="`Hacer principal la foto ${i + 1}`" @click="hacerPrincipal(m)">
              <v-icon>fa-regular fa-star</v-icon><v-tooltip activator="parent" location="top">Hacer principal</v-tooltip>
            </v-btn>
            <v-btn size="x-small" variant="text" icon :disabled="trabajando" :aria-label="`Describir la foto ${i + 1}`" @click="abrirAlt(m)">
              <v-icon>fa-solid fa-pen</v-icon><v-tooltip activator="parent" location="top">Texto descriptivo</v-tooltip>
            </v-btn>
            <v-btn size="x-small" variant="text" icon :disabled="trabajando" :aria-label="`Borrar la foto ${i + 1}`" @click="pedirBorrar(m)">
              <v-icon>fa-solid fa-trash</v-icon><v-tooltip activator="parent" location="top">Borrar</v-tooltip>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="edicionAlt.visible" max-width="460">
      <v-card>
        <v-card-title>Texto descriptivo</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">Describe la foto para quienes no pueden verla y para los buscadores. Ej.: «Salón con mesas para 40 personas».</p>
          <v-text-field v-model="edicionAlt.texto" label="Descripción de la foto" :rules="[maximo(255)]" autofocus @keydown.enter.prevent="guardarAlt" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="edicionAlt.visible = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="trabajando" :disabled="edicionAlt.texto.length > 255" @click="guardarAlt">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ModalConfirmar
      v-model="borrado.visible"
      titulo="Borrar foto"
      mensaje="La foto se elimina definitivamente. Si era la principal, la siguiente pasa a serlo."
      color="warning"
      icono="fa-solid fa-trash"
      texto-confirmar="Borrar"
      :cargando="trabajando"
      @confirmar="borrar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { actualizarMedio, BYTES_MAXIMOS, eliminarMedio, listarMedios, MAXIMO_FOTOS, ordenarMedios, subirMedio, TIPOS_ACEPTADOS } from '@/api/medios';
import { ApiError } from '@/api/http';
import type { Medio, TipoMedio } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { maximo } from '@/utils/reglas';

const props = defineProps<{ tipo: TipoMedio; id: number; editable: boolean }>();

const medios = ref<Medio[]>([]);
const cargando = ref(false);
const subiendo = ref(false);
const trabajando = ref(false);
const error = ref('');
const entrada = ref<HTMLInputElement | null>(null);
const edicionAlt = reactive({ visible: false, medio: null as Medio | null, texto: '' });
const borrado = reactive({ visible: false, medio: null as Medio | null });

const tope = computed(() => MAXIMO_FOTOS[props.tipo]);
const lleno = computed(() => medios.value.length >= tope.value);
defineExpose({ recargar: () => cargar() });

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar(conservarError = false) {
  cargando.value = true;
  if (!conservarError) error.value = '';
  try {
    medios.value = await listarMedios(props.tipo, props.id);
  } catch (e) {
    error.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

/** Valida antes de subir (la API también lo hace) para ahorrar el viaje con archivos obviamente inválidos. */
function problemaDelArchivo(archivo: File): string | null {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) return `«${archivo.name}»: solo se aceptan JPG, PNG o WebP.`;
  if (archivo.size > BYTES_MAXIMOS) return `«${archivo.name}»: supera los 8 MB.`;
  return null;
}

async function alElegir(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivos = [...(input.files ?? [])];
  input.value = ''; // permite volver a elegir el mismo archivo
  if (archivos.length === 0) return;

  error.value = '';
  subiendo.value = true;
  const problemas: string[] = [];
  try {
    for (const archivo of archivos) {
      if (medios.value.length >= tope.value) {
        problemas.push(`Se alcanzó el máximo de ${tope.value} fotos: no se subió «${archivo.name}».`);
        continue;
      }
      const problema = problemaDelArchivo(archivo);
      if (problema) {
        problemas.push(problema);
        continue;
      }
      try {
        medios.value = [...medios.value, await subirMedio(props.tipo, props.id, archivo)];
      } catch (e) {
        problemas.push(`«${archivo.name}»: ${mensajeDe(e)}`);
      }
    }
  } finally {
    subiendo.value = false;
    error.value = problemas.join(' ');
  }
}

async function ejecutar(accion: () => Promise<void>) {
  trabajando.value = true;
  error.value = '';
  try {
    await accion();
  } catch (e) {
    const motivo = mensajeDe(e);
    await cargar(true); // vuelve a mostrar lo que realmente hay guardado, sin perder el aviso
    error.value = motivo;
  } finally {
    trabajando.value = false;
  }
}

const hacerPrincipal = (medio: Medio) =>
  ejecutar(async () => {
    await actualizarMedio(medio.id, { esPortada: true });
    medios.value = medios.value.map((m) => ({ ...m, esPortada: m.id === medio.id }));
  });

const mover = (indice: number, sentido: -1 | 1) =>
  ejecutar(async () => {
    const nueva = [...medios.value];
    [nueva[indice], nueva[indice + sentido]] = [nueva[indice + sentido], nueva[indice]];
    medios.value = await ordenarMedios(props.tipo, props.id, nueva.map((m) => m.id));
  });

function abrirAlt(medio: Medio) {
  Object.assign(edicionAlt, { visible: true, medio, texto: medio.alt ?? '' });
}
const guardarAlt = () =>
  ejecutar(async () => {
    const medio = edicionAlt.medio;
    if (!medio) return;
    const texto = edicionAlt.texto.trim();
    const actualizado = await actualizarMedio(medio.id, { alt: texto === '' ? null : texto });
    medios.value = medios.value.map((m) => (m.id === medio.id ? actualizado : m));
    edicionAlt.visible = false;
  });

function pedirBorrar(medio: Medio) {
  Object.assign(borrado, { visible: true, medio });
}
const borrar = () =>
  ejecutar(async () => {
    const medio = borrado.medio;
    if (!medio) return;
    await eliminarMedio(medio.id);
    borrado.visible = false;
    await cargar(); // la principal pudo haber cambiado
  });

onMounted(() => cargar());
watch(() => [props.tipo, props.id], () => cargar());
</script>

<style scoped>
.miniatura {
  position: relative;
  aspect-ratio: 4 / 3;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.miniatura img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.insignia {
  position: absolute;
  top: 6px;
  left: 6px;
}
</style>
