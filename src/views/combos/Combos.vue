<template>
  <div style="margin-top: 70px;">HOLA HAS TUS combos AQUÍ</div>
</template>

<script setup>
  import { genericosStore } from '@/store/genericos';
  import { onMounted, ref } from 'vue';
  console.log("Estamos en combos")
  
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