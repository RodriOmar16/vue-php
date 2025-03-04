import '@fortawesome/fontawesome-free/css/all.css'; // Importa el CSS de FontAwesome
	import 'vuetify/styles'; // Estilos de Vuetify
	import { createVuetify } from 'vuetify';
	import { aliases, fa } from 'vuetify/iconsets/fa'; // Importa el set de FontAwesome
	import * as components from 'vuetify/components';
	import * as directives from 'vuetify/directives';

	const vuetify = createVuetify({
	  components,
	  directives,
	  icons: {
	    defaultSet: 'fa', // Usa FontAwesome como conjunto predeterminado
	    aliases,
	    sets: {
	      fa,
	    },
	  },
	});

	export default vuetify;