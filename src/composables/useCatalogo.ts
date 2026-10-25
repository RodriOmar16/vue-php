import { computed, onMounted, ref, shallowReactive, type Ref } from 'vue';
import { ApiError } from '@/api/http';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';

export interface ItemCatalogo {
  id: number;
  nombre: string;
  inhabilitado: boolean;
}

interface Opciones<T extends ItemCatalogo> {
  listar: (incluirInhabilitados: boolean) => Promise<T[]>;
  /** Da de baja (true) o reactiva (false) */
  cambiarEstado: (id: number, inhabilitado: boolean) => Promise<unknown>;
  /** «m»: dado de baja / reactivado, «f»: dada de baja / reactivada */
  genero?: 'm' | 'f';
}

export const mensajeDeError = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';

/**
 * Lógica común de las listas de catálogo (alimentos, menús, instalaciones, servicios):
 * carga, filtro «dados de baja», permisos y baja/reactivación con confirmación.
 * Nada se borra: se da de baja, para que lo ya contratado conserve su detalle.
 */
export function useCatalogo<T extends ItemCatalogo>({ listar, cambiarEstado, genero = 'm' }: Opciones<T>) {
  const sesion = useSesionStore();
  const avisos = genericosStore();

  /** El empleado consulta; solo el dueño modifica (la API también lo exige). */
  const puedeEditar = computed(() => sesion.esDueno);

  const items = ref<T[]>([]) as Ref<T[]>;
  const verBajas = ref(false);
  const cargando = ref(false);
  const trabajando = ref(false);
  const errorCarga = ref('');
  // shallowReactive: guarda el item tal cual (con reactive, TypeScript no puede desenvolver el tipo genérico T)
  const confirmar = shallowReactive({ visible: false, baja: true, item: null as T | null });

  const o = genero === 'f' ? 'a' : 'o';

  async function cargar() {
    cargando.value = true;
    errorCarga.value = '';
    try {
      items.value = await listar(verBajas.value);
    } catch (e) {
      errorCarga.value = mensajeDeError(e);
    } finally {
      cargando.value = false;
    }
  }

  function pedirCambioEstado(item: T) {
    confirmar.item = item;
    confirmar.baja = !item.inhabilitado;
    confirmar.visible = true;
  }

  const tituloConfirmar = computed(() => (confirmar.baja ? 'Dar de baja' : 'Reactivar'));
  const mensajeConfirmar = computed(() => {
    const nombre = confirmar.item?.nombre ?? '';
    return confirmar.baja
      ? `«${nombre}» dejará de ofrecerse para reservas nuevas. Lo ya contratado no se modifica y podés reactivarl${o} cuando quieras.`
      : `«${nombre}» volverá a ofrecerse.`;
  });

  async function ejecutarCambioEstado() {
    const item = confirmar.item;
    if (!item) return;
    trabajando.value = true;
    try {
      await cambiarEstado(item.id, confirmar.baja);
      confirmar.visible = false;
      avisos.setSnackBar(
        confirmar.baja ? `«${item.nombre}» fue dad${o} de baja.` : `«${item.nombre}» fue reactivad${o}.`,
        'success',
      );
      await cargar();
    } catch (e) {
      confirmar.visible = false;
      avisos.setSnackBar(mensajeDeError(e), 'error');
    } finally {
      trabajando.value = false;
    }
  }

  async function alGuardar(nombre: string, esNuevo: boolean) {
    avisos.setSnackBar(esNuevo ? `«${nombre}» fue agregad${o}.` : `Se guardaron los cambios de «${nombre}».`, 'success');
    await cargar();
  }

  onMounted(cargar);

  return {
    puedeEditar,
    items,
    verBajas,
    cargando,
    trabajando,
    errorCarga,
    confirmar,
    tituloConfirmar,
    mensajeConfirmar,
    cargar,
    pedirCambioEstado,
    ejecutarCambioEstado,
    alGuardar,
  };
}
