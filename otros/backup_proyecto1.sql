--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: esquema1; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA esquema1;


ALTER SCHEMA esquema1 OWNER TO postgres;

--
-- Name: dias_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.dias_enum AS ENUM (
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
    'Feriado'
);


ALTER TYPE public.dias_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bebidas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.bebidas (
    id integer NOT NULL,
    nombre character varying(50),
    litros numeric(5,2),
    inhabilitada integer
);


ALTER TABLE esquema1.bebidas OWNER TO postgres;

--
-- Name: bebidas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.bebidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.bebidas_id_seq OWNER TO postgres;

--
-- Name: bebidas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.bebidas_id_seq OWNED BY esquema1.bebidas.id;


--
-- Name: clientes; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.clientes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_nacimiento date,
    email character varying(100) NOT NULL,
    telefono character varying(15),
    direccion character varying(30),
    inhabilitado integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE esquema1.clientes OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.clientes_id_seq OWNED BY esquema1.clientes.id;


--
-- Name: combo_comidas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combo_comidas (
    id integer NOT NULL,
    combo_id integer,
    bebida_id integer
);


ALTER TABLE esquema1.combo_comidas OWNER TO postgres;

--
-- Name: combo_comidas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combo_comidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combo_comidas_id_seq OWNER TO postgres;

--
-- Name: combo_comidas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combo_comidas_id_seq OWNED BY esquema1.combo_comidas.id;


--
-- Name: combo_dias; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combo_dias (
    id integer NOT NULL,
    combo_id integer,
    dia_id integer
);


ALTER TABLE esquema1.combo_dias OWNER TO postgres;

--
-- Name: combo_dias_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combo_dias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combo_dias_id_seq OWNER TO postgres;

--
-- Name: combo_dias_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combo_dias_id_seq OWNED BY esquema1.combo_dias.id;


--
-- Name: combo_instalaciones; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combo_instalaciones (
    id integer NOT NULL,
    combo_id integer,
    instalacion_id integer
);


ALTER TABLE esquema1.combo_instalaciones OWNER TO postgres;

--
-- Name: combo_instalaciones_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combo_instalaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combo_instalaciones_id_seq OWNER TO postgres;

--
-- Name: combo_instalaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combo_instalaciones_id_seq OWNED BY esquema1.combo_instalaciones.id;


--
-- Name: combo_menus_comidas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combo_menus_comidas (
    id integer NOT NULL,
    combo_id integer,
    menu_id integer
);


ALTER TABLE esquema1.combo_menus_comidas OWNER TO postgres;

--
-- Name: combo_menus_comidas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combo_menus_comidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combo_menus_comidas_id_seq OWNER TO postgres;

--
-- Name: combo_menus_comidas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combo_menus_comidas_id_seq OWNED BY esquema1.combo_menus_comidas.id;


--
-- Name: combo_precios; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combo_precios (
    id integer NOT NULL,
    combo_id integer NOT NULL,
    dia_id integer NOT NULL,
    precio numeric(10,2) NOT NULL
);


ALTER TABLE esquema1.combo_precios OWNER TO postgres;

--
-- Name: combo_precios_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combo_precios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combo_precios_id_seq OWNER TO postgres;

--
-- Name: combo_precios_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combo_precios_id_seq OWNED BY esquema1.combo_precios.id;


--
-- Name: combos; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.combos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    cant_max_personas integer NOT NULL,
    precio_base numeric(10,2) NOT NULL,
    precio_adicional_persona numeric(10,2),
    inhabilitada boolean,
    servicio boolean,
    invitacion boolean,
    bebidas boolean,
    observacion character varying(30),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE esquema1.combos OWNER TO postgres;

--
-- Name: combos_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.combos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.combos_id_seq OWNER TO postgres;

--
-- Name: combos_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.combos_id_seq OWNED BY esquema1.combos.id;


--
-- Name: comidas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.comidas (
    id integer NOT NULL,
    nombre character varying(50),
    descripcion character varying(50)
);


ALTER TABLE esquema1.comidas OWNER TO postgres;

--
-- Name: comidas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.comidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.comidas_id_seq OWNER TO postgres;

--
-- Name: comidas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.comidas_id_seq OWNED BY esquema1.comidas.id;


--
-- Name: dias; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.dias (
    id integer NOT NULL,
    nombre public.dias_enum NOT NULL
);


ALTER TABLE esquema1.dias OWNER TO postgres;

--
-- Name: dias_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.dias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.dias_id_seq OWNER TO postgres;

--
-- Name: dias_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.dias_id_seq OWNED BY esquema1.dias.id;


--
-- Name: empresas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.empresas (
    empresa_id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    alias character varying(100),
    fecha_creacion date,
    inhabilitada integer
);


ALTER TABLE esquema1.empresas OWNER TO postgres;

--
-- Name: empresas_empresa_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.empresas_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.empresas_empresa_id_seq OWNER TO postgres;

--
-- Name: empresas_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.empresas_empresa_id_seq OWNED BY esquema1.empresas.empresa_id;


--
-- Name: estados; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.estados (
    id integer NOT NULL,
    nombre character varying(30),
    inhabilitado integer
);


ALTER TABLE esquema1.estados OWNER TO postgres;

--
-- Name: estados_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.estados_id_seq OWNER TO postgres;

--
-- Name: estados_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.estados_id_seq OWNED BY esquema1.estados.id;


--
-- Name: horarios; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.horarios (
    id integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    CONSTRAINT horarios_check CHECK ((hora_fin > hora_inicio))
);


ALTER TABLE esquema1.horarios OWNER TO postgres;

--
-- Name: horarios_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.horarios_id_seq OWNER TO postgres;

--
-- Name: horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.horarios_id_seq OWNED BY esquema1.horarios.id;


--
-- Name: instalaciones; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.instalaciones (
    id integer NOT NULL,
    nombre character varying(50),
    descripcion character varying(50),
    edad_uso integer,
    inhabilitado integer,
    CONSTRAINT instalaciones_edad_uso_check CHECK ((edad_uso >= 0))
);


ALTER TABLE esquema1.instalaciones OWNER TO postgres;

--
-- Name: instalaciones_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.instalaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.instalaciones_id_seq OWNER TO postgres;

--
-- Name: instalaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.instalaciones_id_seq OWNED BY esquema1.instalaciones.id;


--
-- Name: menu_comidas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.menu_comidas (
    id integer NOT NULL,
    menu_id integer,
    comida_id integer
);


ALTER TABLE esquema1.menu_comidas OWNER TO postgres;

--
-- Name: menu_comidas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.menu_comidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.menu_comidas_id_seq OWNER TO postgres;

--
-- Name: menu_comidas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.menu_comidas_id_seq OWNED BY esquema1.menu_comidas.id;


--
-- Name: menus; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.menus (
    id integer NOT NULL,
    descripcion character varying(30),
    inhabilitado integer
);


ALTER TABLE esquema1.menus OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.menus_id_seq OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.menus_id_seq OWNED BY esquema1.menus.id;


--
-- Name: reservas; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.reservas (
    id integer NOT NULL,
    fecha_grabacion date NOT NULL,
    fecha_evento date NOT NULL,
    cliente_id integer NOT NULL,
    estado_id integer NOT NULL,
    horario_id integer NOT NULL,
    cantidad_invitados integer NOT NULL,
    combo_id integer,
    inhabilitada integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reservas_cantidad_invitados_check CHECK ((cantidad_invitados >= 0))
);


ALTER TABLE esquema1.reservas OWNER TO postgres;

--
-- Name: reservas_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.reservas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.reservas_id_seq OWNER TO postgres;

--
-- Name: reservas_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.reservas_id_seq OWNED BY esquema1.reservas.id;


--
-- Name: roles; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.roles (
    id integer NOT NULL,
    nombre character varying(20) NOT NULL,
    descripcion text
);


ALTER TABLE esquema1.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.roles_id_seq OWNED BY esquema1.roles.id;


--
-- Name: usuarios; Type: TABLE; Schema: esquema1; Owner: postgres
--

CREATE TABLE esquema1.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    username character varying(30),
    inhabilitado boolean,
    rol_id integer NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE esquema1.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: esquema1; Owner: postgres
--

CREATE SEQUENCE esquema1.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE esquema1.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: esquema1; Owner: postgres
--

ALTER SEQUENCE esquema1.usuarios_id_seq OWNED BY esquema1.usuarios.id;


--
-- Name: bebidas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.bebidas ALTER COLUMN id SET DEFAULT nextval('esquema1.bebidas_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.clientes ALTER COLUMN id SET DEFAULT nextval('esquema1.clientes_id_seq'::regclass);


--
-- Name: combo_comidas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_comidas ALTER COLUMN id SET DEFAULT nextval('esquema1.combo_comidas_id_seq'::regclass);


--
-- Name: combo_dias id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_dias ALTER COLUMN id SET DEFAULT nextval('esquema1.combo_dias_id_seq'::regclass);


--
-- Name: combo_instalaciones id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_instalaciones ALTER COLUMN id SET DEFAULT nextval('esquema1.combo_instalaciones_id_seq'::regclass);


--
-- Name: combo_menus_comidas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_menus_comidas ALTER COLUMN id SET DEFAULT nextval('esquema1.combo_menus_comidas_id_seq'::regclass);


--
-- Name: combo_precios id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_precios ALTER COLUMN id SET DEFAULT nextval('esquema1.combo_precios_id_seq'::regclass);


--
-- Name: combos id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combos ALTER COLUMN id SET DEFAULT nextval('esquema1.combos_id_seq'::regclass);


--
-- Name: comidas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.comidas ALTER COLUMN id SET DEFAULT nextval('esquema1.comidas_id_seq'::regclass);


--
-- Name: dias id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.dias ALTER COLUMN id SET DEFAULT nextval('esquema1.dias_id_seq'::regclass);


--
-- Name: empresas empresa_id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.empresas ALTER COLUMN empresa_id SET DEFAULT nextval('esquema1.empresas_empresa_id_seq'::regclass);


--
-- Name: estados id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.estados ALTER COLUMN id SET DEFAULT nextval('esquema1.estados_id_seq'::regclass);


--
-- Name: horarios id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.horarios ALTER COLUMN id SET DEFAULT nextval('esquema1.horarios_id_seq'::regclass);


--
-- Name: instalaciones id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.instalaciones ALTER COLUMN id SET DEFAULT nextval('esquema1.instalaciones_id_seq'::regclass);


--
-- Name: menu_comidas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menu_comidas ALTER COLUMN id SET DEFAULT nextval('esquema1.menu_comidas_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menus ALTER COLUMN id SET DEFAULT nextval('esquema1.menus_id_seq'::regclass);


--
-- Name: reservas id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas ALTER COLUMN id SET DEFAULT nextval('esquema1.reservas_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.roles ALTER COLUMN id SET DEFAULT nextval('esquema1.roles_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.usuarios ALTER COLUMN id SET DEFAULT nextval('esquema1.usuarios_id_seq'::regclass);


--
-- Data for Name: bebidas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.bebidas (id, nombre, litros, inhabilitada) FROM stdin;
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.clientes (id, nombre, fecha_nacimiento, email, telefono, direccion, inhabilitado, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: combo_comidas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combo_comidas (id, combo_id, bebida_id) FROM stdin;
\.


--
-- Data for Name: combo_dias; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combo_dias (id, combo_id, dia_id) FROM stdin;
\.


--
-- Data for Name: combo_instalaciones; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combo_instalaciones (id, combo_id, instalacion_id) FROM stdin;
\.


--
-- Data for Name: combo_menus_comidas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combo_menus_comidas (id, combo_id, menu_id) FROM stdin;
\.


--
-- Data for Name: combo_precios; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combo_precios (id, combo_id, dia_id, precio) FROM stdin;
\.


--
-- Data for Name: combos; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.combos (id, nombre, descripcion, cant_max_personas, precio_base, precio_adicional_persona, inhabilitada, servicio, invitacion, bebidas, observacion, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: comidas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.comidas (id, nombre, descripcion) FROM stdin;
\.


--
-- Data for Name: dias; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.dias (id, nombre) FROM stdin;
1	Lunes
2	Martes
3	Miércoles
4	Jueves
5	Viernes
6	Sábado
7	Domingo
8	Feriado
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.empresas (empresa_id, nombre, alias, fecha_creacion, inhabilitada) FROM stdin;
3	Future Enterprises	FutEnt	2008-01-30	1
7	EcoEnergy	EcoEn	2017-06-25	1
10	Bright Future	BrtFut	2019-04-18	1
1	Tech Innovators	TechInno	2010-05-15	\N
2	Green Solutions	GreenSol	2015-09-23	\N
4	Solar Systems	SolarSys	2020-11-12	\N
5	GlobalTech	GlobT	2012-07-19	\N
6	NextGen Innovations	NextGen	2018-02-03	\N
8	SkyHigh Ventures	SkyHV	2005-10-20	\N
9	Quantum Technologies	QuantTech	2013-03-15	\N
\.


--
-- Data for Name: estados; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.estados (id, nombre, inhabilitado) FROM stdin;
1	Pendiente	\N
2	Confirmada	\N
3	Cancelada	\N
\.


--
-- Data for Name: horarios; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.horarios (id, hora_inicio, hora_fin) FROM stdin;
\.


--
-- Data for Name: instalaciones; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.instalaciones (id, nombre, descripcion, edad_uso, inhabilitado) FROM stdin;
\.


--
-- Data for Name: menu_comidas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.menu_comidas (id, menu_id, comida_id) FROM stdin;
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.menus (id, descripcion, inhabilitado) FROM stdin;
\.


--
-- Data for Name: reservas; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.reservas (id, fecha_grabacion, fecha_evento, cliente_id, estado_id, horario_id, cantidad_invitados, combo_id, inhabilitada, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.roles (id, nombre, descripcion) FROM stdin;
1	DBA	Usuario Administrador de la Base de Datos
2	Admin	Usuario Pensado para los Dueños
3	Organizador	Usuario que solo puede gestionar las reservas, empleados del salón
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: esquema1; Owner: postgres
--

COPY esquema1.usuarios (id, nombre, email, password, creado_en, username, inhabilitado, rol_id, actualizado_en) FROM stdin;
11	Rodrigo Omar Miranda	rodrigo.omar.miranda16@gmail.com	$2y$10$N3DtferHHGjDEPwtQRd50ODg9DmHZ5decveAJ6RFWOBcK9cNSYx9u	2025-03-09 01:02:00.187516	rodrim16	\N	1	2025-03-11 17:21:23.701009
\.


--
-- Name: bebidas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.bebidas_id_seq', 1, false);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.clientes_id_seq', 1, false);


--
-- Name: combo_comidas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combo_comidas_id_seq', 1, false);


--
-- Name: combo_dias_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combo_dias_id_seq', 1, false);


--
-- Name: combo_instalaciones_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combo_instalaciones_id_seq', 1, false);


--
-- Name: combo_menus_comidas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combo_menus_comidas_id_seq', 1, false);


--
-- Name: combo_precios_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combo_precios_id_seq', 1, false);


--
-- Name: combos_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.combos_id_seq', 1, false);


--
-- Name: comidas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.comidas_id_seq', 1, false);


--
-- Name: dias_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.dias_id_seq', 8, true);


--
-- Name: empresas_empresa_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.empresas_empresa_id_seq', 10, true);


--
-- Name: estados_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.estados_id_seq', 3, true);


--
-- Name: horarios_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.horarios_id_seq', 1, false);


--
-- Name: instalaciones_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.instalaciones_id_seq', 1, false);


--
-- Name: menu_comidas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.menu_comidas_id_seq', 1, false);


--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.menus_id_seq', 1, false);


--
-- Name: reservas_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.reservas_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.roles_id_seq', 3, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: esquema1; Owner: postgres
--

SELECT pg_catalog.setval('esquema1.usuarios_id_seq', 13, true);


--
-- Name: bebidas bebidas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.bebidas
    ADD CONSTRAINT bebidas_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: combo_comidas combo_comidas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_comidas
    ADD CONSTRAINT combo_comidas_pkey PRIMARY KEY (id);


--
-- Name: combo_dias combo_dias_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_dias
    ADD CONSTRAINT combo_dias_pkey PRIMARY KEY (id);


--
-- Name: combo_instalaciones combo_instalaciones_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_instalaciones
    ADD CONSTRAINT combo_instalaciones_pkey PRIMARY KEY (id);


--
-- Name: combo_menus_comidas combo_menus_comidas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_menus_comidas
    ADD CONSTRAINT combo_menus_comidas_pkey PRIMARY KEY (id);


--
-- Name: combo_precios combo_precios_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_precios
    ADD CONSTRAINT combo_precios_pkey PRIMARY KEY (id);


--
-- Name: combos combos_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combos
    ADD CONSTRAINT combos_pkey PRIMARY KEY (id);


--
-- Name: comidas comidas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.comidas
    ADD CONSTRAINT comidas_pkey PRIMARY KEY (id);


--
-- Name: dias dias_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.dias
    ADD CONSTRAINT dias_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (empresa_id);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- Name: instalaciones instalaciones_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.instalaciones
    ADD CONSTRAINT instalaciones_pkey PRIMARY KEY (id);


--
-- Name: menu_comidas menu_comidas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menu_comidas
    ADD CONSTRAINT menu_comidas_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: reservas reservas_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas
    ADD CONSTRAINT reservas_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: combo_comidas combo_comidas_bebida_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_comidas
    ADD CONSTRAINT combo_comidas_bebida_id_fkey FOREIGN KEY (bebida_id) REFERENCES esquema1.bebidas(id);


--
-- Name: combo_comidas combo_comidas_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_comidas
    ADD CONSTRAINT combo_comidas_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: combo_dias combo_dias_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_dias
    ADD CONSTRAINT combo_dias_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: combo_dias combo_dias_dia_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_dias
    ADD CONSTRAINT combo_dias_dia_id_fkey FOREIGN KEY (dia_id) REFERENCES esquema1.dias(id);


--
-- Name: combo_instalaciones combo_instalaciones_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_instalaciones
    ADD CONSTRAINT combo_instalaciones_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: combo_instalaciones combo_instalaciones_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_instalaciones
    ADD CONSTRAINT combo_instalaciones_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES esquema1.instalaciones(id);


--
-- Name: combo_menus_comidas combo_menus_comidas_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_menus_comidas
    ADD CONSTRAINT combo_menus_comidas_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: combo_menus_comidas combo_menus_comidas_menu_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_menus_comidas
    ADD CONSTRAINT combo_menus_comidas_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES esquema1.menus(id);


--
-- Name: combo_precios combo_precios_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_precios
    ADD CONSTRAINT combo_precios_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: combo_precios combo_precios_dia_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.combo_precios
    ADD CONSTRAINT combo_precios_dia_id_fkey FOREIGN KEY (dia_id) REFERENCES esquema1.dias(id);


--
-- Name: usuarios fk_rol; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.usuarios
    ADD CONSTRAINT fk_rol FOREIGN KEY (rol_id) REFERENCES esquema1.roles(id);


--
-- Name: menu_comidas menu_comidas_comida_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menu_comidas
    ADD CONSTRAINT menu_comidas_comida_id_fkey FOREIGN KEY (comida_id) REFERENCES esquema1.comidas(id);


--
-- Name: menu_comidas menu_comidas_menu_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.menu_comidas
    ADD CONSTRAINT menu_comidas_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES esquema1.menus(id);


--
-- Name: reservas reservas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas
    ADD CONSTRAINT reservas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES esquema1.clientes(id);


--
-- Name: reservas reservas_combo_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas
    ADD CONSTRAINT reservas_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES esquema1.combos(id);


--
-- Name: reservas reservas_estado_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas
    ADD CONSTRAINT reservas_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES esquema1.estados(id);


--
-- Name: reservas reservas_horario_id_fkey; Type: FK CONSTRAINT; Schema: esquema1; Owner: postgres
--

ALTER TABLE ONLY esquema1.reservas
    ADD CONSTRAINT reservas_horario_id_fkey FOREIGN KEY (horario_id) REFERENCES esquema1.horarios(id);


--
-- PostgreSQL database dump complete
--

