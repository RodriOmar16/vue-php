<template>
  <div style="margin-top: 70px;">
    Bienvenid@: {{ auth.usuario ? auth.usuario : auth.username }}, Autenticado?  {{ auth.isAuthenticated }}
  </div>
</template>
<script setup>
  import { useAuthStore } from '@/store/auth';
  import { onMounted, ref } from 'vue';
  import { genericosStore } from '@/store/genericos';

  const auth         = useAuthStore();
  const useGenericos = genericosStore();

  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    useGenericos.loading = true;
    //consultas a la api
    useGenericos.loading = false;
  };
</script>