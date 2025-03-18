<template>
  <v-btn title="Limpiar campos" dark variant="text" icon color="orange" @click="emit('limpiar')">
    <v-icon>fa-solid fa-broom</v-icon>
  </v-btn>
  <v-btn title="Filtrar" type="submit" color="primary"  
    prepend-icon="fa-solid fa-magnifying-glass" flat @click="emit('filtrar')"> Buscar </v-btn>
</template>

<script setup> 
  const emit = defineEmits(['filtrar', 'limpiar']);
</script>