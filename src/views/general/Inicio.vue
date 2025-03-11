<template>
  <div style="margin-top: 70px;">
    Bienvenid@: {{ auth.usuario ? auth.usuario : auth.username }}, Autenticado?  {{ auth.isAuthenticated }}
  </div>
</template>
<script setup>
  import { useAuthStore } from '@/store/auth';

  const auth = useAuthStore();
</script>