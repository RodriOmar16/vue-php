<template>
  <div>
    Bienvenid@: {{ auth.usuario }}
  </div>
</template>
<script setup>
  import { useAuthStore } from '@/store/auth';

  const auth = useAuthStore();
</script>