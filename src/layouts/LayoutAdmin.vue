<template>
  <v-app-bar color="primary" density="comfortable">
    <v-app-bar-nav-icon v-if="!sesion.debeCambiarPassword" aria-label="Abrir menú" @click="drawer = !drawer" />
    <v-app-bar-title>{{ titulo }}</v-app-bar-title>
    <v-spacer />
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" prepend-icon="fa-solid fa-circle-user">
          <span class="d-none d-sm-inline">{{ sesion.usuario?.nombre }}</span>
          <span class="d-none d-md-inline text-caption ml-2">· {{ etiquetaRol }}</span>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item prepend-icon="fa-solid fa-key" title="Cambiar contraseña" :to="{ name: 'admin-cambiar-password' }" />
        <v-list-item prepend-icon="fa-solid fa-arrow-right-from-bracket" title="Cerrar sesión" @click="salir" />
      </v-list>
    </v-menu>
  </v-app-bar>

  <!-- Con clave temporal solo se puede cambiar la clave: no se muestra el menú -->
  <v-navigation-drawer v-if="!sesion.debeCambiarPassword" v-model="drawer" :permanent="mdAndUp" :temporary="!mdAndUp">
    <v-list nav>
      <v-list-item
        v-for="item in items"
        :key="item.titulo"
        :to="item.to"
        :prepend-icon="item.icono"
        :title="item.titulo"
      />
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <v-container fluid class="pa-4 pa-md-6">
      <RouterView />
    </v-container>
  </v-main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { ETIQUETA_ROL } from '@/api/tipos';
import { impedirAutoLogin } from '@/router/autologin';
import { menuPara } from '@/router/menu';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();
const router = useRouter();
const { mdAndUp } = useDisplay();
const drawer = ref(mdAndUp.value);

const titulo = computed(() => sesion.usuario?.empresa?.nombre ?? 'Administración de la plataforma');
const etiquetaRol = computed(() => (sesion.rol ? ETIQUETA_ROL[sesion.rol] : ''));
const items = computed(() => menuPara(sesion.rol));

const salir = async () => {
  impedirAutoLogin(); // en desarrollo, que el login automático no te vuelva a meter
  sesion.cerrarSesion();
  await router.replace({ name: 'admin-login' });
};
</script>
