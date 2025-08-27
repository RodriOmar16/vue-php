<template>
  <v-container>
    <!-- Título -->
    <v-row>
      <v-col cols="12">
        <h1 class="text-center">Gestión de Usuarios</h1>
      </v-col>
    </v-row>

    <!-- Botón para abrir el diálogo de creación -->
    <v-row>
      <v-col cols="12" class="d-flex justify-end">
        <v-btn color="primary" @click="abrirDialogoCrear">Agregar Usuario</v-btn>
      </v-col>
    </v-row>

    <!-- Tabla de usuarios -->
    <v-row>
      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="usuarios"
          item-value="id"
          class="elevation-1"
          dense
        >
          <template #item.acciones="{ item }">
            <v-btn variant="text" size="small" icon color="info" @click="editar(item)">
              <v-icon>fa-solid fa-pen</v-icon>
            </v-btn>
            <v-btn variant="text" size="small" icon color="error" @click="eliminarUser(item.id)">
              <v-icon>fa-solid fa-trash</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <!-- Diálogo para agregar o editar usuario -->
    <v-dialog v-model="dialogo" max-width="500px">
      <v-card>
        <v-card-title>
          {{ modoEditar ? 'Editar Usuario' : 'Agregar Usuario' }}
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field
              v-model="formulario.nombre"
              label="Nombre"
              required
            ></v-text-field>
            <v-text-field
              v-model="formulario.email"
              label="Email"
              type="email"
              required
            ></v-text-field>
            <v-select
              v-model="formulario.rol"
              :items="roles"
              label="Rol"
              required
            ></v-select>
            <v-text-field
              v-model="formulario.contrasena"
              label="Contraseña"
              type="password"
              v-if="!modoEditar"
              required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="cerrarDialogo">Cancelar</v-btn>
          <v-btn color="primary" @click="guardarUsuario">
            {{ modoEditar ? 'Guardar Cambios' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import { obtenerUsuarios,  crearUsuario,  editarUsuario,  eliminarUsuario,} from '@/services/usuariosService';
  import { genericosStore } from '@/store/genericos';

  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    genericosStore.loading = true;
    //consultas a la api
    genericosStore.loading = false;
  };

  // Datos reactivos
  const usuarios = ref([]);
  const headers = [
    { text: 'ID', value: 'id' },
    { text: 'Nombre', value: 'nombre' },
    { text: 'Email', value: 'email' },
    { text: 'Rol', value: 'rol' },
    { text: 'Acciones', value: 'acciones', sortable: false },
  ];
  const roles = ['Admin', 'Usuario', 'Editor'];
  const formulario = ref({
    id: null,
    nombre: '',
    email: '',
    rol: '',
    contrasena: '',
  });
  const dialogo = ref(false);
  const modoEditar = ref(false);

  // Métodos reactivos
  const cargarUsuarios = async () => {
    usuarios.value = await obtenerUsuarios();
  };

  const abrirDialogoCrear = () => {
    modoEditar.value = false;
    formulario.value = {
      id: null,
      nombre: '',
      email: '',
      rol: '',
      contrasena: '',
    };
    dialogo.value = true;
  };

  const editar = (usuario) => {
    modoEditar.value = true;
    formulario.value = { ...usuario }; // Clonar los datos del usuario
    formulario.value.contrasena = ''; // No mostrar la contraseña actual
    dialogo.value = true;
  };

  const guardarUsuario = async () => {
    if (modoEditar.value) {
      // Llamada a la API para editar
      await editarUsuario(formulario.value.id, {
        nombre: formulario.value.nombre,
        email: formulario.value.email,
        rol: formulario.value.rol,
      });
    } else {
      // Llamada a la API para crear
      await crearUsuario({
        nombre: formulario.value.nombre,
        email: formulario.value.email,
        rol: formulario.value.rol,
        contrasena: formulario.value.contrasena,
      });
    }

    // Actualizar la tabla y cerrar el diálogo
    cargarUsuarios();
    cerrarDialogo();
  };

  const eliminarUser = async (id) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await eliminarUsuario(id);
      cargarUsuarios();
    }
  };

  const cerrarDialogo = () => {
    dialogo.value = false;
  };

  // Cargar los usuarios al montar la vista
  onMounted(cargarUsuarios);
</script>

<style scoped>
.text-center {
  text-align: center;
}
</style>
