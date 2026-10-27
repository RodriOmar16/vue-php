<template>
  <div class="semana" role="grid" aria-label="Calendario de la semana" data-testid="semana">
    <!-- encabezado: un día por columna -->
    <div class="semana__encabezado" role="row">
      <div class="semana__esquina" role="columnheader" />
      <div v-for="(c, i) in columnas" :key="c.dia" class="semana__dia" :class="{ 'semana__dia--hoy': c.dia === hoy }" role="columnheader">
        <button type="button" class="semana__boton-dia" :aria-label="`Ver el ${formatearDia(c.dia)}`" @click="emit('abrirDia', c.dia)">
          <span class="text-caption">{{ NOMBRES[i] }}</span>
          <span class="semana__numero">{{ Number(c.dia.slice(8)) }}</span>
        </button>
      </div>
    </div>

    <!-- cuerpo: las horas en vertical -->
    <div class="semana__cuerpo" role="row">
      <div class="semana__horas" :style="{ height: `${alto}px` }" aria-hidden="true">
        <span v-for="h in horas" :key="h" class="semana__hora" :style="{ top: `${(h - rango.desde) * PX_POR_HORA}px` }">{{ String(h % 24).padStart(2, '0') }}:00</span>
      </div>

      <div
        v-for="c in columnas"
        :key="c.dia"
        class="semana__columna"
        :class="{ 'semana__columna--hoy': c.dia === hoy }"
        :style="{ height: `${alto}px` }"
        role="gridcell"
        :aria-label="`Reservas del ${formatearDia(c.dia)}`"
        :data-testid="`columna-${c.dia}`"
      >
        <div
          v-for="x in c.cierres"
          :key="`c${x.cierre.id}`"
          class="semana__cierre text-caption"
          :style="estiloTramo(x.tramo)"
          :title="textoCierre(x.cierre)"
          data-testid="cierre-semana"
        >
          <v-icon size="x-small">fa-solid fa-ban</v-icon> {{ x.cierre.motivo || 'Cerrado' }}
        </div>

        <router-link
          v-for="u in c.bloques"
          :key="`${u.bloque.reserva.id}-${c.dia}`"
          :to="{ name: 'admin-reserva-detalle', params: { id: u.bloque.reserva.id } }"
          class="semana__reserva text-caption"
          :class="[`semana__reserva--${u.bloque.reserva.estado}`, { 'semana__reserva--continua': u.bloque.continuacion }]"
          :style="estiloBloque(u)"
          :title="textoReserva(u.bloque)"
          :aria-label="textoReserva(u.bloque)"
          data-testid="bloque"
        >
          <strong>{{ u.bloque.continuacion ? '↳' : u.bloque.reserva.horaInicio }}</strong> {{ u.bloque.reserva.cliente.nombre }}
          <span v-if="mostrarSalon" class="semana__salon">{{ u.bloque.reserva.salon.nombre }}</span>
        </router-link>

        <div v-if="c.dia === ahoraLocal.dia && enRango(ahoraLocal.minutos)" class="semana__ahora" :style="{ top: `${posicion(ahoraLocal.minutos)}px` }" data-testid="ahora" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ETIQUETA_ESTADO_RESERVA, type Bloqueo, type ReservaListada } from '@/api/tipos';
import {
  acomodar, bloquesDelDia, minutoActual, posicionVertical, rangoHorario, tramoDeCierre, type BloqueReserva, type Tramo, type Ubicado,
} from '@/utils/semana';
import { describirRango, formatearDia } from '@/utils/zonaHoraria';

const props = defineProps<{
  /** los 7 días (lunes a domingo) */
  dias: string[];
  reservas: ReservaListada[];
  cierres: Bloqueo[];
  zona: string;
  hoy: string;
  ahora: Date;
  verInactivas: boolean;
}>();
const emit = defineEmits<{ abrirDia: [fecha: string] }>();

const NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
/** altura de cada hora en pantalla */
const PX_POR_HORA = 48;
/** un bloque corto igual tiene que poder leerse y tocarse */
const ALTO_MINIMO = 22;

const columnas = computed(() =>
  props.dias.map((dia) => ({
    dia,
    bloques: acomodar(bloquesDelDia(props.reservas, dia, props.verInactivas)),
    cierres: props.cierres.flatMap((cierre) => {
      const tramo = tramoDeCierre(cierre, props.zona, dia);
      return tramo ? [{ cierre, tramo }] : [];
    }),
  })),
);

const rango = computed(() => {
  const tramos: Tramo[] = columnas.value.flatMap((c) => [...c.bloques.map((u) => u.bloque), ...c.cierres.map((x) => x.tramo)]);
  return rangoHorario(tramos);
});
const horas = computed(() => Array.from({ length: rango.value.hasta - rango.value.desde }, (_, i) => rango.value.desde + i));
const alto = computed(() => (rango.value.hasta - rango.value.desde) * PX_POR_HORA);

const posicion = (minutos: number) => ((minutos - rango.value.desde * 60) * PX_POR_HORA) / 60;
const enRango = (minutos: number) => minutos >= rango.value.desde * 60 && minutos <= rango.value.hasta * 60;
const ahoraLocal = computed(() => minutoActual(props.ahora, props.zona));

/** si se ven reservas de más de un salón, cada bloque dice a cuál pertenece */
const mostrarSalon = computed(() => new Set(props.reservas.map((r) => r.salon.id)).size > 1);

const estiloTramo = (t: Tramo) => {
  const { top, alto: h } = posicionVertical(t, rango.value.desde, PX_POR_HORA);
  return { top: `${top}px`, height: `${h}px` };
};
const estiloBloque = (u: Ubicado<BloqueReserva>) => {
  const { top, alto: h } = posicionVertical(u.bloque, rango.value.desde, PX_POR_HORA);
  return {
    top: `${top}px`,
    height: `${Math.max(h, ALTO_MINIMO)}px`,
    left: `${(u.columna / u.columnas) * 100}%`,
    width: `${100 / u.columnas}%`,
  };
};

const textoReserva = (b: BloqueReserva) => {
  const r = b.reserva;
  return `${r.horaInicio} a ${r.horaFin} · ${r.cliente.nombre} · ${r.salon.nombre} · ${ETIQUETA_ESTADO_RESERVA[r.estado]}${b.continuacion ? ' (viene del día anterior)' : ''}${b.sigueManana ? ' (sigue al día siguiente)' : ''}`;
};
const textoCierre = (c: Bloqueo) => `${c.motivo || 'Cerrado'} · ${describirRango(c.desde, c.hasta, props.zona)}`;
</script>

<style scoped>
.semana {
  --alto-linea: rgba(var(--v-border-color), var(--v-border-opacity));
  border: 1px solid var(--alto-linea);
  border-radius: 8px;
  overflow: auto;
}
.semana__encabezado,
.semana__cuerpo {
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(110px, 1fr));
  min-width: 860px;
}
.semana__encabezado {
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid var(--alto-linea);
}
.semana__dia {
  display: flex;
  justify-content: center;
  padding: 4px;
  border-left: 1px solid var(--alto-linea);
}
.semana__boton-dia {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 2px 10px;
  border-radius: 8px;
}
.semana__numero {
  font-weight: 700;
  font-size: 1.1rem;
}
.semana__dia--hoy .semana__numero {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-radius: 14px;
  min-width: 28px;
  text-align: center;
}
.semana__horas {
  position: relative;
}
.semana__hora {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.semana__columna {
  position: relative;
  border-left: 1px solid var(--alto-linea);
  background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 47px, var(--alto-linea) 47px, var(--alto-linea) 48px);
}
.semana__columna--hoy {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
.semana__cierre {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 0;
  padding: 2px 4px;
  overflow: hidden;
  background: repeating-linear-gradient(45deg, rgba(var(--v-theme-on-surface), 0.08), rgba(var(--v-theme-on-surface), 0.08) 6px, rgba(var(--v-theme-on-surface), 0.16) 6px, rgba(var(--v-theme-on-surface), 0.16) 12px);
}
.semana__reserva {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  padding: 2px 4px;
  overflow: hidden;
  border-left: 3px solid rgb(var(--v-theme-secondary));
  border-radius: 4px;
  text-decoration: none;
  color: inherit;
  background: rgba(var(--v-theme-secondary), 0.25);
}
.semana__reserva--confirmada {
  border-left-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.25);
}
.semana__reserva--pendiente {
  border-left-color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.3);
}
.semana__reserva--cancelada {
  border-left-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.15);
  text-decoration: line-through;
}
.semana__reserva--continua {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.semana__salon {
  display: block;
  opacity: 0.75;
}
.semana__ahora {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  height: 2px;
  background: rgb(var(--v-theme-error));
  pointer-events: none;
}
</style>
