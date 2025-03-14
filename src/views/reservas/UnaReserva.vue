<template>
  <div style="margin-top: 70px;">
    Hola mundo Una Reserva
    <br>
    {{ router.currentRoute.path }}
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router';
  const router = useRouter();
  console.log(router.currentRoute.value.path, router.currentRoute.value.params)
</script>