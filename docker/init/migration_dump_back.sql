--
-- PostgreSQL database dump
--

\restrict LUrarjw5x5eFd2ek0WERTZMDAzREjCiaigZ2LzvienrY1xaqOOB3DTtjiSKrPt9

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg12+2)
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-04 23:38:49 UTC

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
-- TOC entry 2 (class 3079 OID 24807)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3977 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 18375)
-- Name: achievement; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.achievement (
    id uuid NOT NULL,
    achievement_key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    category character varying(30) NOT NULL,
    icon character varying(10) NOT NULL,
    color character varying(10) NOT NULL,
    condition_type character varying(30) NOT NULL,
    condition_target character varying(50) NOT NULL,
    condition_value integer NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    rarity character varying(20) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.achievement OWNER TO spacedb_ow88_user;

--
-- TOC entry 231 (class 1259 OID 18397)
-- Name: alliance; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.alliance (
    id uuid NOT NULL,
    name character varying(20) NOT NULL,
    tag character varying(5) NOT NULL,
    description text,
    internal_message text,
    leader_id uuid NOT NULL,
    member_count integer DEFAULT 1 NOT NULL,
    total_score bigint DEFAULT 0 NOT NULL,
    recruitment_policy character varying(20) DEFAULT 'invite_only'::character varying NOT NULL,
    min_level_required integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.alliance OWNER TO spacedb_ow88_user;

--
-- TOC entry 232 (class 1259 OID 18416)
-- Name: alliance_invitation; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.alliance_invitation (
    id uuid NOT NULL,
    alliance_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invitation_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    message text,
    invited_by uuid,
    created_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone
);


ALTER TABLE public.alliance_invitation OWNER TO spacedb_ow88_user;

--
-- TOC entry 233 (class 1259 OID 18428)
-- Name: alliance_member; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.alliance_member (
    id uuid NOT NULL,
    alliance_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    score bigint DEFAULT 0 NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    last_active timestamp without time zone NOT NULL
);


ALTER TABLE public.alliance_member OWNER TO spacedb_ow88_user;

--
-- TOC entry 234 (class 1259 OID 18440)
-- Name: announcements; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    type character varying DEFAULT 'info'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.announcements OWNER TO spacedb_ow88_user;

--
-- TOC entry 235 (class 1259 OID 18456)
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3978 (class 0 OID 0)
-- Dependencies: 235
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- TOC entry 236 (class 1259 OID 18457)
-- Name: building_requirements; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.building_requirements (
    id integer NOT NULL,
    building_type_id integer NOT NULL,
    required_tech_id integer,
    required_building_id integer,
    required_level integer NOT NULL
);


ALTER TABLE public.building_requirements OWNER TO spacedb_ow88_user;

--
-- TOC entry 237 (class 1259 OID 18463)
-- Name: building_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.building_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.building_requirements_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3979 (class 0 OID 0)
-- Dependencies: 237
-- Name: building_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.building_requirements_id_seq OWNED BY public.building_requirements.id;


--
-- TOC entry 238 (class 1259 OID 18464)
-- Name: building_types; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.building_types (
    id integer NOT NULL,
    building_key character varying NOT NULL,
    name character varying NOT NULL,
    category character varying NOT NULL,
    base_cost_metal integer NOT NULL,
    base_cost_crystal integer NOT NULL,
    base_cost_deuterium integer NOT NULL,
    base_time_seconds integer DEFAULT 0 NOT NULL,
    cost_multiplier double precision NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.building_types OWNER TO spacedb_ow88_user;

--
-- TOC entry 239 (class 1259 OID 18480)
-- Name: building_types_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.building_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.building_types_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3980 (class 0 OID 0)
-- Dependencies: 239
-- Name: building_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.building_types_id_seq OWNED BY public.building_types.id;


--
-- TOC entry 240 (class 1259 OID 18481)
-- Name: casus_belli; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.casus_belli (
    id uuid NOT NULL,
    victim_user_id uuid NOT NULL,
    aggressor_user_id uuid NOT NULL,
    reason character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    was_used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.casus_belli OWNER TO spacedb_ow88_user;

--
-- TOC entry 241 (class 1259 OID 18495)
-- Name: combat_log; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.combat_log (
    id uuid NOT NULL,
    planet_id uuid NOT NULL,
    target_name character varying NOT NULL,
    mission_type character varying NOT NULL,
    result character varying NOT NULL,
    loot_metal double precision DEFAULT 0,
    loot_crystal double precision DEFAULT 0,
    ships_lost integer DEFAULT 0,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opponent_username character varying,
    detailed_report json
);


ALTER TABLE public.combat_log OWNER TO spacedb_ow88_user;

--
-- TOC entry 242 (class 1259 OID 18509)
-- Name: construction_queue; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.construction_queue (
    id uuid NOT NULL,
    planet_id uuid NOT NULL,
    building_type character varying NOT NULL,
    level integer NOT NULL,
    end_time timestamp without time zone NOT NULL
);


ALTER TABLE public.construction_queue OWNER TO spacedb_ow88_user;

--
-- TOC entry 243 (class 1259 OID 18519)
-- Name: conversation; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.conversation (
    id uuid NOT NULL,
    user1_id uuid NOT NULL,
    user2_id uuid NOT NULL,
    last_message_at timestamp without time zone NOT NULL,
    user1_unread_count integer DEFAULT 0 NOT NULL,
    user2_unread_count integer DEFAULT 0 NOT NULL,
    user1_archived boolean DEFAULT false NOT NULL,
    user2_archived boolean DEFAULT false NOT NULL
);


ALTER TABLE public.conversation OWNER TO spacedb_ow88_user;

--
-- TOC entry 244 (class 1259 OID 18534)
-- Name: daily_mission; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.daily_mission (
    id uuid NOT NULL,
    mission_key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    mission_type character varying(30) NOT NULL,
    target character varying(50) NOT NULL,
    required_amount integer NOT NULL,
    difficulty character varying(20) NOT NULL,
    reward_metal double precision DEFAULT 0 NOT NULL,
    reward_crystal double precision DEFAULT 0 NOT NULL,
    reward_deuterium double precision DEFAULT 0 NOT NULL,
    reward_xp integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.daily_mission OWNER TO spacedb_ow88_user;

--
-- TOC entry 245 (class 1259 OID 18557)
-- Name: defense_requirements; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.defense_requirements (
    id integer NOT NULL,
    defense_type_id integer NOT NULL,
    required_tech_id integer,
    required_building_id integer,
    required_level integer NOT NULL
);


ALTER TABLE public.defense_requirements OWNER TO spacedb_ow88_user;

--
-- TOC entry 246 (class 1259 OID 18563)
-- Name: defense_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.defense_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.defense_requirements_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3981 (class 0 OID 0)
-- Dependencies: 246
-- Name: defense_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.defense_requirements_id_seq OWNED BY public.defense_requirements.id;


--
-- TOC entry 247 (class 1259 OID 18564)
-- Name: defense_types; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.defense_types (
    id integer NOT NULL,
    defense_key character varying NOT NULL,
    name character varying NOT NULL,
    category character varying NOT NULL,
    base_cost_metal integer NOT NULL,
    base_cost_crystal integer NOT NULL,
    base_cost_deuterium integer NOT NULL,
    build_time_seconds integer NOT NULL,
    attack integer NOT NULL,
    shield integer NOT NULL,
    hull integer NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.defense_types OWNER TO spacedb_ow88_user;

--
-- TOC entry 248 (class 1259 OID 18581)
-- Name: defense_types_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.defense_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.defense_types_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3982 (class 0 OID 0)
-- Dependencies: 248
-- Name: defense_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.defense_types_id_seq OWNED BY public.defense_types.id;


--
-- TOC entry 249 (class 1259 OID 18582)
-- Name: fleet_mission; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.fleet_mission (
    id uuid NOT NULL,
    source_planet_id uuid NOT NULL,
    target_planet_id uuid NOT NULL,
    mission_type character varying NOT NULL,
    arrival_time timestamp without time zone NOT NULL,
    metal double precision DEFAULT 0 NOT NULL,
    crystal double precision DEFAULT 0 NOT NULL,
    deuterium double precision DEFAULT 0 NOT NULL,
    ships_count integer DEFAULT 0 NOT NULL,
    fleet_data text
);


ALTER TABLE public.fleet_mission OWNER TO spacedb_ow88_user;

--
-- TOC entry 283 (class 1259 OID 19354)
-- Name: global_chat_message; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.global_chat_message (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.global_chat_message OWNER TO spacedb_ow88_user;

--
-- TOC entry 250 (class 1259 OID 18600)
-- Name: login_streak; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.login_streak (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    best_streak integer DEFAULT 0 NOT NULL,
    total_login_days integer DEFAULT 0 NOT NULL,
    last_login_date date NOT NULL,
    daily_reward_claimed boolean DEFAULT false NOT NULL,
    last_reward_date date
);


ALTER TABLE public.login_streak OWNER TO spacedb_ow88_user;

--
-- TOC entry 251 (class 1259 OID 18614)
-- Name: market_listing; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.market_listing (
    id uuid NOT NULL,
    seller_planet_id uuid NOT NULL,
    seller_user_id uuid NOT NULL,
    resource_type character varying(20) NOT NULL,
    quantity double precision NOT NULL,
    price_per_unit double precision NOT NULL,
    target_resource character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.market_listing OWNER TO spacedb_ow88_user;

--
-- TOC entry 252 (class 1259 OID 18628)
-- Name: market_price_history; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.market_price_history (
    id uuid NOT NULL,
    resource_type character varying(20) NOT NULL,
    npc_buy_price double precision NOT NULL,
    npc_sell_price double precision NOT NULL,
    avg_player_price double precision,
    player_listings_count integer DEFAULT 0 NOT NULL,
    recorded_at timestamp without time zone NOT NULL
);


ALTER TABLE public.market_price_history OWNER TO spacedb_ow88_user;

--
-- TOC entry 253 (class 1259 OID 18639)
-- Name: market_transaction; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.market_transaction (
    id uuid NOT NULL,
    seller_planet_id uuid NOT NULL,
    seller_user_id uuid NOT NULL,
    buyer_planet_id uuid NOT NULL,
    buyer_user_id uuid NOT NULL,
    resource_sold character varying(20) NOT NULL,
    resource_paid character varying(20) NOT NULL,
    quantity_sold double precision NOT NULL,
    quantity_paid double precision NOT NULL,
    price_per_unit double precision NOT NULL,
    tax_amount double precision NOT NULL,
    transaction_type character varying(10) NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.market_transaction OWNER TO spacedb_ow88_user;

--
-- TOC entry 254 (class 1259 OID 18655)
-- Name: message; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.message (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    subject character varying NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL,
    conversation_id uuid
);


ALTER TABLE public.message OWNER TO spacedb_ow88_user;

--
-- TOC entry 255 (class 1259 OID 18668)
-- Name: officer_template; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.officer_template (
    id uuid NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    specialization character varying NOT NULL,
    rarity character varying NOT NULL,
    bonus_type character varying NOT NULL,
    base_bonus_value double precision NOT NULL,
    bonus_per_level double precision NOT NULL,
    max_level integer DEFAULT 50 NOT NULL,
    image_type character varying NOT NULL,
    recruitment_cost_metal double precision DEFAULT 0 NOT NULL,
    recruitment_cost_crystal double precision DEFAULT 0 NOT NULL,
    recruitment_cost_deuterium double precision DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL
);


ALTER TABLE public.officer_template OWNER TO spacedb_ow88_user;

--
-- TOC entry 256 (class 1259 OID 18692)
-- Name: planet; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.planet (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    name character varying NOT NULL,
    galaxy integer NOT NULL,
    system integer NOT NULL,
    "position" integer NOT NULL,
    metal_mine_level integer DEFAULT 0 NOT NULL,
    crystal_mine_level integer DEFAULT 0 NOT NULL,
    deuterium_mine_level integer DEFAULT 0 NOT NULL,
    metal_amount double precision DEFAULT 0 NOT NULL,
    crystal_amount double precision DEFAULT 0 NOT NULL,
    deuterium_amount double precision DEFAULT 0 NOT NULL,
    last_update timestamp without time zone NOT NULL,
    construction_end timestamp without time zone,
    construction_type character varying,
    shipyard_level integer DEFAULT 0 NOT NULL,
    light_hunter_count integer DEFAULT 0 NOT NULL,
    shipyard_construction_end timestamp without time zone,
    research_lab_level integer DEFAULT 0 NOT NULL,
    laser_battery_level integer DEFAULT 0 NOT NULL,
    energy_tech_level integer DEFAULT 0 NOT NULL,
    expedition_end timestamp without time zone,
    pending_fleet_count integer DEFAULT 0 NOT NULL,
    pending_fleet_type character varying,
    cruiser_count integer DEFAULT 0 NOT NULL,
    recycler_count integer DEFAULT 0 NOT NULL,
    unread_report text,
    spy_probe_count integer DEFAULT 0 NOT NULL,
    espionage_tech_level integer DEFAULT 0 NOT NULL,
    password character varying DEFAULT 'password_temporaire'::character varying NOT NULL,
    missile_launcher_count integer DEFAULT 0 NOT NULL,
    plasma_turret_count integer DEFAULT 0 NOT NULL,
    debris_metal double precision DEFAULT 0 NOT NULL,
    debris_crystal double precision DEFAULT 0 NOT NULL,
    colony_ship_count integer DEFAULT 0 NOT NULL,
    transporter_count integer DEFAULT 0 NOT NULL,
    solar_plant_level integer DEFAULT 0 NOT NULL,
    hangar_level integer DEFAULT 0 NOT NULL,
    armour_tech_level integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    resource_storage_level integer DEFAULT 0 NOT NULL,
    combustion_drive_level integer DEFAULT 0 NOT NULL,
    impulse_drive_level integer DEFAULT 0 NOT NULL,
    hyperspace_drive_level integer DEFAULT 0 NOT NULL,
    ion_tech_level integer DEFAULT 0 NOT NULL,
    plasma_tech_level integer DEFAULT 0 NOT NULL,
    shield_tech_level integer DEFAULT 0 NOT NULL,
    weapons_tech_level integer DEFAULT 0 NOT NULL,
    computer_tech_level integer DEFAULT 0 NOT NULL,
    astrophysics_level integer DEFAULT 0 NOT NULL,
    logistics_tech_level integer DEFAULT 0 NOT NULL,
    deuterium_synthesizer_level integer DEFAULT 0 NOT NULL,
    heavy_hunter_count integer DEFAULT 0 NOT NULL,
    battleship_count integer DEFAULT 0 NOT NULL,
    bomber_count integer DEFAULT 0 NOT NULL,
    destroyer_count integer DEFAULT 0 NOT NULL,
    is_homeworld boolean DEFAULT false NOT NULL
);


ALTER TABLE public.planet OWNER TO spacedb_ow88_user;

--
-- TOC entry 257 (class 1259 OID 18791)
-- Name: planet_buildings; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.planet_buildings (
    planet_id uuid NOT NULL,
    building_type_id integer NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    upgrading_to_level integer,
    upgrade_end_time timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.planet_buildings OWNER TO spacedb_ow88_user;

--
-- TOC entry 258 (class 1259 OID 18799)
-- Name: planet_defenses; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.planet_defenses (
    planet_id uuid NOT NULL,
    defense_type_id integer NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    building_count integer,
    build_end_time timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.planet_defenses OWNER TO spacedb_ow88_user;

--
-- TOC entry 259 (class 1259 OID 18807)
-- Name: planet_ships; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.planet_ships (
    planet_id uuid NOT NULL,
    ship_type_id integer NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    building_count integer,
    build_end_time timestamp without time zone
);


ALTER TABLE public.planet_ships OWNER TO spacedb_ow88_user;

--
-- TOC entry 260 (class 1259 OID 18816)
-- Name: planet_technologies; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.planet_technologies (
    planet_id uuid NOT NULL,
    tech_id integer NOT NULL,
    current_level integer DEFAULT 0 CONSTRAINT planet_technologies_level_not_null NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    researching_to_level integer,
    research_end_time timestamp without time zone
);


ALTER TABLE public.planet_technologies OWNER TO spacedb_ow88_user;

--
-- TOC entry 261 (class 1259 OID 18825)
-- Name: rapid_fire_rules; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.rapid_fire_rules (
    id integer NOT NULL,
    attacker_ship_type_id integer NOT NULL,
    target_ship_type_id integer NOT NULL,
    rapid_fire_value integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.rapid_fire_rules OWNER TO spacedb_ow88_user;

--
-- TOC entry 262 (class 1259 OID 18833)
-- Name: rapid_fire_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.rapid_fire_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rapid_fire_rules_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3983 (class 0 OID 0)
-- Dependencies: 262
-- Name: rapid_fire_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.rapid_fire_rules_id_seq OWNED BY public.rapid_fire_rules.id;


--
-- TOC entry 263 (class 1259 OID 18834)
-- Name: resource_slots; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.resource_slots (
    id integer NOT NULL,
    planet_id uuid NOT NULL,
    slot_number integer NOT NULL,
    resource_type character varying NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.resource_slots OWNER TO spacedb_ow88_user;

--
-- TOC entry 264 (class 1259 OID 18849)
-- Name: resource_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.resource_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_slots_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3984 (class 0 OID 0)
-- Dependencies: 264
-- Name: resource_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.resource_slots_id_seq OWNED BY public.resource_slots.id;


--
-- TOC entry 265 (class 1259 OID 18850)
-- Name: sabotage_effect; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.sabotage_effect (
    id uuid NOT NULL,
    target_planet_id uuid NOT NULL,
    attacker_user_id uuid,
    effect_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    was_detected boolean DEFAULT false NOT NULL,
    metadata json
);


ALTER TABLE public.sabotage_effect OWNER TO spacedb_ow88_user;

--
-- TOC entry 266 (class 1259 OID 18863)
-- Name: seaql_migrations; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.seaql_migrations (
    version character varying NOT NULL,
    applied_at bigint NOT NULL
);


ALTER TABLE public.seaql_migrations OWNER TO spacedb_ow88_user;

--
-- TOC entry 267 (class 1259 OID 18870)
-- Name: server_config; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.server_config (
    id integer NOT NULL,
    config_key character varying NOT NULL,
    config_value character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.server_config OWNER TO spacedb_ow88_user;

--
-- TOC entry 268 (class 1259 OID 18880)
-- Name: server_config_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.server_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.server_config_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3985 (class 0 OID 0)
-- Dependencies: 268
-- Name: server_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.server_config_id_seq OWNED BY public.server_config.id;


--
-- TOC entry 269 (class 1259 OID 18881)
-- Name: server_resource_stats; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.server_resource_stats (
    id uuid NOT NULL,
    metal_total double precision DEFAULT 0 NOT NULL,
    crystal_total double precision DEFAULT 0 NOT NULL,
    deuterium_total double precision DEFAULT 0 NOT NULL,
    metal_traded24h double precision DEFAULT 0 NOT NULL,
    crystal_traded24h double precision DEFAULT 0 NOT NULL,
    deuterium_traded24h double precision DEFAULT 0 NOT NULL,
    calculated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.server_resource_stats OWNER TO spacedb_ow88_user;

--
-- TOC entry 270 (class 1259 OID 18898)
-- Name: ship_requirements; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.ship_requirements (
    id integer NOT NULL,
    ship_type_id integer NOT NULL,
    required_tech_id integer NOT NULL,
    required_level integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.ship_requirements OWNER TO spacedb_ow88_user;

--
-- TOC entry 271 (class 1259 OID 18906)
-- Name: ship_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.ship_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ship_requirements_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3986 (class 0 OID 0)
-- Dependencies: 271
-- Name: ship_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.ship_requirements_id_seq OWNED BY public.ship_requirements.id;


--
-- TOC entry 272 (class 1259 OID 18907)
-- Name: ship_types; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.ship_types (
    id integer NOT NULL,
    ship_key character varying NOT NULL,
    name character varying NOT NULL,
    category character varying NOT NULL,
    base_cost_metal integer DEFAULT 0 NOT NULL,
    base_cost_crystal integer DEFAULT 0 NOT NULL,
    base_cost_deuterium integer DEFAULT 0 NOT NULL,
    attack integer DEFAULT 0 NOT NULL,
    shield integer DEFAULT 0 NOT NULL,
    hull integer DEFAULT 0 NOT NULL,
    cargo_capacity integer DEFAULT 0 NOT NULL,
    speed integer DEFAULT 0 NOT NULL,
    fuel_consumption integer DEFAULT 0 NOT NULL,
    shipyard_required integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    build_time_seconds integer DEFAULT 300 NOT NULL
);


ALTER TABLE public.ship_types OWNER TO spacedb_ow88_user;

--
-- TOC entry 273 (class 1259 OID 18940)
-- Name: ship_types_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.ship_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ship_types_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3987 (class 0 OID 0)
-- Dependencies: 273
-- Name: ship_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.ship_types_id_seq OWNED BY public.ship_types.id;


--
-- TOC entry 274 (class 1259 OID 18941)
-- Name: technologies; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.technologies (
    id integer NOT NULL,
    tech_key character varying NOT NULL,
    name character varying NOT NULL,
    category character varying NOT NULL,
    base_cost_metal integer DEFAULT 0 NOT NULL,
    base_cost_crystal integer DEFAULT 0 NOT NULL,
    base_cost_deuterium integer DEFAULT 0 NOT NULL,
    cost_multiplier double precision DEFAULT 2 NOT NULL,
    research_lab_required integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    base_time_seconds integer DEFAULT 600 NOT NULL
);


ALTER TABLE public.technologies OWNER TO spacedb_ow88_user;

--
-- TOC entry 275 (class 1259 OID 18964)
-- Name: technologies_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.technologies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.technologies_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3988 (class 0 OID 0)
-- Dependencies: 275
-- Name: technologies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.technologies_id_seq OWNED BY public.technologies.id;


--
-- TOC entry 276 (class 1259 OID 18965)
-- Name: technology_requirements; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.technology_requirements (
    id integer NOT NULL,
    tech_id integer NOT NULL,
    required_tech_id integer NOT NULL,
    required_level integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.technology_requirements OWNER TO spacedb_ow88_user;

--
-- TOC entry 277 (class 1259 OID 18973)
-- Name: technology_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: spacedb_ow88_user
--

CREATE SEQUENCE public.technology_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.technology_requirements_id_seq OWNER TO spacedb_ow88_user;

--
-- TOC entry 3989 (class 0 OID 0)
-- Dependencies: 277
-- Name: technology_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spacedb_ow88_user
--

ALTER SEQUENCE public.technology_requirements_id_seq OWNED BY public.technology_requirements.id;


--
-- TOC entry 278 (class 1259 OID 18974)
-- Name: transport_log; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.transport_log (
    id uuid NOT NULL,
    target_planet_id uuid NOT NULL,
    target_planet_name character varying NOT NULL,
    source_planet_id uuid NOT NULL,
    source_planet_name character varying NOT NULL,
    metal double precision DEFAULT 0 NOT NULL,
    crystal double precision DEFAULT 0 NOT NULL,
    deuterium double precision DEFAULT 0 NOT NULL,
    date timestamp without time zone NOT NULL,
    source_owner_name character varying,
    target_owner_name character varying
);


ALTER TABLE public.transport_log OWNER TO spacedb_ow88_user;

--
-- TOC entry 279 (class 1259 OID 18991)
-- Name: user; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public."user" (
    id uuid NOT NULL,
    username character varying NOT NULL,
    password character varying NOT NULL,
    email character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    role character varying DEFAULT 'user'::character varying NOT NULL,
    protection_until timestamp without time zone,
    total_points bigint DEFAULT 0 NOT NULL
);


ALTER TABLE public."user" OWNER TO spacedb_ow88_user;

--
-- TOC entry 280 (class 1259 OID 19003)
-- Name: user_achievement; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.user_achievement (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    current_progress integer DEFAULT 0 NOT NULL,
    unlocked boolean DEFAULT false NOT NULL,
    unlocked_at timestamp without time zone,
    displayed boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_achievement OWNER TO spacedb_ow88_user;

--
-- TOC entry 281 (class 1259 OID 19015)
-- Name: user_daily_mission; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.user_daily_mission (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    assigned_date date NOT NULL,
    current_progress integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    completed_at timestamp without time zone,
    claimed_at timestamp without time zone
);


ALTER TABLE public.user_daily_mission OWNER TO spacedb_ow88_user;

--
-- TOC entry 282 (class 1259 OID 19026)
-- Name: user_officer; Type: TABLE; Schema: public; Owner: spacedb_ow88_user
--

CREATE TABLE public.user_officer (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    officer_template_id uuid NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    experience integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    recruited_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_officer OWNER TO spacedb_ow88_user;

--
-- TOC entry 3458 (class 2604 OID 19039)
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- TOC entry 3463 (class 2604 OID 19040)
-- Name: building_requirements id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_requirements ALTER COLUMN id SET DEFAULT nextval('public.building_requirements_id_seq'::regclass);


--
-- TOC entry 3464 (class 2604 OID 19041)
-- Name: building_types id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_types ALTER COLUMN id SET DEFAULT nextval('public.building_types_id_seq'::regclass);


--
-- TOC entry 3482 (class 2604 OID 19042)
-- Name: defense_requirements id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_requirements ALTER COLUMN id SET DEFAULT nextval('public.defense_requirements_id_seq'::regclass);


--
-- TOC entry 3483 (class 2604 OID 19043)
-- Name: defense_types id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_types ALTER COLUMN id SET DEFAULT nextval('public.defense_types_id_seq'::regclass);


--
-- TOC entry 3552 (class 2604 OID 19044)
-- Name: rapid_fire_rules id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.rapid_fire_rules ALTER COLUMN id SET DEFAULT nextval('public.rapid_fire_rules_id_seq'::regclass);


--
-- TOC entry 3554 (class 2604 OID 19045)
-- Name: resource_slots id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.resource_slots ALTER COLUMN id SET DEFAULT nextval('public.resource_slots_id_seq'::regclass);


--
-- TOC entry 3560 (class 2604 OID 19046)
-- Name: server_config id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.server_config ALTER COLUMN id SET DEFAULT nextval('public.server_config_id_seq'::regclass);


--
-- TOC entry 3568 (class 2604 OID 19047)
-- Name: ship_requirements id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_requirements ALTER COLUMN id SET DEFAULT nextval('public.ship_requirements_id_seq'::regclass);


--
-- TOC entry 3570 (class 2604 OID 19048)
-- Name: ship_types id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_types ALTER COLUMN id SET DEFAULT nextval('public.ship_types_id_seq'::regclass);


--
-- TOC entry 3583 (class 2604 OID 19049)
-- Name: technologies id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technologies ALTER COLUMN id SET DEFAULT nextval('public.technologies_id_seq'::regclass);


--
-- TOC entry 3591 (class 2604 OID 19050)
-- Name: technology_requirements id; Type: DEFAULT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technology_requirements ALTER COLUMN id SET DEFAULT nextval('public.technology_requirements_id_seq'::regclass);


--
-- TOC entry 3918 (class 0 OID 18375)
-- Dependencies: 230
-- Data for Name: achievement; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.achievement (id, achievement_key, name, description, category, icon, color, condition_type, condition_target, condition_value, points, rarity, display_order, is_active) FROM stdin;
b0000001-0000-0000-0000-000000000001	first_attack	Premier sang	Lancez votre première attaque	combat	⚔️	#ef4444	count	attacks	1	10	common	1	t
b0000001-0000-0000-0000-000000000002	attacks_10	Guerrier	Lancez 10 attaques	combat	🗡️	#f97316	count	attacks	10	25	uncommon	2	t
b0000001-0000-0000-0000-000000000003	attacks_50	Commandant	Lancez 50 attaques	combat	⚡	#8b5cf6	count	attacks	50	50	rare	3	t
b0000001-0000-0000-0000-000000000004	victories_25	Invincible	Gagnez 25 combats	combat	🏆	#eab308	count	victories	25	100	epic	4	t
b0000001-0000-0000-0000-000000000005	metal_100k	Mineur de bronze	Collectez 100 000 de métal au total	economy	🪨	#78716c	threshold	total_metal	100000	10	common	10	t
b0000001-0000-0000-0000-000000000006	metal_1m	Mineur d'argent	Collectez 1 000 000 de métal au total	economy	⛏️	#a8a29e	threshold	total_metal	1000000	50	rare	11	t
b0000001-0000-0000-0000-000000000007	buildings_10	Architecte	Construisez 10 bâtiments	economy	🏗️	#3b82f6	count	buildings	10	25	uncommon	15	t
b0000001-0000-0000-0000-000000000008	expeditions_10	Explorateur	Complétez 10 expéditions	exploration	🚀	#06b6d4	count	expeditions	10	25	uncommon	20	t
b0000001-0000-0000-0000-000000000009	expeditions_50	Pionnier	Complétez 50 expéditions	exploration	🌟	#8b5cf6	count	expeditions	50	75	rare	21	t
b0000001-0000-0000-0000-000000000010	spy_missions_20	Maître espion	Réalisez 20 missions d'espionnage	exploration	🕵️	#1e293b	count	spy_missions	20	50	rare	22	t
b0000001-0000-0000-0000-000000000011	join_alliance	Diplomate	Rejoignez une alliance	social	🤝	#22c55e	unique	alliance_join	1	15	common	30	t
b0000001-0000-0000-0000-000000000012	create_alliance	Fondateur	Créez votre propre alliance	social	👑	#eab308	unique	alliance_create	1	50	rare	31	t
b0000001-0000-0000-0000-000000000013	messages_50	Communicateur	Envoyez 50 messages	social	💬	#64748b	count	messages	50	25	uncommon	32	t
b0000001-0000-0000-0000-000000000014	streak_7	Habitué	Connectez-vous 7 jours consécutifs	special	🔥	#f97316	threshold	login_streak	7	30	uncommon	40	t
b0000001-0000-0000-0000-000000000015	streak_30	Vétéran	Connectez-vous 30 jours consécutifs	special	💎	#06b6d4	threshold	login_streak	30	100	epic	41	t
b0000001-0000-0000-0000-000000000016	fleet_100	Amiral	Possédez 100 vaisseaux simultanément	special	🛸	#8b5cf6	threshold	total_ships	100	75	rare	42	t
b0000001-0000-0000-0000-000000000017	conquer_planet	Conquérant suprême	Conquérez une planète ennemie	special	🌍	#dc2626	unique	planet_conquered	1	150	legendary	50	t
\.


--
-- TOC entry 3919 (class 0 OID 18397)
-- Dependencies: 231
-- Data for Name: alliance; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.alliance (id, name, tag, description, internal_message, leader_id, member_count, total_score, recruitment_policy, min_level_required, created_at, updated_at) FROM stdin;
ae14dac3-b163-4354-afc2-00a21957a2a0	Carlito fucker	CF	un pour tous, tous contre carlito ! =D		96f3d4fb-a9f9-406b-a924-5b7c19f0049c	4	70261	open	0	2026-01-23 02:38:10.935277	2026-01-26 19:20:39.802045
eb9ca441-2adc-4a1c-a913-e885bf3cf2d6	Les Casseurs Floteur	LCF	L'alliance des Casseurs Flowters est une force de frappe atypique qui refuse de choisir entre la performance et le style. Nous ne sommes pas simplement là pour conquérir des territoires ou farmer des donjons ; nous sommes là pour le faire avec une nonchalance calculée.\n	Rejoindre les Casseurs Flowters, c'est accepter d'être un "bandit mouillé" du gaming : on laisse souvent traîner un signe de notre passage (un loot vidé, un camp rasé), mais on le fait toujours avec une certaine élégance.	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	3	758314	open	0	2026-01-22 16:23:07.722679	2026-03-02 00:14:21.705664
\.


--
-- TOC entry 3920 (class 0 OID 18416)
-- Dependencies: 232
-- Data for Name: alliance_invitation; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.alliance_invitation (id, alliance_id, user_id, invitation_type, status, message, invited_by, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 3921 (class 0 OID 18428)
-- Dependencies: 233
-- Data for Name: alliance_member; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.alliance_member (id, alliance_id, user_id, role, score, joined_at, last_active) FROM stdin;
4655a7f0-6c04-4149-9f11-40621d1762f6	eb9ca441-2adc-4a1c-a913-e885bf3cf2d6	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	leader	23963	2026-01-22 16:23:07.722679	2026-01-22 16:23:07.722679
8b94893f-e70a-493f-a367-24df479f4ac2	ae14dac3-b163-4354-afc2-00a21957a2a0	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	leader	34390	2026-01-23 02:38:10.935277	2026-01-23 02:38:10.935277
ad7b6803-1a7a-4399-a112-2f13baf830cf	ae14dac3-b163-4354-afc2-00a21957a2a0	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	officer	2700	2026-01-23 18:34:40.612789	2026-01-23 18:34:40.612789
69271dce-bc13-429b-ba6c-2d33bb38273c	ae14dac3-b163-4354-afc2-00a21957a2a0	e77bdc80-958a-4ea9-8167-18b653d265a1	officer	16030	2026-01-23 02:39:23.424025	2026-01-23 02:39:23.424025
83f5fe27-1057-4c88-be1c-46f3065fe115	ae14dac3-b163-4354-afc2-00a21957a2a0	6bfe5069-b203-4bd1-b92a-5648543065a3	officer	17141	2026-01-23 02:39:17.266839	2026-01-23 02:39:17.266839
98bfbcc8-1d0b-4d25-b0e6-beb437005e0d	eb9ca441-2adc-4a1c-a913-e885bf3cf2d6	5c07a266-2739-4999-80c4-bcbf67b81466	member	726266	2026-01-26 19:33:44.698119	2026-01-26 19:33:44.698119
e90e6205-c495-45a1-89df-b0e3c489a8f7	eb9ca441-2adc-4a1c-a913-e885bf3cf2d6	e0105e0b-ef87-4ef1-b511-29aa73b054e0	member	8085	2026-03-02 00:14:21.705664	2026-03-02 00:14:21.705664
\.


--
-- TOC entry 3922 (class 0 OID 18440)
-- Dependencies: 234
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.announcements (id, title, content, type, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3924 (class 0 OID 18457)
-- Dependencies: 236
-- Data for Name: building_requirements; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.building_requirements (id, building_type_id, required_tech_id, required_building_id, required_level) FROM stdin;
1	5	1	\N	3
2	8	\N	7	2
3	11	\N	7	1
4	12	11	\N	10
5	12	\N	7	10
6	13	1	\N	12
\.


--
-- TOC entry 3926 (class 0 OID 18464)
-- Dependencies: 238
-- Data for Name: building_types; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.building_types (id, building_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, base_time_seconds, cost_multiplier, description, created_at) FROM stdin;
9	resource_storage	Stockage de Ressources	facility	1000	0	0	1440	2	Augmente la capacité de stockage	2026-01-21 14:18:53.189964
12	nanite_factory	Usine de Nanites	facility	1000000	500000	100000	2160000	2	Accélère toutes les constructions	2026-01-21 14:18:53.189964
10	alliance_depot	Dépôt d'Alliance	facility	20000	40000	0	1000000	2	Permet le ravitaillement allié	2026-01-21 14:18:53.189964
11	missile_silo	Silo à Missiles	facility	6000000	3000000	1500000	57600	2	Lance des missiles interplanétaires	2026-01-21 14:18:53.189964
1	metal_mine	Mine de Métal	resource	600	15	0	108	1.5	Extrait le métal des astéroïdes	2026-01-21 14:18:53.189964
2	crystal_mine	Mine de Cristal	resource	600	24	0	103	1.6	Collecte les cristaux précieux	2026-01-21 14:18:53.189964
3	deuterium_mine	Synthétiseur de Deutérium	resource	600	75	0	432	1.5	Produit du deutérium	2026-01-21 14:18:53.189964
4	solar_plant	Centrale Solaire	resource	200	30	0	151	1.5	Génère de l'énergie	2026-01-21 14:18:53.189964
5	fusion_plant	Centrale à Fusion	resource	2000	360	180	1814	1.8	Centrale énergétique avancée	2026-01-21 14:18:53.189964
6	research_lab	Laboratoire de Recherche	facility	600	400	200	864	2	Permet les recherches technologiques	2026-01-21 14:18:53.189964
7	shipyard	Chantier Spatial	facility	600	200	100	864	2	Construit des vaisseaux	2026-01-21 14:18:53.189964
8	hangar	Hangar	facility	600	0	50	360	2	Stocke les vaisseaux	2026-01-21 14:18:53.189964
13	terraformer	Terraformeur	facility	50000	50000	100000	72000	2	Augmente les cases de construction	2026-01-21 14:18:53.189964
\.


--
-- TOC entry 3928 (class 0 OID 18481)
-- Dependencies: 240
-- Data for Name: casus_belli; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.casus_belli (id, victim_user_id, aggressor_user_id, reason, created_at, expires_at, was_used) FROM stdin;
\.


--
-- TOC entry 3929 (class 0 OID 18495)
-- Dependencies: 241
-- Data for Name: combat_log; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.combat_log (id, planet_id, target_name, mission_type, result, loot_metal, loot_crystal, ships_lost, date, opponent_username, detailed_report) FROM stdin;
d417ff75-8660-43e8-8612-8d93f40c4c0e	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-22 03:19:43.948054	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
1ff74799-33a2-4beb-96dd-4bbef96a8eab	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	12000	4800	0	2026-01-22 03:20:04.273009	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +12000 Métal, +4800 Cristal, +2400 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +12000 Métal, +4800 Cristal, +2400 Deutérium"], "loot": {"metal": 12000.0, "crystal": 4800.0, "deuterium": 2400.0}, "result": "calm", "winner": "calm", "loot_metal": 12000.0, "ships_lost": 0, "loot_crystal": 4800.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 2400.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 20}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 20}, "defender_remaining": {}}
1de493f0-7f8c-4948-b747-dc6be00e82cf	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	12	2026-01-22 03:42:19.35562	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 51%)", "HOSTILES : 4 Chasseur Lourd, 13 Chasseur Léger", "TOUR 1: Nous infligeons 500 dmg. Pirates ripostent avec 230 dmg.", "TOUR 2: Nous infligeons 465 dmg. Pirates ripostent avec 195 dmg.", "TOUR 3: Nous infligeons 430 dmg. Pirates ripostent avec 160 dmg.", "TOUR 4: Nous infligeons 395 dmg. Pirates ripostent avec 125 dmg.", "TOUR 5: Nous infligeons 360 dmg. Pirates ripostent avec 90 dmg.", "TOUR 6: Nous infligeons 325 dmg. Pirates ripostent avec 80 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 51%)", "HOSTILES : 4 Chasseur Lourd, 13 Chasseur Léger", "TOUR 1: Nous infligeons 500 dmg. Pirates ripostent avec 230 dmg.", "TOUR 2: Nous infligeons 465 dmg. Pirates ripostent avec 195 dmg.", "TOUR 3: Nous infligeons 430 dmg. Pirates ripostent avec 160 dmg.", "TOUR 4: Nous infligeons 395 dmg. Pirates ripostent avec 125 dmg.", "TOUR 5: Nous infligeons 360 dmg. Pirates ripostent avec 90 dmg.", "TOUR 6: Nous infligeons 325 dmg. Pirates ripostent avec 80 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 12, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 12, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 10, "light_hunter": 25}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 4, "light_hunter": 19}, "defender_remaining": {}}
b3c73afd-2852-4c06-829f-9a7404be511e	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6600	2640	0	2026-01-22 03:42:53.83863	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "loot": {"metal": 6600.0, "crystal": 2640.0, "deuterium": 1320.0}, "result": "calm", "winner": "calm", "loot_metal": 6600.0, "ships_lost": 0, "loot_crystal": 2640.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1320.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 9}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 9}, "defender_remaining": {}}
c8a69396-8b51-46eb-9560-0bad08e43985	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6600	2640	0	2026-01-22 03:42:59.936698	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "loot": {"metal": 6600.0, "crystal": 2640.0, "deuterium": 1320.0}, "result": "calm", "winner": "calm", "loot_metal": 6600.0, "ships_lost": 0, "loot_crystal": 2640.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1320.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 9}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 9}, "defender_remaining": {}}
86dbc2a4-8287-4568-89a3-7359dd994953	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	8	2026-01-22 03:43:04.248186	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 92%)", "HOSTILES : 2 Chasseur Lourd, 9 Chasseur Léger", "TOUR 1: Nous infligeons 140 dmg. Pirates ripostent avec 140 dmg.", "TOUR 2: Nous infligeons 105 dmg. Pirates ripostent avec 105 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 92%)", "HOSTILES : 2 Chasseur Lourd, 9 Chasseur Léger", "TOUR 1: Nous infligeons 140 dmg. Pirates ripostent avec 140 dmg.", "TOUR 2: Nous infligeons 105 dmg. Pirates ripostent avec 105 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 8, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 8, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 9}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 3}, "defender_remaining": {}}
ac5360ad-b49a-4e66-98ac-92081e50330e	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	9000	3600	0	2026-01-22 03:43:18.422306	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9000 Métal, +3600 Cristal, +1800 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9000 Métal, +3600 Cristal, +1800 Deutérium"], "loot": {"metal": 9000.0, "crystal": 3600.0, "deuterium": 1800.0}, "result": "calm", "winner": "calm", "loot_metal": 9000.0, "ships_lost": 0, "loot_crystal": 3600.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1800.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 13}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 13}, "defender_remaining": {}}
bb0dd1aa-4d87-40e5-a19b-833762ae4782	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 23:01:05.138632	Carlito89	\N
ca55b76f-df84-405d-8816-b9831159448f	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 23:03:24.736757	Carlito89	\N
e09597fb-c0a1-4aa9-9a9a-a50dbe73d73b	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	9000	3600	0	2026-01-22 03:43:25.327648	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9000 Métal, +3600 Cristal, +1800 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9000 Métal, +3600 Cristal, +1800 Deutérium"], "loot": {"metal": 9000.0, "crystal": 3600.0, "deuterium": 1800.0}, "result": "calm", "winner": "calm", "loot_metal": 9000.0, "ships_lost": 0, "loot_crystal": 3600.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1800.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 13}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 13}, "defender_remaining": {}}
ac2e447a-579b-4790-bd8b-12c93668f209	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	7800	3120	0	2026-01-22 03:44:35.743052	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "loot": {"metal": 7800.0, "crystal": 3120.0, "deuterium": 1560.0}, "result": "calm", "winner": "calm", "loot_metal": 7800.0, "ships_lost": 0, "loot_crystal": 3120.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1560.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 13}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 13}, "defender_remaining": {}}
5895bd2f-8777-46e7-81fe-2f4d4750d549	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	7800	3120	0	2026-01-22 03:44:41.507326	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "loot": {"metal": 7800.0, "crystal": 3120.0, "deuterium": 1560.0}, "result": "calm", "winner": "calm", "loot_metal": 7800.0, "ships_lost": 0, "loot_crystal": 3120.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1560.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 13}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 13}, "defender_remaining": {}}
22530d87-eabb-4d76-bd6e-85400ac610b6	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 03:44:46.236458	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 66%)", "HOSTILES : 9 Chasseur Léger", "TOUR 1: Nous infligeons 130 dmg. Pirates ripostent avec 90 dmg.", "TOUR 2: Nous infligeons 120 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 110 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 66%)", "HOSTILES : 9 Chasseur Léger", "TOUR 1: Nous infligeons 130 dmg. Pirates ripostent avec 90 dmg.", "TOUR 2: Nous infligeons 120 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 110 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 13}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 7}, "defender_remaining": {}}
9b3c2df0-60bd-415d-a71b-e9508f400c7f	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	5400	2160	0	2026-01-22 03:46:23.333716	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "loot": {"metal": 5400.0, "crystal": 2160.0, "deuterium": 1080.0}, "result": "calm", "winner": "calm", "loot_metal": 5400.0, "ships_lost": 0, "loot_crystal": 2160.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1080.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 7}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 7}, "defender_remaining": {}}
9842e7d8-01ae-4349-b9ef-f6f06047c5ab	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 03:56:27.844821	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 105%)", "HOSTILES : 30 Chasseur Léger", "TOUR 1: Nous infligeons 280 dmg. Pirates ripostent avec 300 dmg.", "TOUR 2: Nous infligeons 270 dmg. Pirates ripostent avec 290 dmg.", "TOUR 3: Nous infligeons 260 dmg. Pirates ripostent avec 280 dmg.", "TOUR 4: Nous infligeons 250 dmg. Pirates ripostent avec 270 dmg.", "TOUR 5: Nous infligeons 240 dmg. Pirates ripostent avec 260 dmg.", "TOUR 6: Nous infligeons 230 dmg. Pirates ripostent avec 250 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 105%)", "HOSTILES : 30 Chasseur Léger", "TOUR 1: Nous infligeons 280 dmg. Pirates ripostent avec 300 dmg.", "TOUR 2: Nous infligeons 270 dmg. Pirates ripostent avec 290 dmg.", "TOUR 3: Nous infligeons 260 dmg. Pirates ripostent avec 280 dmg.", "TOUR 4: Nous infligeons 250 dmg. Pirates ripostent avec 270 dmg.", "TOUR 5: Nous infligeons 240 dmg. Pirates ripostent avec 260 dmg.", "TOUR 6: Nous infligeons 230 dmg. Pirates ripostent avec 250 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 28}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 22}, "defender_remaining": {}}
9bbc395d-fc63-41a9-a10f-3a1a518e0e6f	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 10:10:46.503282	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
b364f656-cf31-446f-9b81-4d5ce31652a6	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 23:01:27.03846	Carlito89	\N
ec0759ec-2587-4923-a640-15eb68ae3794	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 01:41:21.339024	Carlito89	\N
daaec201-339c-4c96-b178-78f6a24634eb	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Broute moules	spy_defense	alert	0	0	0	2026-01-24 02:21:14.529653	Lapin en rute	\N
729e2c67-f3d2-40f4-9360-cc1f53753ba3	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	4200	1680	0	2026-01-22 03:45:10.922291	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4200 Métal, +1680 Cristal, +840 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4200 Métal, +1680 Cristal, +840 Deutérium"], "loot": {"metal": 4200.0, "crystal": 1680.0, "deuterium": 840.0}, "result": "calm", "winner": "calm", "loot_metal": 4200.0, "ships_lost": 0, "loot_crystal": 1680.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 840.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 7}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 7}, "defender_remaining": {}}
2aaedfb5-dcfc-48bc-a2ff-1d02858a7397	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	5400	2160	0	2026-01-22 03:46:30.750471	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "loot": {"metal": 5400.0, "crystal": 2160.0, "deuterium": 1080.0}, "result": "calm", "winner": "calm", "loot_metal": 5400.0, "ships_lost": 0, "loot_crystal": 2160.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1080.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 7}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 7}, "defender_remaining": {}}
2670f8e6-d490-4685-8aa2-17e4c719d5ba	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 03:56:18.579107	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 89%)", "HOSTILES : 31 Chasseur Léger", "TOUR 1: Nous infligeons 340 dmg. Pirates ripostent avec 310 dmg.", "TOUR 2: Nous infligeons 330 dmg. Pirates ripostent avec 300 dmg.", "TOUR 3: Nous infligeons 320 dmg. Pirates ripostent avec 290 dmg.", "TOUR 4: Nous infligeons 310 dmg. Pirates ripostent avec 280 dmg.", "TOUR 5: Nous infligeons 300 dmg. Pirates ripostent avec 270 dmg.", "TOUR 6: Nous infligeons 290 dmg. Pirates ripostent avec 260 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 89%)", "HOSTILES : 31 Chasseur Léger", "TOUR 1: Nous infligeons 340 dmg. Pirates ripostent avec 310 dmg.", "TOUR 2: Nous infligeons 330 dmg. Pirates ripostent avec 300 dmg.", "TOUR 3: Nous infligeons 320 dmg. Pirates ripostent avec 290 dmg.", "TOUR 4: Nous infligeons 310 dmg. Pirates ripostent avec 280 dmg.", "TOUR 5: Nous infligeons 300 dmg. Pirates ripostent avec 270 dmg.", "TOUR 6: Nous infligeons 290 dmg. Pirates ripostent avec 260 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 34}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 28}, "defender_remaining": {}}
0f66942f-6aef-4e4b-b06c-3b23c03535da	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-22 03:57:22.771927	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 3}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 3}, "defender_remaining": {}}
613a7cb4-1c17-4231-80da-167765cff937	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 03:56:35.305219	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 51%)", "HOSTILES : 12 Chasseur Léger", "TOUR 1: Nous infligeons 220 dmg. Pirates ripostent avec 120 dmg.", "TOUR 2: Nous infligeons 210 dmg. Pirates ripostent avec 110 dmg.", "TOUR 3: Nous infligeons 200 dmg. Pirates ripostent avec 100 dmg.", "TOUR 4: Nous infligeons 190 dmg. Pirates ripostent avec 90 dmg.", "TOUR 5: Nous infligeons 180 dmg. Pirates ripostent avec 80 dmg.", "TOUR 6: Nous infligeons 170 dmg. Pirates ripostent avec 70 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 51%)", "HOSTILES : 12 Chasseur Léger", "TOUR 1: Nous infligeons 220 dmg. Pirates ripostent avec 120 dmg.", "TOUR 2: Nous infligeons 210 dmg. Pirates ripostent avec 110 dmg.", "TOUR 3: Nous infligeons 200 dmg. Pirates ripostent avec 100 dmg.", "TOUR 4: Nous infligeons 190 dmg. Pirates ripostent avec 90 dmg.", "TOUR 5: Nous infligeons 180 dmg. Pirates ripostent avec 80 dmg.", "TOUR 6: Nous infligeons 170 dmg. Pirates ripostent avec 70 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 22}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 16}, "defender_remaining": {}}
7313feac-3aed-47a5-817b-40e9c6eb297f	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	9600	3840	0	2026-01-22 03:56:42.341171	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9600 Métal, +3840 Cristal, +1920 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +9600 Métal, +3840 Cristal, +1920 Deutérium"], "loot": {"metal": 9600.0, "crystal": 3840.0, "deuterium": 1920.0}, "result": "calm", "winner": "calm", "loot_metal": 9600.0, "ships_lost": 0, "loot_crystal": 3840.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1920.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 16}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 16}, "defender_remaining": {}}
1f44d68a-28e2-4cb4-b4a6-a6b2be77d83d	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	8	2026-01-22 03:57:00.330186	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 1 Recycleur, 10 Chasseur Léger", "TOUR 1: Nous infligeons 1100 dmg. Pirates ripostent avec 1100 dmg.", "TOUR 2: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 1 Recycleur, 10 Chasseur Léger", "TOUR 1: Nous infligeons 1100 dmg. Pirates ripostent avec 1100 dmg.", "TOUR 2: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 8, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 8, "defender_losses": 0, "attacker_initial": {"recycler": 1, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 3}, "defender_remaining": {}}
73d82b61-c98d-4099-80fa-03f35ecd1702	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-22 03:57:15.766989	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 2, "light_hunter": 3}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 2, "light_hunter": 3}, "defender_remaining": {}}
40b22be0-36d2-46c6-9c27-d66c99634223	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 03:56:50.237616	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 99%)", "HOSTILES : 16 Chasseur Léger", "TOUR 1: Nous infligeons 160 dmg. Pirates ripostent avec 160 dmg.", "TOUR 2: Nous infligeons 150 dmg. Pirates ripostent avec 150 dmg.", "TOUR 3: Nous infligeons 140 dmg. Pirates ripostent avec 140 dmg.", "TOUR 4: Nous infligeons 130 dmg. Pirates ripostent avec 130 dmg.", "TOUR 5: Nous infligeons 120 dmg. Pirates ripostent avec 120 dmg.", "TOUR 6: Nous infligeons 110 dmg. Pirates ripostent avec 110 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 99%)", "HOSTILES : 16 Chasseur Léger", "TOUR 1: Nous infligeons 160 dmg. Pirates ripostent avec 160 dmg.", "TOUR 2: Nous infligeons 150 dmg. Pirates ripostent avec 150 dmg.", "TOUR 3: Nous infligeons 140 dmg. Pirates ripostent avec 140 dmg.", "TOUR 4: Nous infligeons 130 dmg. Pirates ripostent avec 130 dmg.", "TOUR 5: Nous infligeons 120 dmg. Pirates ripostent avec 120 dmg.", "TOUR 6: Nous infligeons 110 dmg. Pirates ripostent avec 110 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 16}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
1759bd76-d078-4727-b36a-aadf4d3708e5	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 04:47:12.928796	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 73%)", "HOSTILES : 15 Chasseur Léger", "TOUR 1: Nous infligeons 200 dmg. Pirates ripostent avec 150 dmg.", "TOUR 2: Nous infligeons 190 dmg. Pirates ripostent avec 140 dmg.", "TOUR 3: Nous infligeons 180 dmg. Pirates ripostent avec 130 dmg.", "TOUR 4: Nous infligeons 170 dmg. Pirates ripostent avec 120 dmg.", "TOUR 5: Nous infligeons 160 dmg. Pirates ripostent avec 110 dmg.", "TOUR 6: Nous infligeons 150 dmg. Pirates ripostent avec 100 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 73%)", "HOSTILES : 15 Chasseur Léger", "TOUR 1: Nous infligeons 200 dmg. Pirates ripostent avec 150 dmg.", "TOUR 2: Nous infligeons 190 dmg. Pirates ripostent avec 140 dmg.", "TOUR 3: Nous infligeons 180 dmg. Pirates ripostent avec 130 dmg.", "TOUR 4: Nous infligeons 170 dmg. Pirates ripostent avec 120 dmg.", "TOUR 5: Nous infligeons 160 dmg. Pirates ripostent avec 110 dmg.", "TOUR 6: Nous infligeons 150 dmg. Pirates ripostent avec 100 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 20}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 14}, "defender_remaining": {}}
58e3b73a-1ffb-4198-a01c-3cd66163bcdb	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	8400	3360	0	2026-01-22 04:47:31.267502	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +8400 Métal, +3360 Cristal, +1680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +8400 Métal, +3360 Cristal, +1680 Deutérium"], "loot": {"metal": 8400.0, "crystal": 3360.0, "deuterium": 1680.0}, "result": "calm", "winner": "calm", "loot_metal": 8400.0, "ships_lost": 0, "loot_crystal": 3360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 14}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 14}, "defender_remaining": {}}
a1be9457-5f39-4ef9-bb5e-2a1ded9e6d9b	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 10:10:17.539751	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
f5dea28a-5b2a-4b11-bdde-bd298d402b7d	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 10:10:30.830494	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
e1c9ee5c-3947-4a0a-b5a1-8cc38dad9392	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 10:10:34.867196	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
cd89d140-e778-483a-8927-4fd961cd6246	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 10:10:39.662068	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
e098dbf7-e63c-4068-bbb3-39e1f4691984	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 23:12:41.63391	Carlito89	\N
f64e5047-532d-4731-afbc-b4bfd49c6379	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-24 02:19:01.431924	Tomdindon	\N
6e701436-fd2c-465b-92b2-7cb01da3a96a	e777dba1-794e-46cd-aca8-908ad8948537	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-01-28 22:01:55.067621	ChupaChups	{"type": "spy_alert", "coordinates": "[1:9:10]", "attacker_planet": "Spinach XX (Homeworld)", "attacker_player": "ChupaChups"}
924bb611-7ce8-47e0-a5f5-cfe2b39eeca1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 10:11:21.214074	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
c565ebeb-e363-4828-9033-08ed5b614551	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 10:11:26.750326	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
a366f19d-f8de-465d-96b3-07d356831bd2	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 10:11:29.266477	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
42805848-6901-4baa-8e2e-62e61a5ba4e4	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 10:11:31.556306	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
e6c1fff4-18bb-4746-af4e-aea168e3f9a3	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 10:11:34.766421	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
a3183f51-7503-473a-8938-1f7d7ec545d1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	draw	0	0	1	2026-01-22 10:14:41.516466	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 57%)", "HOSTILES : 1 Croiseur", "TOUR 1: Nous infligeons 400 dmg. Pirates ripostent avec 400 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 57%)", "HOSTILES : 1 Croiseur", "TOUR 1: Nous infligeons 400 dmg. Pirates ripostent avec 400 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"cruiser": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
b27fc002-77bb-4c43-8057-4a2ba525a7cc	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	draw	0	0	2	2026-01-22 10:11:37.100159	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 81%)", "HOSTILES : 1 Chasseur Léger, 1 Chasseur Lourd", "TOUR 1: Nous infligeons 35 dmg. Pirates ripostent avec 35 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 81%)", "HOSTILES : 1 Chasseur Léger, 1 Chasseur Lourd", "TOUR 1: Nous infligeons 35 dmg. Pirates ripostent avec 35 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 2, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 2, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
9e52bc85-2ae0-4f8b-9717-4e43b230baf5	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-22 15:06:13.635933	Carlito89	\N
4be42a98-33c5-4f54-865f-1c35ba785cef	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-22 15:06:30.928758	Carlito89	\N
11e300b8-937d-4404-9874-f56891acfba2	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Secteur Inconnu	expedition	calm	4800	1920	0	2026-01-22 15:08:21.115379	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4800 Métal, +1920 Cristal, +960 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4800 Métal, +1920 Cristal, +960 Deutérium"], "loot": {"metal": 4800.0, "crystal": 1920.0, "deuterium": 960.0}, "result": "calm", "winner": "calm", "loot_metal": 4800.0, "ships_lost": 0, "loot_crystal": 1920.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 960.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 8}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 8}, "defender_remaining": {}}
2f3c3099-e919-4f06-a682-35f378027510	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-01-22 15:12:39.442466	ChupaChups	\N
715132a5-7a2b-48b1-aedc-878ca78a6607	c34a3382-e6eb-4f51-8d48-021102098f85	Secteur Inconnu	expedition	calm	5400	2160	0	2026-01-22 16:43:08.613193	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +5400 Métal, +2160 Cristal, +1080 Deutérium"], "loot": {"metal": 5400.0, "crystal": 2160.0, "deuterium": 1080.0}, "result": "calm", "winner": "calm", "loot_metal": 5400.0, "ships_lost": 0, "loot_crystal": 2160.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1080.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"spy_probe": 3, "colony_ship": 1, "transporter": 5}, "defender_initial": {}, "attacker_remaining": {"spy_probe": 3, "colony_ship": 1, "transporter": 5}, "defender_remaining": {}}
e71df57a-af99-479a-b7f7-a2c3c97251d1	c34a3382-e6eb-4f51-8d48-021102098f85	Secteur Inconnu	expedition	victory	5000	2000	8	2026-01-22 16:43:22.77176	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 68%)", "HOSTILES : 1 Vaisseau de Colonisation, 4 Transporteur, 3 Sonde Espionnage", "TOUR 1: Nous infligeons 2540 dmg. Pirates ripostent avec 2535 dmg.", "TOUR 2: Nous infligeons 15 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 68%)", "HOSTILES : 1 Vaisseau de Colonisation, 4 Transporteur, 3 Sonde Espionnage", "TOUR 1: Nous infligeons 2540 dmg. Pirates ripostent avec 2535 dmg.", "TOUR 2: Nous infligeons 15 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 8, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 8, "defender_losses": 0, "attacker_initial": {"spy_probe": 3, "colony_ship": 1, "transporter": 5}, "defender_initial": {}, "attacker_remaining": {"transporter": 1}, "defender_remaining": {}}
9b129de0-c23e-4a07-85b0-c5b991400237	072a1afe-dd24-4087-9e95-bf753f2cf07f	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-22 18:59:34.540814	Carlito89	\N
0c25ae4a-172b-4704-97f6-7f66eb7e8f03	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	600	240	0	2026-01-22 22:18:46.584963	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
f8eeddba-ba0e-4856-909f-074211758e91	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	4800	1920	0	2026-01-22 22:19:28.503647	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4800 Métal, +1920 Cristal, +960 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +4800 Métal, +1920 Cristal, +960 Deutérium"], "loot": {"metal": 4800.0, "crystal": 1920.0, "deuterium": 960.0}, "result": "calm", "winner": "calm", "loot_metal": 4800.0, "ships_lost": 0, "loot_crystal": 1920.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 960.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 8}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 8}, "defender_remaining": {}}
0b9d15eb-82a1-4451-920a-710ab08c36b8	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:53:10.541338	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
e3594d3d-6e9c-4560-937b-9a1410cdee2c	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:53:57.937987	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
470b9a06-c8ba-4826-94e0-52c8ee3befe9	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	draw	0	0	6	2026-01-22 22:19:39.369629	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 92%)", "HOSTILES : 8 Chasseur Léger", "TOUR 1: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 2: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 3: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 4: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 5: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 6: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 92%)", "HOSTILES : 8 Chasseur Léger", "TOUR 1: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 2: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 3: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 4: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 5: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 6: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 8}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 2}, "defender_remaining": {}}
df369e8c-7704-41cc-85ba-6b652ba52fa5	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	1200	480	0	2026-01-22 22:57:31.93515	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1200 Métal, +480 Cristal, +240 Deutérium"], "loot": {"metal": 1200.0, "crystal": 480.0, "deuterium": 240.0}, "result": "calm", "winner": "calm", "loot_metal": 1200.0, "ships_lost": 0, "loot_crystal": 480.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 240.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
be4c6cfb-f217-4558-bf00-8db22db3cc7a	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	defeat	0	0	2	2026-01-22 22:57:45.644154	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 104%)", "HOSTILES : 1 Chasseur Lourd, 2 Chasseur Léger", "TOUR 1: Nous infligeons 35 dmg. Pirates ripostent avec 45 dmg.", "DÉFAITE : Contact perdu avec notre flotte."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 104%)", "HOSTILES : 1 Chasseur Lourd, 2 Chasseur Léger", "TOUR 1: Nous infligeons 35 dmg. Pirates ripostent avec 45 dmg.", "DÉFAITE : Contact perdu avec notre flotte."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "defeat", "winner": "defeat", "loot_metal": 0.0, "ships_lost": 2, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 2, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
c5d6dc74-8280-4f16-aba5-fe2ea30d539e	e777dba1-794e-46cd-aca8-908ad8948537	Secteur Inconnu	expedition	draw	0	0	10	2026-01-22 23:20:52.893797	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 95%)", "HOSTILES : 3 Transporteur, 2 Chasseur Lourd, 5 Chasseur Léger", "TOUR 1: Nous infligeons 115 dmg. Pirates ripostent avec 115 dmg.", "TOUR 2: Nous infligeons 75 dmg. Pirates ripostent avec 75 dmg.", "TOUR 3: Nous infligeons 35 dmg. Pirates ripostent avec 35 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 95%)", "HOSTILES : 3 Transporteur, 2 Chasseur Lourd, 5 Chasseur Léger", "TOUR 1: Nous infligeons 115 dmg. Pirates ripostent avec 115 dmg.", "TOUR 2: Nous infligeons 75 dmg. Pirates ripostent avec 75 dmg.", "TOUR 3: Nous infligeons 35 dmg. Pirates ripostent avec 35 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 10, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 10, "defender_losses": 0, "attacker_initial": {"transporter": 3, "heavy_hunter": 2, "light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
510e9c6c-73c7-4eb1-9ae9-a170a2291dad	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	victory	5000	2000	12	2026-01-22 23:22:03.942038	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 68%)", "HOSTILES : 5 Vaisseau de Guerre, 7 Croiseur, 5 Chasseur Lourd, 7 Chasseur Léger", "TOUR 1: Nous infligeons 14350 dmg. Pirates ripostent avec 7995 dmg.", "TOUR 2: Nous infligeons 12915 dmg. Pirates ripostent avec 5125 dmg.", "TOUR 3: Nous infligeons 11480 dmg. Pirates ripostent avec 2255 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 68%)", "HOSTILES : 5 Vaisseau de Guerre, 7 Croiseur, 5 Chasseur Lourd, 7 Chasseur Léger", "TOUR 1: Nous infligeons 14350 dmg. Pirates ripostent avec 7995 dmg.", "TOUR 2: Nous infligeons 12915 dmg. Pirates ripostent avec 5125 dmg.", "TOUR 3: Nous infligeons 11480 dmg. Pirates ripostent avec 2255 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 12, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 12, "defender_losses": 0, "attacker_initial": {"cruiser": 10, "battleship": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"cruiser": 7, "battleship": 7, "heavy_hunter": 7, "light_hunter": 7}, "defender_remaining": {}}
fe18a353-33d7-497e-971b-f31c3b4fbad3	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-01-22 23:30:20.433253	Gollum	\N
66f87088-f467-4180-9fd2-3cdad93a6dd7	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Kronos Major	spy_defense	alert	0	0	0	2026-01-22 23:31:20.640292	Gollum	\N
f115e628-3bf2-4f7c-bfc5-3d63b3a19695	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-23 00:40:48.445263	Tomdindon	\N
6f15af49-0bb9-440e-b8ca-6575c88b95cd	2477366c-9fd2-4d61-abc6-72cce81e5fee	Broute moules	spy_defense	alert	0	0	0	2026-01-23 02:49:30.651991	Lapin en rute	\N
845a31fb-5b11-472a-afb8-6f65866bdfbc	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-23 02:50:33.733676	Tomdindon	\N
178268d0-a6b3-44b0-8358-d2ade0c78033	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	victory	5000	2000	6	2026-01-23 02:53:42.241507	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 59%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 20 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 59%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 20 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 6, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
676a1908-8c1d-4fb8-986d-5535d1a84e9a	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:53:51.939331	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
161a1885-d5aa-450e-aeef-1ba7e89846fa	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	victory	5000	2000	6	2026-01-23 02:54:02.373285	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 55%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 20 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 55%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 20 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 6, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
b55079f2-55f9-4884-bdab-38cd7d639e89	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-23 02:54:08.742548	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 107%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 107%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
2aae5029-8478-4cd1-ae16-93cce7e1ca52	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:54:13.33365	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
f15093c4-4ccb-427b-bef7-876a87f06857	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:54:21.471634	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
bcdbbc14-a726-4181-8321-487e937e28c4	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	6	2026-01-23 02:54:28.241658	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 10 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 100 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 90 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 10 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 100 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 90 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 80 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 70 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 60 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
d5084a82-7820-43e3-93ce-d9cc4b908681	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:54:39.104686	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
ec6b1a6e-4bf6-4562-9e17-635d0c9764a7	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 02:54:32.90274	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
5f59198b-1d8b-46d2-9c98-1cf20d849e7d	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 03:11:06.397561	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
48193e7d-b592-4d6e-bb05-858da32f1efc	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	11	2026-01-23 03:11:20.234496	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 93%)", "HOSTILES : 2 Recycleur, 10 Chasseur Léger", "TOUR 1: Nous infligeons 2100 dmg. Pirates ripostent avec 2100 dmg.", "TOUR 2: Nous infligeons 1070 dmg. Pirates ripostent avec 1070 dmg.", "TOUR 3: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 4: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 5: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 6: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 93%)", "HOSTILES : 2 Recycleur, 10 Chasseur Léger", "TOUR 1: Nous infligeons 2100 dmg. Pirates ripostent avec 2100 dmg.", "TOUR 2: Nous infligeons 1070 dmg. Pirates ripostent avec 1070 dmg.", "TOUR 3: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 4: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 5: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 6: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 11, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 11, "defender_losses": 0, "attacker_initial": {"recycler": 2, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
1893c995-ab6e-464d-b2a8-a45726533386	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	7200	2880	0	2026-01-23 03:11:33.33119	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7200 Métal, +2880 Cristal, +1440 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7200 Métal, +2880 Cristal, +1440 Deutérium"], "loot": {"metal": 7200.0, "crystal": 2880.0, "deuterium": 1440.0}, "result": "calm", "winner": "calm", "loot_metal": 7200.0, "ships_lost": 0, "loot_crystal": 2880.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1440.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"recycler": 2, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"recycler": 2, "light_hunter": 10}, "defender_remaining": {}}
b0b1f261-2946-42f4-b3a0-d2b09337fea9	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 03:12:01.738011	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
878cb612-7341-4d60-9917-98e7e0057a31	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	10800	4320	0	2026-01-23 03:12:35.743845	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +10800 Métal, +4320 Cristal, +2160 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +10800 Métal, +4320 Cristal, +2160 Deutérium"], "loot": {"metal": 10800.0, "crystal": 4320.0, "deuterium": 2160.0}, "result": "calm", "winner": "calm", "loot_metal": 10800.0, "ships_lost": 0, "loot_crystal": 4320.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 2160.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"recycler": 8, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"recycler": 8, "light_hunter": 10}, "defender_remaining": {}}
ca924ebb-1c0e-46dc-9d96-562aa4457938	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-23 04:17:03.530441	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
762d460e-5512-4571-8ab1-2fbabef2d6e1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1800	720	0	2026-01-23 07:18:00.994071	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1800 Métal, +720 Cristal, +360 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1800 Métal, +720 Cristal, +360 Deutérium"], "loot": {"metal": 1800.0, "crystal": 720.0, "deuterium": 360.0}, "result": "calm", "winner": "calm", "loot_metal": 1800.0, "ships_lost": 0, "loot_crystal": 720.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 360.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"battleship": 1, "heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"battleship": 1, "heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
51e89b86-6734-4476-b34e-1355fd1469a4	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-23 22:49:06.734367	Tomdindon	\N
dcb47e7a-f36b-4f56-b364-fec2c9541f6c	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 01:27:40.733352	Carlito89	\N
93f9c25f-ea71-422a-aa24-1b88b943efd2	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-24 02:20:57.434487	Tomdindon	\N
3ade4264-d81d-4bbb-b3f7-a764fa3ac4fb	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-02-02 07:41:33.088678	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
4b538195-5768-4621-bcfe-8190f5f13f12	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Secteur Inconnu	expedition	calm	1800	720	0	2026-01-23 07:18:12.437383	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1800 Métal, +720 Cristal, +360 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1800 Métal, +720 Cristal, +360 Deutérium"], "loot": {"metal": 1800.0, "crystal": 720.0, "deuterium": 360.0}, "result": "calm", "winner": "calm", "loot_metal": 1800.0, "ships_lost": 0, "loot_crystal": 720.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 360.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"battleship": 1, "heavy_hunter": 1, "light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"battleship": 1, "heavy_hunter": 1, "light_hunter": 1}, "defender_remaining": {}}
50e00259-7418-4e96-b2c5-1e99ce3607b2	e777dba1-794e-46cd-aca8-908ad8948537	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 07:18:48.448614	ChupaChups	\N
86362a66-edc7-4bd9-8547-311d03f95981	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 15:05:56.531581	ChupaChups	\N
27d40398-e023-49e5-8836-592a89b9af30	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-23 18:20:15.174977	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
81132c12-1a3f-4d4d-816b-7131c1701f60	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-23 18:20:28.476674	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
a1c02eac-8ae5-4ef2-a353-38910ba849a0	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-23 18:20:37.745761	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
fc41b816-3353-4433-b582-f8a7acacea3a	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	defeat	0	0	5	2026-01-23 18:20:44.773943	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 106%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 20 dmg.", "DÉFAITE : Contact perdu avec notre flotte."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 106%)", "HOSTILES : 6 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 50 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 40 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 30 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 20 dmg.", "DÉFAITE : Contact perdu avec notre flotte."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "defeat", "winner": "defeat", "loot_metal": 0.0, "ships_lost": 5, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 5, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
d5cda781-8e08-43a6-a9c4-8a44fa040315	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-23 19:19:22.633821	Carlito89	\N
0c6afa55-5e6d-4a2a-a794-29de782d8184	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	victory	5000	2000	4	2026-01-23 19:47:53.274501	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 74%)", "HOSTILES : 4 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 30 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 20 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 74%)", "HOSTILES : 4 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 30 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 20 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 4, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 4, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
fa4ad811-dad2-4a58-a5db-c3b002864a8c	2477366c-9fd2-4d61-abc6-72cce81e5fee	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:18:21.730092	Gollum	\N
acc9fbd2-da20-410a-a62a-d05b8eaebbbd	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:18:49.730915	Gollum	\N
1f2f0ad9-3f4d-4ed4-9637-730e20088359	e777dba1-794e-46cd-aca8-908ad8948537	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-23 22:20:00.539644	Tomdindon	\N
fbb09aa3-9f90-4ca5-ba84-9aeb3f138377	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:45:07.732811	Gollum	\N
e0fa7872-c576-49a9-a9ae-94025eb84bff	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:46:43.640295	Gollum	\N
0bfd7e6b-c64f-4d22-a02e-620c25da88c8	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:47:37.144765	Gollum	\N
6fd84be6-4677-4238-8259-0539aa0c982e	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-23 22:47:43.644983	Tomdindon	\N
fc59294b-158b-46ad-8438-510100f23654	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Kronos Major	spy_defense	alert	0	0	0	2026-01-23 22:48:36.735894	Gollum	\N
59771f21-ae35-43fe-992c-288b0379c3c2	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	57600	23040	0	2026-01-24 02:26:57.030691	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +57600 Métal, +23040 Cristal, +11520 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +57600 Métal, +23040 Cristal, +11520 Deutérium"], "loot": {"metal": 57600.0, "crystal": 23040.0, "deuterium": 11520.0}, "result": "calm", "winner": "calm", "loot_metal": 57600.0, "ships_lost": 0, "loot_crystal": 23040.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 11520.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"cruiser": 10, "recycler": 5, "destroyer": 1, "battleship": 5, "heavy_hunter": 25, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"cruiser": 10, "recycler": 5, "destroyer": 1, "battleship": 5, "heavy_hunter": 25, "light_hunter": 50}, "defender_remaining": {}}
b2d534dd-135b-4683-8c1d-ca9d26f55df5	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-24 02:48:57.333688	Tomdindon	\N
86dcd849-942d-4264-9cd7-9383db6972a4	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-24 02:49:54.841267	Tomdindon	\N
5907cd78-baaf-41d1-9f8c-b679c137337e	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 13:49:41.327077	Carlito89	\N
63427119-5b89-4f72-9d86-f130447b9bf5	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 14:13:32.732573	Carlito89	\N
7824b0fe-9806-4289-8516-54209a265261	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 14:14:30.53254	Carlito89	\N
db03b20b-db51-4876-a712-85cd36411403	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 14:14:56.934363	Carlito89	\N
26c92a63-2a02-4062-8267-343d562b30e0	c34a3382-e6eb-4f51-8d48-021102098f85	Secteur Inconnu	expedition	calm	13200	5280	0	2026-01-24 14:15:46.929653	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +13200 Métal, +5280 Cristal, +2640 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +13200 Métal, +5280 Cristal, +2640 Deutérium"], "loot": {"metal": 13200.0, "crystal": 5280.0, "deuterium": 2640.0}, "result": "calm", "winner": "calm", "loot_metal": 13200.0, "ships_lost": 0, "loot_crystal": 5280.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 2640.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"destroyer": 20, "colony_ship": 1, "transporter": 1}, "defender_initial": {}, "attacker_remaining": {"destroyer": 20, "colony_ship": 1, "transporter": 1}, "defender_remaining": {}}
ebe73f04-bd3e-4ae7-9f43-65f5ca422b10	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-24 14:55:07.034945	Carlito89	\N
e94a39e9-1d1d-49d1-ae57-92360bafb1ea	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-24 18:04:05.03126	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 10}, "defender_remaining": {}}
7e23dcdc-c2a7-4e09-ba95-5f3db736b1e8	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	6	2026-01-24 18:04:38.399241	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 99%)", "HOSTILES : 7 Chasseur Lourd", "TOUR 1: Nous infligeons 250 dmg. Pirates ripostent avec 175 dmg.", "TOUR 2: Nous infligeons 225 dmg. Pirates ripostent avec 150 dmg.", "TOUR 3: Nous infligeons 200 dmg. Pirates ripostent avec 125 dmg.", "TOUR 4: Nous infligeons 175 dmg. Pirates ripostent avec 100 dmg.", "TOUR 5: Nous infligeons 150 dmg. Pirates ripostent avec 75 dmg.", "TOUR 6: Nous infligeons 125 dmg. Pirates ripostent avec 50 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 99%)", "HOSTILES : 7 Chasseur Lourd", "TOUR 1: Nous infligeons 250 dmg. Pirates ripostent avec 175 dmg.", "TOUR 2: Nous infligeons 225 dmg. Pirates ripostent avec 150 dmg.", "TOUR 3: Nous infligeons 200 dmg. Pirates ripostent avec 125 dmg.", "TOUR 4: Nous infligeons 175 dmg. Pirates ripostent avec 100 dmg.", "TOUR 5: Nous infligeons 150 dmg. Pirates ripostent avec 75 dmg.", "TOUR 6: Nous infligeons 125 dmg. Pirates ripostent avec 50 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 4}, "defender_remaining": {}}
e9087f56-6d2d-4166-bfad-26df012e9b16	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:00.822559	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
cab53d06-1e93-4734-b944-ad4147400633	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:06.332628	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
028f554b-e7b2-4014-b9a4-1e36f2bd29a8	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:12.842867	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
9596838b-4840-4be9-8f07-fc073e9c6fa3	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-08 14:54:08.587611	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
c8cc9a29-ce27-4b5a-a493-e6f4492fdea3	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	1	2026-01-24 18:05:20.293284	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 72%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 72%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
ceb3f7de-f6fb-4a06-aa31-36478ec22192	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:58.335207	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
34493a64-d13a-41e0-b0fa-36433519db68	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:06:34.045754	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
5032e695-ef33-418c-bcfc-30bd87d983dd	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	1	2026-01-24 18:06:51.936957	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 65%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 65%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
c8bbc24a-1740-4610-b417-6eee7196c365	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:26.334304	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
6a64fc37-6348-465b-9593-39cf47feac84	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:06:48.130559	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
88fb73ac-ec92-4ef3-9256-984fcc45ff9d	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:34.128921	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
d52bd824-cae5-4c08-a909-7ce51a6ce778	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	1	2026-01-24 18:05:38.579095	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 98%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 98%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
7a8645e2-c8e7-41a7-9c92-41fcff4bf44d	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:06:40.906235	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
26f6d3b1-e294-43d9-8696-83dbea5f0db6	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:41.934056	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
feb6fe4b-403d-4e4c-ad09-e44ce52bbcdf	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:46.719035	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
ffb5e94e-5c44-425a-ad58-890aaff898b8	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	1	2026-01-24 18:05:49.62822	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 56%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 56%)", "HOSTILES : 1 Chasseur Lourd", "TOUR 1: Nous infligeons 25 dmg. Pirates ripostent avec 25 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
9dcd75cd-78db-4f42-a2a3-bb062a7f53bc	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:05:54.230457	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
f7687d9e-8d86-4d26-944c-3e8d7814d5a0	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:06:38.030632	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
a7074c44-8a25-474c-96db-6887f54b4dba	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	600	240	0	2026-01-24 18:06:44.514463	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"heavy_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"heavy_hunter": 1}, "defender_remaining": {}}
4a480b43-8a13-4ac8-b965-ee3f26519811	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Enculator Alpha	spy_defense	alert	0	0	0	2026-01-24 22:21:44.841228	Tomdindon	\N
6adb23f7-00a0-4a62-957b-d55705c4f480	2477366c-9fd2-4d61-abc6-72cce81e5fee	Broute moules	spy_defense	alert	0	0	0	2026-01-24 22:33:11.641745	Lapin en rute	\N
f88d33d8-91e1-42a1-ae70-9e69132d4f78	2477366c-9fd2-4d61-abc6-72cce81e5fee	Broute moules	spy_defense	alert	0	0	0	2026-01-24 22:44:24.637775	Lapin en rute	\N
b8c9ad81-ea72-4e0d-b808-d869069f456e	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	victory	5000	2000	3	2026-01-25 14:31:43.547744	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 53%)", "HOSTILES : 3 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 30 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 20 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 53%)", "HOSTILES : 3 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 30 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 20 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 10 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 3, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 3, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 2}, "defender_remaining": {}}
b15e3340-812b-44a0-bae5-570defa6e74c	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:58.031584	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
d71d8d6c-c681-4360-8ef5-3d8beb2227dc	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-01-26 18:40:04.740101	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -3, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
7d6de400-2760-4275-a1e4-3ed113388806	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	5	2026-01-25 14:31:50.760494	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 88%)", "HOSTILES : 5 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 88%)", "HOSTILES : 5 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 5, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 5, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
a3a04584-6407-409a-8f83-5945ac72ac76	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:00.336089	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
5fbc879b-8efd-423e-b277-8f321276fd93	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:08.97904	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
3099e1fa-8c88-47ce-82d8-cb19b49de979	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:13.689961	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
13a60b2c-6c90-4d94-9003-72c7945ccae0	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:18.031067	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
eac33212-a2cf-4329-bfa5-a9e7888b70a9	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:25.510849	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
4809a002-55eb-459c-9b45-65f4958469af	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	3000	1200	0	2026-01-25 14:32:30.62272	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3000 Métal, +1200 Cristal, +600 Deutérium"], "loot": {"metal": 3000.0, "crystal": 1200.0, "deuterium": 600.0}, "result": "calm", "winner": "calm", "loot_metal": 3000.0, "ships_lost": 0, "loot_crystal": 1200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 5}, "defender_remaining": {}}
11586adc-2c12-4763-9394-54dee5d228eb	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	5	2026-01-25 14:32:36.138097	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 94%)", "HOSTILES : 5 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 94%)", "HOSTILES : 5 Chasseur Léger", "TOUR 1: Nous infligeons 50 dmg. Pirates ripostent avec 50 dmg.", "TOUR 2: Nous infligeons 40 dmg. Pirates ripostent avec 40 dmg.", "TOUR 3: Nous infligeons 30 dmg. Pirates ripostent avec 30 dmg.", "TOUR 4: Nous infligeons 20 dmg. Pirates ripostent avec 20 dmg.", "TOUR 5: Nous infligeons 10 dmg. Pirates ripostent avec 10 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 5, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 5, "defender_losses": 0, "attacker_initial": {"light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
16add6dc-ff1b-490f-99c5-e4eef10b1df2	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	8	2026-01-26 05:26:44.436194	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 87%)", "HOSTILES : 9 Chasseur Léger, 1 Recycleur", "TOUR 1: Nous infligeons 1100 dmg. Pirates ripostent avec 1090 dmg.", "TOUR 2: Nous infligeons 80 dmg. Pirates ripostent avec 70 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 60 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 50 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 30 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 87%)", "HOSTILES : 9 Chasseur Léger, 1 Recycleur", "TOUR 1: Nous infligeons 1100 dmg. Pirates ripostent avec 1090 dmg.", "TOUR 2: Nous infligeons 80 dmg. Pirates ripostent avec 70 dmg.", "TOUR 3: Nous infligeons 70 dmg. Pirates ripostent avec 60 dmg.", "TOUR 4: Nous infligeons 60 dmg. Pirates ripostent avec 50 dmg.", "TOUR 5: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "TOUR 6: Nous infligeons 40 dmg. Pirates ripostent avec 30 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 8, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 8, "defender_losses": 0, "attacker_initial": {"recycler": 1, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 3}, "defender_remaining": {}}
ba0f8cb9-3f71-450b-92e7-23fbe56ea7f9	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	6	2026-01-26 05:27:07.43166	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 108%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 108%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
66a402d4-08fd-44b1-a07c-81383556527a	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:13.632541	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
dec56c7e-4dd6-48c1-8390-538fafaf98a4	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:21.344314	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
1f70f6ef-ee44-4487-bb47-0a64cb9ecfc9	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:26.653144	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
a6ceee23-73dc-461d-be41-e3d1218e4385	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:39:52.936614	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
51488551-981d-408b-ad76-b8d8676feeef	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:40:04.744313	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
a9f340aa-62b3-46fd-8a09-76cd85630696	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	6	2026-01-26 05:27:31.599534	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 103%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 103%)", "HOSTILES : 11 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 110 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 100 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 90 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 80 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 70 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 60 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
f89358e7-da60-4b87-a554-35d1feb586b6	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:37.632788	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
c27beeb6-b26f-4dcd-bf38-a4161b37c059	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6000	2400	0	2026-01-26 05:27:43.270342	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6000 Métal, +2400 Cristal, +1200 Deutérium"], "loot": {"metal": 6000.0, "crystal": 2400.0, "deuterium": 1200.0}, "result": "calm", "winner": "calm", "loot_metal": 6000.0, "ships_lost": 0, "loot_crystal": 2400.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1200.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 10}, "defender_remaining": {}}
5834f9af-5d33-4526-96e2-ac59d49fd8b8	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	6	2026-01-26 05:27:48.977636	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 90%)", "HOSTILES : 9 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 90 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 90%)", "HOSTILES : 9 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 90 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 80 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 70 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 60 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 50 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 40 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
7b2b224c-e0e0-4836-92f6-63bdbb93707c	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	draw	0	0	6	2026-01-26 05:27:53.341414	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 64%)", "HOSTILES : 7 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 70 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 60 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 50 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 40 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 30 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 20 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 64%)", "HOSTILES : 7 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 70 dmg.", "TOUR 2: Nous infligeons 90 dmg. Pirates ripostent avec 60 dmg.", "TOUR 3: Nous infligeons 80 dmg. Pirates ripostent avec 50 dmg.", "TOUR 4: Nous infligeons 70 dmg. Pirates ripostent avec 40 dmg.", "TOUR 5: Nous infligeons 60 dmg. Pirates ripostent avec 30 dmg.", "TOUR 6: Nous infligeons 50 dmg. Pirates ripostent avec 20 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 6, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 6, "defender_losses": 0, "attacker_initial": {"light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 4}, "defender_remaining": {}}
1ff55906-f5cf-499c-bda8-ab4d2c382bc7	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 15:34:05.541475	phantomhex	\N
4c40be3e-057a-4074-8803-9320f7994e34	e777dba1-794e-46cd-aca8-908ad8948537	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 15:34:48.939266	phantomhex	\N
190fb371-4bb5-42d7-bbdc-c0727b596cb6	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-01-26 18:18:46.942963	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -3, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
e0b7770d-9dda-425f-8023-a4b061e61b02	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:18:46.947555	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
9c6d1946-a4c7-46e5-9ac0-07879db4413f	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-01-26 18:25:56.044296	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 100, "cruiser": 1000, "recycler": 600, "deathstar": 2, "destroyer": 150, "spy_probe": 7, "battleship": 200, "colony_ship": 15, "heavy_hunter": 1000, "light_hunter": 1000}, "defense": null, "resources": {"metal": 19204910.233284097, "crystal": 17969862.469001714, "deuterium": 3727350.9526799764}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
3d1f6245-7561-4486-b454-d1753765ee8b	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:25:56.132025	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
ac45899e-b1b5-43a9-8b48-480054d5f418	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Kronos Major	spy_attack	success	0	0	1	2026-01-26 18:36:03.648663	Gollum	{"type": "spy_report", "fleet": {"bomber": 10, "cruiser": 10, "recycler": 10, "deathstar": 2, "destroyer": 87, "spy_probe": 4, "battleship": 67, "colony_ship": 20, "transporter": 10, "heavy_hunter": 10, "light_hunter": 500}, "defense": 389, "resources": {"metal": 10911778.913204208, "crystal": 102574.56733408404, "deuterium": 1672748.113446294}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "full", "tech_difference": 2, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
a77bf3a3-c42f-4923-9380-3adf61658710	e777dba1-794e-46cd-aca8-908ad8948537	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:36:03.650323	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
68123fc7-2095-4df9-9010-8d2cd2db1bde	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Secteur Inconnu	expedition	calm	10200	4080	0	2026-01-26 18:39:27.845823	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +10200 Métal, +4080 Cristal, +2040 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +10200 Métal, +4080 Cristal, +2040 Deutérium"], "loot": {"metal": 10200.0, "crystal": 4080.0, "deuterium": 2040.0}, "result": "calm", "winner": "calm", "loot_metal": 10200.0, "ships_lost": 0, "loot_crystal": 4080.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 2040.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"cruiser": 10, "transporter": 2, "light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"cruiser": 10, "transporter": 2, "light_hunter": 5}, "defender_remaining": {}}
5dd3bda5-f903-4728-99eb-2099e6592632	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-01-26 18:39:52.860287	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 100, "cruiser": 1000, "recycler": 600, "deathstar": 2, "destroyer": 150, "spy_probe": 7, "battleship": 200, "colony_ship": 15, "heavy_hunter": 1000, "light_hunter": 1000}, "defense": null, "resources": {"metal": 25778487.506581593, "crystal": 23040390.393308353, "deuterium": 4514770.195551247}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
c537eed8-c881-4257-b856-7154e1410ad2	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Enculator Alpha	spy_attack	success	0	0	1	2026-01-26 18:40:15.541028	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 100, "recycler": 10, "deathstar": 3, "destroyer": 100, "spy_probe": 15, "battleship": 200, "colony_ship": 2, "transporter": 6, "heavy_hunter": 100, "light_hunter": 1500}, "defense": 1412, "resources": {"metal": 5962103.642917563, "crystal": 5249299.618602465, "deuterium": 2582090.069467928}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 2, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
64615934-be12-4df4-913b-4d709e51bfd8	2477366c-9fd2-4d61-abc6-72cce81e5fee	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 18:40:15.545729	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
40f09db2-b340-4209-b985-ae4e0cf16f10	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_attack	success	0	0	1	2026-01-26 19:20:07.341982	phantomhex	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:55:4]", "target_planet": "Néo Omicron 957 (Homeworld)", "target_player": "phantomhex", "detection_level": "none", "tech_difference": -4, "target_planet_id": "a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e"}
93096476-c039-45b8-bf93-82df0337f010	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 19:20:07.34667	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
0871aed7-9497-4c6b-815e-5274e07a86cf	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-01-26 19:21:45.450014	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 100, "recycler": 10, "deathstar": 3, "destroyer": 100, "spy_probe": 15, "battleship": 200, "colony_ship": 2, "transporter": 6, "heavy_hunter": 100, "light_hunter": 1500}, "defense": 1412, "resources": {"metal": 5962103.642917563, "crystal": 5249299.618602465, "deuterium": 2582090.069467928}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 5, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
528b1b63-9e79-482f-996c-48aec72b5c8a	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-26 19:21:45.453194	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
ab9bc1bd-3454-4686-9fc1-fe47cece1802	c34a3382-e6eb-4f51-8d48-021102098f85	Secteur Inconnu	expedition	calm	72600	29040	0	2026-01-26 19:48:58.892146	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "loot": {"metal": 72600.0, "crystal": 29040.0, "deuterium": 14520.0}, "result": "calm", "winner": "calm", "loot_metal": 72600.0, "ships_lost": 0, "loot_crystal": 29040.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 14520.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"destroyer": 120, "transporter": 1}, "defender_initial": {}, "attacker_remaining": {"destroyer": 120, "transporter": 1}, "defender_remaining": {}}
b623523b-051d-49cc-bd51-7f86d115b69e	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_attack	success	0	0	1	2026-01-27 16:10:26.87457	Lapin en rute	{"type": "spy_report", "fleet": {"cruiser": 400, "recycler": 10, "deathstar": 1, "destroyer": 100, "spy_probe": 24, "battleship": 457, "transporter": 1, "heavy_hunter": 500, "light_hunter": 1000}, "defense": 395, "resources": {"metal": 1783993.2242934424, "crystal": 6777215.808508368, "deuterium": 2366375.5636288393}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 5, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
773a6f67-bc4e-4c26-96f9-f0a15f71f873	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-27 16:10:26.904783	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
cc5e1ba7-11cb-42e3-b2ae-4e771d989f00	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-01-28 17:45:55.86731	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 400, "recycler": 10, "deathstar": 5, "destroyer": 300, "spy_probe": 15, "battleship": 500, "colony_ship": 2, "transporter": 6, "heavy_hunter": 100, "light_hunter": 1500}, "defense": 1510, "resources": {"metal": 10656661.842146626, "crystal": 2321006.447550369, "deuterium": 11258675.558463404}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 6, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
5339862d-3527-4c74-bc9f-3cae979f0faa	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-28 17:45:55.89289	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
77ef6a7a-c60a-434d-9678-419897d2b502	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_attack	success	0	0	1	2026-01-28 21:34:14.989864	Gollum	{"type": "spy_report", "fleet": {"bomber": 12, "cruiser": 10, "recycler": 10, "deathstar": 2, "destroyer": 200, "spy_probe": 4, "battleship": 100, "colony_ship": 20, "transporter": 10, "heavy_hunter": 10, "light_hunter": 500}, "defense": 3589, "resources": {"metal": 19008758.84384566, "crystal": 192172.87588537027, "deuterium": 9657599.29939618}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "full", "tech_difference": 6, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
b446e361-bd77-4feb-ad61-a27e599e1803	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-28 21:34:14.992191	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
4882bf43-357c-48c3-a3e8-36399575d3ac	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-01-28 21:35:35.784239	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 100, "cruiser": 1000, "recycler": 600, "deathstar": 4, "destroyer": 350, "spy_probe": 7, "battleship": 400, "colony_ship": 15, "heavy_hunter": 2400, "light_hunter": 1000}, "defense": 4800, "resources": {"metal": 944526.3555623061, "crystal": 163001.20112598984, "deuterium": 1724193.187296237}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "full", "tech_difference": 5, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
bde241a5-fcbe-484a-91cc-47cda482e2c9	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-28 21:35:35.86708	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
5b1fe155-be12-449d-9cc8-1005c829b40d	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Kronos Major	spy_attack	success	0	0	1	2026-01-28 22:01:54.982937	Gollum	{"type": "spy_report", "fleet": {"bomber": 12, "cruiser": 10, "recycler": 10, "deathstar": 2, "destroyer": 200, "spy_probe": 4, "battleship": 100, "colony_ship": 20, "transporter": 10, "heavy_hunter": 10, "light_hunter": 500}, "defense": null, "resources": {"metal": 19008758.84384566, "crystal": 192172.87588537027, "deuterium": 9657599.29939618}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
a7794b2c-c740-41e5-8610-eb5c476379a1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-01-28 22:05:14.171239	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -5, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
7473c95b-d7b9-4633-b862-39b5007ebcf2	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-01-28 22:05:14.26986	ChupaChups	{"type": "spy_alert", "coordinates": "[1:9:10]", "attacker_planet": "Spinach XX (Homeworld)", "attacker_player": "ChupaChups"}
3f7a2356-1bc8-44ff-9e19-1de0f88ea2b9	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-01-29 21:28:36.885103	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 1000, "recycler": 10, "deathstar": 5, "destroyer": 500, "spy_probe": 15, "battleship": 500, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 1510, "resources": {"metal": 16315494.53554086, "crystal": 9011079.153164702, "deuterium": 20027583.47207223}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 7, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
0cae8669-7f5e-4776-afa0-cb0515280b7a	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-29 21:28:36.966944	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
1f2560aa-cd1a-42cb-bab4-abe0b717920f	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_attack	success	0	0	1	2026-01-29 21:30:25.069292	phantomhex	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:55:4]", "target_planet": "Néo Omicron 957 (Homeworld)", "target_player": "phantomhex", "detection_level": "none", "tech_difference": -2, "target_planet_id": "a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e"}
3664ad61-c76d-4b41-880b-0f145723896d	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-29 21:30:25.071517	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
545b6e1b-e1e7-4270-9b06-af38fe9c98ae	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-01-29 21:30:31.580983	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 150, "cruiser": 1000, "recycler": 600, "deathstar": 4, "destroyer": 400, "spy_probe": 5, "battleship": 500, "colony_ship": 15, "heavy_hunter": 2900, "light_hunter": 1000}, "defense": 4800, "resources": {"metal": 18857083.99472237, "crystal": 6761511.621118251, "deuterium": 4369838.682368308}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "full", "tech_difference": 4, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
c1e19456-a6db-4a03-a35e-ba66f8b8595d	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-29 21:30:31.583056	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
7674b727-4ef4-4cdf-8cfe-a239a965e289	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_attack	success	0	0	1	2026-01-30 00:29:44.17266	Lapin en rute	{"type": "spy_report", "fleet": {"cruiser": 400, "recycler": 10, "deathstar": 1, "destroyer": 100, "spy_probe": 24, "battleship": 457, "transporter": 1, "heavy_hunter": 500, "light_hunter": 1000}, "defense": 1095, "resources": {"metal": 32239481.60009593, "crystal": 430054.8511943943, "deuterium": 4143961.8364178794}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 6, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
de96cedb-804f-4898-bda8-043c6d30816d	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-01-30 00:29:44.174916	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
7f355446-ad76-4458-99f6-36a2171f0fbf	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	defense	victory	-0	-0	79	2026-01-31 20:56:09.276407	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 940005 dégâts", "Défenseur inflige 1790750 dégâts", "--- ROUND 2 ---", "Attaquant inflige 631000 dégâts", "Défenseur inflige 1574030 dégâts", "--- ROUND 3 ---", "Attaquant inflige 274500 dégâts", "Défenseur inflige 1362610 dégâts", "Attaquant détruit !", "RÉSULTAT: VICTOIRE DÉFENSEUR"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 2, "destroyer": 191, "spy_probe": 1, "battleship": 477, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "total_ships": 79}, "result": "victory", "winner": "defender", "conquered": false, "is_defense": true, "opponent_name": "Carlito89", "attacker_losses": 2122, "defender_losses": 79, "attacker_initial": {"deathstar": 1, "destroyer": 120, "transporter": 1, "heavy_hunter": 2000}, "defender_initial": {"bomber": 50, "cruiser": 10, "recycler": 10, "deathstar": 5, "destroyer": 200, "spy_probe": 4, "battleship": 500, "colony_ship": 20, "transporter": 10, "heavy_hunter": 10, "light_hunter": 500}, "attacker_remaining": {}, "defender_remaining": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 2, "destroyer": 191, "spy_probe": 1, "battleship": 477, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}}
c85585ed-8a9f-4cd8-97dd-6a73da1bbf34	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	attack	defeat	0	0	2122	2026-01-31 20:56:09.276407	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 940005 dégâts", "Défenseur inflige 1790750 dégâts", "--- ROUND 2 ---", "Attaquant inflige 631000 dégâts", "Défenseur inflige 1574030 dégâts", "--- ROUND 3 ---", "Attaquant inflige 274500 dégâts", "Défenseur inflige 1362610 dégâts", "Attaquant détruit !", "RÉSULTAT: VICTOIRE DÉFENSEUR"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 2122}, "result": "defeat", "winner": "defender", "conquered": false, "is_defense": false, "opponent_name": "Gollum", "attacker_losses": 2122, "defender_losses": 79, "attacker_initial": {"deathstar": 1, "destroyer": 120, "transporter": 1, "heavy_hunter": 2000}, "defender_initial": {"bomber": 50, "cruiser": 10, "recycler": 10, "deathstar": 5, "destroyer": 200, "spy_probe": 4, "battleship": 500, "colony_ship": 20, "transporter": 10, "heavy_hunter": 10, "light_hunter": 500}, "attacker_remaining": {}, "defender_remaining": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 2, "destroyer": 191, "spy_probe": 1, "battleship": 477, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}}
45411ce5-be97-48e5-af3a-35bc3214b11e	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-02 07:41:33.081228	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 150, "cruiser": 1000, "recycler": 600, "deathstar": 5, "destroyer": 500, "spy_probe": 5, "battleship": 650, "colony_ship": 15, "heavy_hunter": 2900, "light_hunter": 1000}, "defense": 4900, "resources": {"metal": 11283971.201242425, "crystal": 7105987.111389477, "deuterium": 2651880.6926921695}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "full", "tech_difference": 3, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
8b829dea-02c5-410d-b063-625a9f6bc580	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Broute moules	spy_attack	success	0	0	1	2026-02-02 07:43:17.287854	Lapin en rute	{"type": "spy_report", "fleet": {"cruiser": 400, "recycler": 10, "deathstar": 1, "destroyer": 467, "spy_probe": 24, "battleship": 457, "transporter": 1, "heavy_hunter": 500, "light_hunter": 1000}, "defense": 1195, "resources": {"metal": 154188199.8744547, "crystal": 111035936.82868795, "deuterium": 20628960.79337182}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 8, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
79cfc9f3-e93d-4aae-8ccb-ecf0fbbecc0f	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-02-02 07:43:17.291705	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
7b6f633b-b05f-4908-bd9f-2f9037612d5a	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Broute moules	spy_attack	success	0	0	1	2026-02-02 07:43:30.792769	Lapin en rute	{"type": "spy_report", "fleet": {"cruiser": 400, "recycler": 10, "deathstar": 1, "destroyer": 467, "spy_probe": 24, "battleship": 457, "transporter": 1, "heavy_hunter": 500, "light_hunter": 1000}, "defense": 1195, "resources": {"metal": 154194086.4369104, "crystal": 111039861.2036584, "deuterium": 20629992.631368265}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 8, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
d9243deb-eb81-4926-bd98-2ae0d6e7e675	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-02-02 07:43:30.794464	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
ceb989b1-c931-43a6-abe1-e8d8b2083fa8	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-02 12:06:10.782293	Carlito89	{"type": "spy_report", "fleet": {"bomber": 0, "cruiser": 2000, "deathstar": 0, "destroyer": 0, "spy_probe": 12, "battleship": 0, "colony_ship": 5, "transporter": 0, "heavy_hunter": 0}, "defense": 13326, "resources": {"metal": 116825101.59995043, "crystal": 51991431.90336686, "deuterium": 22052308.982066013}, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "full", "tech_difference": 2, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
26acee8a-1bea-491a-8ea0-974d4127e8e1	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-02-02 12:06:10.784305	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
08aa8fd6-3955-4371-a8cb-a36030d17709	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Néo Omicron 957 (Homeworld)	defense	defeat	-0	-0	930	2026-02-02 12:39:06.816234	phantomhex	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 1400000 dégâts", "Défenseur inflige 3763630 dégâts", "--- ROUND 2 ---", "Attaquant inflige 1200000 dégâts", "Défenseur inflige 3495235 dégâts", "--- ROUND 3 ---", "Attaquant inflige 1000000 dégâts", "Défenseur inflige 3227100 dégâts", "--- ROUND 4 ---", "Attaquant inflige 800000 dégâts", "Défenseur inflige 2959965 dégâts", "--- ROUND 5 ---", "Attaquant inflige 600000 dégâts", "Défenseur inflige 2691830 dégâts", "--- ROUND 6 ---", "Attaquant inflige 400000 dégâts", "Défenseur inflige 2620440 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 126, "cruiser": 866, "recycler": 519, "destroyer": 432, "battleship": 561, "colony_ship": 9, "heavy_hunter": 2516, "light_hunter": 866}, "total_ships": 930}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "phantomhex", "attacker_losses": 6, "defender_losses": 930, "attacker_initial": {"deathstar": 7}, "defender_initial": {"bomber": 150, "cruiser": 1000, "recycler": 600, "deathstar": 5, "destroyer": 500, "spy_probe": 5, "battleship": 650, "colony_ship": 15, "heavy_hunter": 2900, "light_hunter": 1000}, "attacker_remaining": {"deathstar": 1}, "defender_remaining": {"bomber": 126, "cruiser": 866, "recycler": 519, "destroyer": 432, "battleship": 561, "colony_ship": 9, "heavy_hunter": 2516, "light_hunter": 866}}
27cf7c11-083d-4359-ab4d-dc8d1eb41216	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Spinach XX (Homeworld)	attack	defeat	0	0	6	2026-02-02 12:39:06.816234	ChupaChups	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 1400000 dégâts", "Défenseur inflige 3763630 dégâts", "--- ROUND 2 ---", "Attaquant inflige 1200000 dégâts", "Défenseur inflige 3495235 dégâts", "--- ROUND 3 ---", "Attaquant inflige 1000000 dégâts", "Défenseur inflige 3227100 dégâts", "--- ROUND 4 ---", "Attaquant inflige 800000 dégâts", "Défenseur inflige 2959965 dégâts", "--- ROUND 5 ---", "Attaquant inflige 600000 dégâts", "Défenseur inflige 2691830 dégâts", "--- ROUND 6 ---", "Attaquant inflige 400000 dégâts", "Défenseur inflige 2620440 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"deathstar": 1}, "total_ships": 6}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "ChupaChups", "attacker_losses": 6, "defender_losses": 930, "attacker_initial": {"deathstar": 7}, "defender_initial": {"bomber": 150, "cruiser": 1000, "recycler": 600, "deathstar": 5, "destroyer": 500, "spy_probe": 5, "battleship": 650, "colony_ship": 15, "heavy_hunter": 2900, "light_hunter": 1000}, "attacker_remaining": {"deathstar": 1}, "defender_remaining": {"bomber": 126, "cruiser": 866, "recycler": 519, "destroyer": 432, "battleship": 561, "colony_ship": 9, "heavy_hunter": 2516, "light_hunter": 866}}
f5d4a694-dc09-4498-969e-b20a526800b1	e8836690-7ec2-430b-bb68-3aa95545adf9	Secteur Inconnu	expedition	calm	6600	2640	0	2026-02-02 15:19:45.389173	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +6600 Métal, +2640 Cristal, +1320 Deutérium"], "loot": {"metal": 6600.0, "crystal": 2640.0, "deuterium": 1320.0}, "result": "calm", "winner": "calm", "loot_metal": 6600.0, "ships_lost": 0, "loot_crystal": 2640.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1320.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"cruiser": 10, "recycler": 1}, "defender_initial": {}, "attacker_remaining": {"cruiser": 10, "recycler": 1}, "defender_remaining": {}}
5449a869-681b-4199-a269-fb26f2233586	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-02 18:15:41.684099	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -7, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
10e2ab90-7e18-44ea-a557-5e05973693d3	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_defense	alert	0	0	0	2026-02-02 18:15:41.780885	Tomdindon	{"type": "spy_alert", "coordinates": "[1:68:13]", "attacker_planet": "Enculator Alpha", "attacker_player": "Tomdindon"}
f1eac3a1-b8c7-4922-b385-4ee2496f7edc	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-02-03 20:01:45.205622	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 1000, "recycler": 10, "deathstar": 5, "destroyer": 800, "spy_probe": 14, "battleship": 1000, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 2430, "resources": {"metal": 75016034.12482429, "crystal": 61434761.29551801, "deuterium": 13241817.565865172}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 8, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
27848841-58dc-4e9b-8c8b-409071ea216a	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-03 20:01:45.289204	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
5eca9ea3-bfd2-4b83-a375-90bce8c7eef2	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-03 20:02:03.584161	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 126, "cruiser": 866, "recycler": 519, "deathstar": 5, "destroyer": 832, "spy_probe": 5, "battleship": 561, "colony_ship": 9, "heavy_hunter": 2516, "light_hunter": 866}, "defense": null, "resources": {"metal": 4693228.256379278, "crystal": 12645016.636135109, "deuterium": 1050432.8090023026}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
52488d42-4348-46fe-8bdd-9bd332a88791	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-03 20:02:03.68455	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
8db17af4-0b80-465d-a5e1-bc2d49673069	e777dba1-794e-46cd-aca8-908ad8948537	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-04 12:29:42.789363	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -8, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
b96cc826-388b-4728-8234-02a2c13cb26c	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-02-04 12:29:42.88533	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Kronos Major", "attacker_player": "Gollum"}
f9b2e79c-87c6-461b-b491-d172f8126789	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-04 12:31:02.482747	Carlito89	{"type": "spy_report", "fleet": {"bomber": 0, "cruiser": 2000, "deathstar": 0, "destroyer": 0, "spy_probe": 10, "battleship": 0, "colony_ship": 5, "transporter": 20, "heavy_hunter": 0, "light_hunter": 3000}, "defense": null, "resources": {"metal": 18621350.279841766, "crystal": 73402361.19022821, "deuterium": 42092630.36391539}, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
245334b8-d5ae-4831-8ae4-195e3144cd5b	c34a3382-e6eb-4f51-8d48-021102098f85	Néo Omicron 957 (Homeworld)	spy_defense	alert	0	0	0	2026-02-04 12:31:02.4855	phantomhex	{"type": "spy_alert", "coordinates": "[1:55:4]", "attacker_planet": "Néo Omicron 957 (Homeworld)", "attacker_player": "phantomhex"}
f880fd5c-1579-4047-afda-a376f4a71d94	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Vega V	spy_attack	success	0	0	1	2026-02-07 09:59:53.583667	Agelid	{"type": "spy_report", "fleet": {}, "defense": 0, "resources": {"metal": 22309.848333855272, "crystal": 54943.90171112598, "deuterium": 20861.63663078891}, "coordinates": "[1:85:15]", "target_planet": "Vega V", "target_player": "Agelid", "detection_level": "full", "tech_difference": 10, "target_planet_id": "5351891c-73d9-4831-a343-b83a4581d0cc"}
68f22749-38b9-476e-b1de-2ebd1e71fffb	5351891c-73d9-4831-a343-b83a4581d0cc	Broute moules	spy_defense	alert	0	0	0	2026-02-07 09:59:53.586545	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
ba7681c9-beb6-4f32-b8f3-53f20fe330b3	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Kronos Major	spy_attack	success	0	0	1	2026-02-07 10:01:33.884242	Gollum	{"type": "spy_report", "fleet": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 7, "destroyer": 1000, "spy_probe": 0, "battleship": 477, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defense": null, "resources": {"metal": 569904.5540260077, "crystal": 22645699.6763169, "deuterium": 32552443.861707993}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
fcfc803b-451e-4cef-9096-2dccf7561dc5	e777dba1-794e-46cd-aca8-908ad8948537	Broute moules	spy_defense	alert	0	0	0	2026-02-07 10:01:33.887005	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
08a3725c-5322-444e-a020-40e85e983a87	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-02-07 13:09:19.99441	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 1000, "recycler": 10, "deathstar": 10, "destroyer": 1000, "spy_probe": 14, "battleship": 1000, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 4410, "resources": {"metal": 68071143.02127293, "crystal": 105553116.2664961, "deuterium": 19568538.730218004}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 8, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
999a60ad-204c-41e9-8a0a-c3cb1cc24807	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-07 13:09:20.183915	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
3b8ac01c-2f24-429d-b047-1896b2c68a02	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_attack	success	0	0	1	2026-02-08 01:56:21.5831	Lapin en rute	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 400, "recycler": 10, "deathstar": 10, "destroyer": 1000, "spy_probe": 22, "battleship": 460, "colony_ship": 1, "transporter": 1, "heavy_hunter": 521, "light_hunter": 1000}, "defense": 24064, "resources": {"metal": 135845786.51768845, "crystal": 110688535.06530084, "deuterium": 25208509.792723514}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 7, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
a2dac741-106e-4433-bb43-dbe6eb104d66	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-08 01:56:21.589733	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
417dd006-302e-4609-8b04-f04f7b69eabc	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_attack	success	0	0	1	2026-02-08 14:54:08.584267	Gollum	{"type": "spy_report", "fleet": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 7, "destroyer": 1000, "spy_probe": 100, "battleship": 477, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defense": 15864, "resources": {"metal": 31288640.60281663, "crystal": 54915016.03827831, "deuterium": 42221870.519715585}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "full", "tech_difference": 8, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
31c101b3-cd5f-41db-97da-1554e73a286b	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-08 19:12:16.885795	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": {"metal": 152541262.37153623, "crystal": 139348098.9632183, "deuterium": 54120307.382887356}, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "resources", "tech_difference": -1, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
356f82d3-e2b9-4550-9c43-991f3d4c9d2d	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_defense	alert	0	0	0	2026-02-08 19:12:16.889698	ChupaChups	{"type": "spy_alert", "coordinates": "[1:9:10]", "attacker_planet": "Spinach XX (Homeworld)", "attacker_player": "ChupaChups"}
23356a7f-fe17-4fe4-b35b-5b9a59b27d04	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	990000	396000	0	2026-02-13 00:27:30.193149	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +990000 Métal, +396000 Cristal, +198000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +990000 Métal, +396000 Cristal, +198000 Deutérium"], "loot": {"metal": 990000.0, "crystal": 396000.0, "deuterium": 198000.0}, "result": "calm", "winner": "calm", "loot_metal": 990000.0, "ships_lost": 0, "loot_crystal": 396000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 198000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"cruiser": 400, "light_hunter": 1250}, "defender_initial": {}, "attacker_remaining": {"cruiser": 400, "light_hunter": 1250}, "defender_remaining": {}}
603eec11-f4ba-4a08-8226-e0bc15bcc73a	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	1290000	516000	0	2026-02-13 00:28:08.693052	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1290000 Métal, +516000 Cristal, +258000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +1290000 Métal, +516000 Cristal, +258000 Deutérium"], "loot": {"metal": 1290000.0, "crystal": 516000.0, "deuterium": 258000.0}, "result": "calm", "winner": "calm", "loot_metal": 1290000.0, "ships_lost": 0, "loot_crystal": 516000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 258000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"cruiser": 400, "battleship": 500, "light_hunter": 1250}, "defender_initial": {}, "attacker_remaining": {"cruiser": 400, "battleship": 500, "light_hunter": 1250}, "defender_remaining": {}}
f8af558a-fec9-483b-a90a-e8ad13315e1e	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-02-13 14:14:09.396521	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 500, "cruiser": 1000, "recycler": 10, "deathstar": 20, "destroyer": 1100, "spy_probe": 14, "battleship": 1500, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 10610, "resources": {"metal": 26764802.756836783, "crystal": 91770966.38930607, "deuterium": 42801323.735313505}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 7, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
1f77a938-04da-4eab-8d03-dada818a16cd	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-13 14:14:09.399791	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
cce1a133-d45d-4aee-a7a4-aa75d6b8669e	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Kronos Major	spy_attack	success	0	0	1	2026-02-14 13:02:05.688353	Gollum	{"type": "spy_report", "fleet": {"bomber": 47, "cruiser": 7, "recycler": 7, "deathstar": 11, "destroyer": 1000, "spy_probe": 100, "battleship": 1543, "colony_ship": 17, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defense": 19844, "resources": {"metal": 123639422.88993867, "crystal": 100756322.99667883, "deuterium": 27415065.54179617}, "coordinates": "[1:95:5]", "target_planet": "Kronos Major", "target_player": "Gollum", "detection_level": "full", "tech_difference": 6, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
72b99fe6-4008-4a28-b49e-b1a92d5b6196	e777dba1-794e-46cd-aca8-908ad8948537	Broute moules	spy_defense	alert	0	0	0	2026-02-14 13:02:05.691376	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
cec59de2-7d7e-4a55-93dd-07b59a68cd5c	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-14 13:02:29.988099	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -2, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
1ea19de2-1afa-4f39-b068-a599bb65fb4c	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_defense	alert	0	0	0	2026-02-14 13:02:29.990122	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
bcd8f92e-bcc8-44fe-9ac4-972eb5ed6b7f	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Enculator Alpha	spy_attack	success	0	0	1	2026-02-14 13:02:54.786935	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 500, "cruiser": 1000, "recycler": 10, "deathstar": 20, "destroyer": 1100, "spy_probe": 14, "battleship": 1500, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 10660, "resources": {"metal": 69392904.65710573, "crystal": 116916135.51539782, "deuterium": 48148803.82623207}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 5, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
4bb4cea2-81a7-4483-858f-a766b851689f	2477366c-9fd2-4d61-abc6-72cce81e5fee	Broute moules	spy_defense	alert	0	0	0	2026-02-14 13:02:54.788911	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
fb98369c-3cd0-4fc6-af07-accb241897d7	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	victory	5000	2000	876	2026-02-14 13:07:56.487923	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 66%)", "HOSTILES : 1641 Chasseur Léger, 263 Croiseur", "TOUR 1: Nous infligeons 410000 dmg. Pirates ripostent avec 269300 dmg.", "TOUR 2: Nous infligeons 360100 dmg. Pirates ripostent avec 193600 dmg.", "TOUR 3: Nous infligeons 324300 dmg. Pirates ripostent avec 127100 dmg.", "TOUR 4: Nous infligeons 300800 dmg. Pirates ripostent avec 67000 dmg.", "TOUR 5: Nous infligeons 288000 dmg. Pirates ripostent avec 11400 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 66%)", "HOSTILES : 1641 Chasseur Léger, 263 Croiseur", "TOUR 1: Nous infligeons 410000 dmg. Pirates ripostent avec 269300 dmg.", "TOUR 2: Nous infligeons 360100 dmg. Pirates ripostent avec 193600 dmg.", "TOUR 3: Nous infligeons 324300 dmg. Pirates ripostent avec 127100 dmg.", "TOUR 4: Nous infligeons 300800 dmg. Pirates ripostent avec 67000 dmg.", "TOUR 5: Nous infligeons 288000 dmg. Pirates ripostent avec 11400 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 876, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 876, "defender_losses": 0, "attacker_initial": {"cruiser": 400, "light_hunter": 2500}, "defender_initial": {}, "attacker_remaining": {"cruiser": 277, "light_hunter": 1747}, "defender_remaining": {}}
92a12782-736d-4db9-8132-66648aabe04a	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	3025200	1210080	0	2026-02-14 13:11:01.154479	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "loot": {"metal": 3025200.0, "crystal": 1210080.0, "deuterium": 605040.0}, "result": "calm", "winner": "calm", "loot_metal": 3025200.0, "ships_lost": 0, "loot_crystal": 1210080.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 605040.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_initial": {}, "attacker_remaining": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_remaining": {}}
c9b280e0-2cb9-4882-9f2a-3420d8670a50	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Broute moules	spy_defense	alert	0	0	0	2026-02-14 13:14:49.583467	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
5a581264-8cb4-4b40-ab1b-e41a1fa8a4dc	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Broute moules	spy_defense	alert	0	0	0	2026-02-14 13:15:09.29948	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
f361161c-c11d-4065-a7b5-7508696bc05f	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	3025200	1210080	0	2026-02-14 13:11:42.493621	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "loot": {"metal": 3025200.0, "crystal": 1210080.0, "deuterium": 605040.0}, "result": "calm", "winner": "calm", "loot_metal": 3025200.0, "ships_lost": 0, "loot_crystal": 1210080.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 605040.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_initial": {}, "attacker_remaining": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_remaining": {}}
c02c7248-4229-4534-a6f8-f0d9977dc278	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	3025200	1210080	0	2026-02-14 13:12:23.684559	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +3025200 Métal, +1210080 Cristal, +605040 Deutérium"], "loot": {"metal": 3025200.0, "crystal": 1210080.0, "deuterium": 605040.0}, "result": "calm", "winner": "calm", "loot_metal": 3025200.0, "ships_lost": 0, "loot_crystal": 1210080.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 605040.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_initial": {}, "attacker_remaining": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 5, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defender_remaining": {}}
00caa7ff-f3af-4160-9c0c-5f5260d32b12	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-14 13:14:49.506516	ChupaChups	{"type": "spy_report", "fleet": null, "defense": null, "resources": {"metal": 115065118.0377137, "crystal": 32077617.50079829, "deuterium": 22708866.229519308}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "resources", "tech_difference": -1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
44518065-264b-439c-b8b8-2d38a1720e87	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Néo Omicron 957 (Homeworld)	spy_attack	success	0	0	1	2026-02-14 13:15:09.29778	phantomhex	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:55:4]", "target_planet": "Néo Omicron 957 (Homeworld)", "target_player": "phantomhex", "detection_level": "none", "tech_difference": -3, "target_planet_id": "a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e"}
7e933ced-ed5e-443a-9c18-113187354a69	c34a3382-e6eb-4f51-8d48-021102098f85	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-14 14:38:23.087564	ChupaChups	{"type": "spy_report", "fleet": {"bomber": 126, "cruiser": 1500, "recycler": 519, "deathstar": 10, "destroyer": 1700, "spy_probe": 4, "battleship": 2000, "colony_ship": 9, "heavy_hunter": 2516, "light_hunter": 866}, "defense": null, "resources": {"metal": 115065118.0377137, "crystal": 32077617.50079829, "deuterium": 22708866.229519308}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
253fbf3e-251d-42fd-8d55-64d960c64c97	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-14 14:38:23.091514	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
2f208428-563f-4a08-9367-6ce762b2635b	c34a3382-e6eb-4f51-8d48-021102098f85	Enculator Alpha	spy_attack	success	0	0	1	2026-02-14 17:48:46.884549	Tomdindon	{"type": "spy_report", "fleet": {"bomber": 500, "cruiser": 1000, "recycler": 10, "deathstar": 20, "destroyer": 1100, "spy_probe": 14, "battleship": 1500, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "defense": 10660, "resources": {"metal": 69392904.65710573, "crystal": 116916135.51539782, "deuterium": 48148803.82623207}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "full", "tech_difference": 7, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
4def019b-4db0-402a-a966-eec59e68eb90	2477366c-9fd2-4d61-abc6-72cce81e5fee	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-14 17:48:46.887916	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
06152d75-c2bc-4477-b288-9b408ebade9e	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	draw	0	0	1	2026-02-14 23:21:32.651424	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 87%)", "HOSTILES : 1 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 100 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 87%)", "HOSTILES : 1 Chasseur Léger", "TOUR 1: Nous infligeons 100 dmg. Pirates ripostent avec 100 dmg.", "DESTRUCTION MUTUELLE : Aucune flotte n'a survécu."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 1, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 1, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {}, "defender_remaining": {}}
9886e2f6-3572-43ed-8942-5f21f44e99e0	2477366c-9fd2-4d61-abc6-72cce81e5fee	Secteur Inconnu	expedition	calm	600	240	0	2026-02-14 23:21:57.630404	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +600 Métal, +240 Cristal, +120 Deutérium"], "loot": {"metal": 600.0, "crystal": 240.0, "deuterium": 120.0}, "result": "calm", "winner": "calm", "loot_metal": 600.0, "ships_lost": 0, "loot_crystal": 240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 1}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 1}, "defender_remaining": {}}
80ea5311-08c6-4730-ac44-607ee327b2a7	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_attack	success	0	0	1	2026-02-15 19:53:42.582936	Lapin en rute	{"type": "spy_report", "fleet": {"bomber": 1, "cruiser": 277, "recycler": 10, "deathstar": 13, "destroyer": 1000, "spy_probe": 17, "battleship": 1000, "colony_ship": 1, "transporter": 1, "heavy_hunter": 3000, "light_hunter": 1747}, "defense": 37114, "resources": {"metal": 180904665.9227175, "crystal": 155781864.3558964, "deuterium": 60237421.772030614}, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "full", "tech_difference": 3, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
1ff56b14-c705-41fd-8b44-cb56053ec9ec	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-15 19:53:42.68311	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
3da9cfee-8ca8-4e68-95a5-e6943a054794	c34a3382-e6eb-4f51-8d48-021102098f85	Vega IX	spy_attack	success	0	0	1	2026-02-15 20:10:48.594154	Vince	{"type": "spy_report", "fleet": {"cruiser": 5, "spy_probe": 1, "battleship": 5}, "defense": 26, "resources": {"metal": 3352169.3306616973, "crystal": 9369316.151379876, "deuterium": 1886323.8338278648}, "coordinates": "[1:22:4]", "target_planet": "Vega IX", "target_player": "Vince", "detection_level": "full", "tech_difference": 14, "target_planet_id": "82c16717-d644-43e9-ba12-8350e9dec152"}
560e6af1-cf5a-4ee5-9692-f6cd12bd7898	82c16717-d644-43e9-ba12-8350e9dec152	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-15 20:10:48.788586	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
998b8471-bb0e-4d98-ac92-138b8866bc1c	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-17 10:26:47.882877	ChupaChups	{"type": "spy_report", "fleet": null, "defense": null, "resources": {"metal": 11493485.784471406, "crystal": 46817069.91627768, "deuterium": 19816090.73591258}, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "resources", "tech_difference": -1, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
30a64d22-02f9-496c-b6b8-4c5712765939	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Broute moules	spy_defense	alert	0	0	0	2026-02-17 10:26:47.886345	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
298fe743-0f56-4ce4-9a8c-c7660aa4f46c	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Eldoria (Homeworld)	spy_attack	success	0	0	1	2026-02-17 10:27:30.88294	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Eldoria (Homeworld)", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -3, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
2b729844-4924-4a09-bc62-8eb982c8eec8	c34a3382-e6eb-4f51-8d48-021102098f85	Broute moules	spy_defense	alert	0	0	0	2026-02-17 10:27:30.885083	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
3651e9f4-f030-45c5-bbb2-84e22b07ba19	c34a3382-e6eb-4f51-8d48-021102098f85	Alpha Secundus 219 (Homeworld)	spy_attack	success	0	0	1	2026-02-17 17:05:05.393117	Vito	{"type": "spy_report", "fleet": {"bomber": 1000, "cruiser": 1000, "recycler": 1, "deathstar": 10, "destroyer": 1000, "spy_probe": 5, "battleship": 1000, "colony_ship": 5, "transporter": 5, "heavy_hunter": 1000, "light_hunter": 1000}, "defense": 23020, "resources": {"metal": 99909914.30473323, "crystal": 154916409.7055088, "deuterium": 20708255.99993856}, "coordinates": "[1:26:5]", "target_planet": "Alpha Secundus 219 (Homeworld)", "target_player": "Vito", "detection_level": "full", "tech_difference": 12, "target_planet_id": "e8836690-7ec2-430b-bb68-3aa95545adf9"}
7330ff00-47da-48ac-9b86-230c4d93117c	e8836690-7ec2-430b-bb68-3aa95545adf9	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-17 17:05:05.396344	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
b68f5b18-8e31-41b6-972f-460edc6adac5	c34a3382-e6eb-4f51-8d48-021102098f85	Alpha Secundus 219 (Homeworld)	spy_attack	success	0	0	1	2026-02-19 14:40:09.385791	Vito	{"type": "spy_report", "fleet": {"bomber": 1000, "cruiser": 1000, "recycler": 1, "deathstar": 10, "destroyer": 1000, "spy_probe": 5, "battleship": 1000, "colony_ship": 5, "transporter": 5, "heavy_hunter": 1000, "light_hunter": 1000}, "defense": 23520, "resources": {"metal": 72983150.24394077, "crystal": 214653048.53929603, "deuterium": 36172021.868331864}, "coordinates": "[1:26:5]", "target_planet": "Alpha Secundus 219 (Homeworld)", "target_player": "Vito", "detection_level": "full", "tech_difference": 12, "target_planet_id": "e8836690-7ec2-430b-bb68-3aa95545adf9"}
1ecd11db-48ad-46df-a93e-93ea0f4c9bf7	e8836690-7ec2-430b-bb68-3aa95545adf9	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-19 14:40:09.389004	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
45bfac96-5042-45ac-8f4b-ecb9c176e8b0	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	7800	3120	0	2026-02-23 00:38:48.286584	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +7800 Métal, +3120 Cristal, +1560 Deutérium"], "loot": {"metal": 7800.0, "crystal": 3120.0, "deuterium": 1560.0}, "result": "calm", "winner": "calm", "loot_metal": 7800.0, "ships_lost": 0, "loot_crystal": 3120.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1560.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"deathstar": 13}, "defender_initial": {}, "attacker_remaining": {"deathstar": 13}, "defender_remaining": {}}
1bd6b263-7a72-4b7b-9718-a70c82a487d8	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Secteur Inconnu	expedition	calm	19800	7920	0	2026-02-23 00:40:13.98837	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +19800 Métal, +7920 Cristal, +3960 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +19800 Métal, +7920 Cristal, +3960 Deutérium"], "loot": {"metal": 19800.0, "crystal": 7920.0, "deuterium": 3960.0}, "result": "calm", "winner": "calm", "loot_metal": 19800.0, "ships_lost": 0, "loot_crystal": 7920.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3960.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"recycler": 10, "deathstar": 13, "transporter": 10}, "defender_initial": {}, "attacker_remaining": {"recycler": 10, "deathstar": 13, "transporter": 10}, "defender_remaining": {}}
fa49a447-3934-4ca6-a0da-b6eeabd8155f	82c16717-d644-43e9-ba12-8350e9dec152	 le ripper (Homeworld)	spy_attack	success	0	0	1	2026-02-24 03:09:54.817076	Juge-Mesrine	{"type": "spy_report", "fleet": {}, "defense": 0, "resources": {"metal": 960000.0, "crystal": 960000.0, "deuterium": 960000.0}, "coordinates": "[1:3:8]", "target_planet": " le ripper (Homeworld)", "target_player": "Juge-Mesrine", "detection_level": "full", "tech_difference": 6, "target_planet_id": "072a1afe-dd24-4087-9e95-bf753f2cf07f"}
7ca39ab7-6173-4e7b-8fb0-45d4037ba642	072a1afe-dd24-4087-9e95-bf753f2cf07f	Vega IX	spy_defense	alert	0	0	0	2026-02-24 03:09:54.820958	Vince	{"type": "spy_alert", "coordinates": "[1:22:4]", "attacker_planet": "Vega IX", "attacker_player": "Vince"}
f862763d-f025-43c3-ba48-d908426dc58e	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	15000	6000	0	2026-02-25 01:12:23.311253	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "loot": {"metal": 15000.0, "crystal": 6000.0, "deuterium": 3000.0}, "result": "calm", "winner": "calm", "loot_metal": 15000.0, "ships_lost": 0, "loot_crystal": 6000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_remaining": {}}
0b62d701-b1f2-49ef-b6aa-c5586b1e9e54	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	victory	5000	2000	8	2026-02-24 04:08:44.121494	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 56%)", "HOSTILES : 2 Croiseur, 1 Chasseur Lourd, 3 Chasseur Léger", "TOUR 1: Nous infligeons 2200 dmg. Pirates ripostent avec 1350 dmg.", "TOUR 2: Nous infligeons 1450 dmg. Pirates ripostent avec 600 dmg.", "TOUR 3: Nous infligeons 700 dmg. Pirates ripostent avec 100 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 56%)", "HOSTILES : 2 Croiseur, 1 Chasseur Lourd, 3 Chasseur Léger", "TOUR 1: Nous infligeons 2200 dmg. Pirates ripostent avec 1350 dmg.", "TOUR 2: Nous infligeons 1450 dmg. Pirates ripostent avec 600 dmg.", "TOUR 3: Nous infligeons 700 dmg. Pirates ripostent avec 100 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 8, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 8, "defender_losses": 0, "attacker_initial": {"cruiser": 3, "heavy_hunter": 2, "light_hunter": 5}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 2}, "defender_remaining": {}}
03c85292-c170-48df-97b0-7daa613fc484	c34a3382-e6eb-4f51-8d48-021102098f85	Vega IX	spy_attack	success	0	0	1	2026-02-24 21:46:03.714799	Vince	{"type": "spy_report", "fleet": {"bomber": 15, "cruiser": 5, "spy_probe": 15, "battleship": 5, "colony_ship": 5}, "defense": 1896, "resources": {"metal": 166858365.36237922, "crystal": 82184257.18547666, "deuterium": 693164.2026973374}, "coordinates": "[1:22:4]", "target_planet": "Vega IX", "target_player": "Vince", "detection_level": "full", "tech_difference": 12, "target_planet_id": "82c16717-d644-43e9-ba12-8350e9dec152"}
c0823b0a-e977-49dd-9ab5-5c0f654f415e	82c16717-d644-43e9-ba12-8350e9dec152	Eldoria (Homeworld)	spy_defense	alert	0	0	0	2026-02-24 21:46:03.717427	Carlito89	{"type": "spy_alert", "coordinates": "[1:62:2]", "attacker_planet": "Eldoria (Homeworld)", "attacker_player": "Carlito89"}
55a29ce1-b139-45c3-bb00-6b7b70c1adeb	82c16717-d644-43e9-ba12-8350e9dec152	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-24 22:18:23.820804	ChupaChups	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "none", "tech_difference": -11, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
cbab3f8e-1de7-48ff-8e0e-7f85e9c68079	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Vega IX	spy_defense	alert	0	0	0	2026-02-24 22:18:23.823077	Vince	{"type": "spy_alert", "coordinates": "[1:22:4]", "attacker_planet": "Vega IX", "attacker_player": "Vince"}
79ebe54d-3321-4a11-a58b-0b8669a4946c	82c16717-d644-43e9-ba12-8350e9dec152	Orion-63	spy_attack	success	0	0	1	2026-02-24 22:18:45.513223	Marc	{"type": "spy_report", "fleet": {"cruiser": 10, "recycler": 0, "spy_probe": 0, "colony_ship": 0, "transporter": 0, "heavy_hunter": 0, "light_hunter": 2}, "defense": null, "resources": {"metal": 23135082.491367456, "crystal": 75229.94779654162, "deuterium": 1216964.3577326925}, "coordinates": "[1:1:7]", "target_planet": "Orion-63", "target_player": "Marc", "detection_level": "fleet", "tech_difference": 1, "target_planet_id": "89fd6f5b-a7de-4d92-bb9c-5389dccbf57f"}
17278f08-aed8-45e0-b49b-3b0ce00174e9	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Vega IX	spy_defense	alert	0	0	0	2026-02-24 22:18:45.515729	Vince	{"type": "spy_alert", "coordinates": "[1:22:4]", "attacker_planet": "Vega IX", "attacker_player": "Vince"}
cdd093b8-972a-4576-aba2-078133cab832	e777dba1-794e-46cd-aca8-908ad8948537	Secteur Inconnu	expedition	calm	293400	117360	0	2026-02-25 00:44:42.818081	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +293400 Métal, +117360 Cristal, +58680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +293400 Métal, +117360 Cristal, +58680 Deutérium"], "loot": {"metal": 293400.0, "crystal": 117360.0, "deuterium": 58680.0}, "result": "calm", "winner": "calm", "loot_metal": 293400.0, "ships_lost": 0, "loot_crystal": 117360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 58680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 17, "cruiser": 7, "recycler": 2, "deathstar": 5, "destroyer": 100, "spy_probe": 10, "battleship": 250, "colony_ship": 7, "transporter": 7, "heavy_hunter": 7, "light_hunter": 77}, "defender_initial": {}, "attacker_remaining": {"bomber": 17, "cruiser": 7, "recycler": 2, "deathstar": 5, "destroyer": 100, "spy_probe": 10, "battleship": 250, "colony_ship": 7, "transporter": 7, "heavy_hunter": 7, "light_hunter": 77}, "defender_remaining": {}}
cbbd3ac2-f6f4-4e27-80fa-394979aa0081	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	18000	7200	0	2026-02-25 00:46:03.316094	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +18000 Métal, +7200 Cristal, +3600 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +18000 Métal, +7200 Cristal, +3600 Deutérium"], "loot": {"metal": 18000.0, "crystal": 7200.0, "deuterium": 3600.0}, "result": "calm", "winner": "calm", "loot_metal": 18000.0, "ships_lost": 0, "loot_crystal": 7200.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3600.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "spy_probe": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "spy_probe": 5, "battleship": 5}, "defender_remaining": {}}
f5022622-6b80-484d-95ae-20629d6776af	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	15000	6000	0	2026-02-25 01:02:50.45428	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "loot": {"metal": 15000.0, "crystal": 6000.0, "deuterium": 3000.0}, "result": "calm", "winner": "calm", "loot_metal": 15000.0, "ships_lost": 0, "loot_crystal": 6000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_remaining": {}}
59018a70-d680-445a-ba62-3087d7095690	e777dba1-794e-46cd-aca8-908ad8948537	Enculator Alpha	spy_attack	success	0	0	1	2026-02-25 01:02:57.316255	Tomdindon	{"type": "spy_report", "fleet": null, "defense": null, "resources": {"metal": 119759305.0909858, "crystal": 164793836.2735448, "deuterium": 49859002.2807723}, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "resources", "tech_difference": -1, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
2b33446d-e34c-4f78-addf-e58e3f1773e3	2477366c-9fd2-4d61-abc6-72cce81e5fee	Kronos Major	spy_defense	alert	0	0	0	2026-02-25 01:02:57.318717	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Kronos Major", "attacker_player": "Gollum"}
9d282500-7d27-432d-8ad4-3313a3ef87af	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	15000	6000	0	2026-02-25 01:12:34.51899	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "loot": {"metal": 15000.0, "crystal": 6000.0, "deuterium": 3000.0}, "result": "calm", "winner": "calm", "loot_metal": 15000.0, "ships_lost": 0, "loot_crystal": 6000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_remaining": {}}
2cd84721-12b9-4322-9fb7-b5dea044fe2f	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	15000	6000	0	2026-02-25 01:12:40.615924	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "loot": {"metal": 15000.0, "crystal": 6000.0, "deuterium": 3000.0}, "result": "calm", "winner": "calm", "loot_metal": 15000.0, "ships_lost": 0, "loot_crystal": 6000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_remaining": {}}
6c51a684-bfd3-4e84-9f27-153938ef55e3	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	15000	6000	0	2026-02-25 13:06:34.316337	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +15000 Métal, +6000 Cristal, +3000 Deutérium"], "loot": {"metal": 15000.0, "crystal": 6000.0, "deuterium": 3000.0}, "result": "calm", "winner": "calm", "loot_metal": 15000.0, "ships_lost": 0, "loot_crystal": 6000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 3000.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "battleship": 5}, "defender_remaining": {}}
946507f6-7b27-4983-9d1d-05396ef98dcb	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	45600	18240	0	2026-02-26 01:13:18.213508	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "loot": {"metal": 45600.0, "crystal": 18240.0, "deuterium": 9120.0}, "result": "calm", "winner": "calm", "loot_metal": 45600.0, "ships_lost": 0, "loot_crystal": 18240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 9120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
cd4f5c06-6222-4226-a309-6ee0322ea44e	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	45600	18240	0	2026-02-26 01:13:33.766265	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "loot": {"metal": 45600.0, "crystal": 18240.0, "deuterium": 9120.0}, "result": "calm", "winner": "calm", "loot_metal": 45600.0, "ships_lost": 0, "loot_crystal": 18240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 9120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
0b33c900-f88d-4014-9822-a399d587fb49	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	45600	18240	0	2026-02-26 01:13:39.616613	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "loot": {"metal": 45600.0, "crystal": 18240.0, "deuterium": 9120.0}, "result": "calm", "winner": "calm", "loot_metal": 45600.0, "ships_lost": 0, "loot_crystal": 18240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 9120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
add02c86-578e-4e31-9bb8-0f7ea2e1b4c1	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	45600	18240	0	2026-02-26 01:13:46.518874	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +45600 Métal, +18240 Cristal, +9120 Deutérium"], "loot": {"metal": 45600.0, "crystal": 18240.0, "deuterium": 9120.0}, "result": "calm", "winner": "calm", "loot_metal": 45600.0, "ships_lost": 0, "loot_crystal": 18240.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 9120.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
2eb02735-8d61-492f-ab65-aca247e2312c	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:13:46.525209	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
569a213c-0ad2-4a53-be8f-5fef7f312256	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:13:53.417327	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
e54ad1fc-6e10-427e-a4fc-11b911af92a1	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:14:00.217608	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
236e2d5f-91f9-4684-9282-b5d7a98ab5b7	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:14:05.709089	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
5a029ed1-896a-4561-91e9-d9d1430415b1	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:14:19.412002	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
05bab6ac-b278-4e62-b106-0148dbe8e716	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:14:25.719177	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
8dea8258-1c32-4222-b13c-21c5aa80741e	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	53400	21360	0	2026-02-27 00:14:31.721558	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +53400 Métal, +21360 Cristal, +10680 Deutérium"], "loot": {"metal": 53400.0, "crystal": 21360.0, "deuterium": 10680.0}, "result": "calm", "winner": "calm", "loot_metal": 53400.0, "ships_lost": 0, "loot_crystal": 21360.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 10680.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_remaining": {}}
8f3d877f-0fed-486d-8c71-f28798ba879c	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	victory	5000	2000	37	2026-02-27 00:14:36.31473	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 94%)", "HOSTILES : 5 Croiseur, 1 Étoile de la Mort, 8 Bombardier, 3 Vaisseau de Guerre, 47 Chasseur Léger, 13 Sonde Espionnage", "TOUR 1: Nous infligeons 227065 dmg. Pirates ripostent avec 217765 dmg.", "TOUR 2: Nous infligeons 24460 dmg. Pirates ripostent avec 15160 dmg.", "TOUR 3: Nous infligeons 20550 dmg. Pirates ripostent avec 10545 dmg.", "TOUR 4: Nous infligeons 17745 dmg. Pirates ripostent avec 6130 dmg.", "TOUR 5: Nous infligeons 15140 dmg. Pirates ripostent avec 2615 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 94%)", "HOSTILES : 5 Croiseur, 1 Étoile de la Mort, 8 Bombardier, 3 Vaisseau de Guerre, 47 Chasseur Léger, 13 Sonde Espionnage", "TOUR 1: Nous infligeons 227065 dmg. Pirates ripostent avec 217765 dmg.", "TOUR 2: Nous infligeons 24460 dmg. Pirates ripostent avec 15160 dmg.", "TOUR 3: Nous infligeons 20550 dmg. Pirates ripostent avec 10545 dmg.", "TOUR 4: Nous infligeons 17745 dmg. Pirates ripostent avec 6130 dmg.", "TOUR 5: Nous infligeons 15140 dmg. Pirates ripostent avec 2615 dmg.", "VICTOIRE : La flotte pirate a été annihilée.", "EPAVE FOUILLÉE : +5000 Métal récupéré.", "BUTIN : +5000 Métal, +2000 Cristal, +1000 Deutérium"], "loot": {"metal": 5000.0, "crystal": 2000.0, "deuterium": 1000.0}, "result": "victory", "winner": "victory", "loot_metal": 5000.0, "ships_lost": 37, "loot_crystal": 2000.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 1000.0, "attacker_losses": 37, "defender_losses": 0, "attacker_initial": {"bomber": 15, "cruiser": 5, "deathstar": 1, "spy_probe": 13, "battleship": 5, "light_hunter": 50}, "defender_initial": {}, "attacker_remaining": {"bomber": 9, "spy_probe": 7, "light_hunter": 36}, "defender_remaining": {}}
906ed799-270b-439a-989b-0ce31276eb92	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	72600	29040	0	2026-02-27 00:16:01.857521	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "loot": {"metal": 72600.0, "crystal": 29040.0, "deuterium": 14520.0}, "result": "calm", "winner": "calm", "loot_metal": 72600.0, "ships_lost": 0, "loot_crystal": 29040.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 14520.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 10, "cruiser": 50, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "transporter": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"bomber": 10, "cruiser": 50, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "transporter": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_remaining": {}}
4c166466-0399-4859-8717-a9b041ae582a	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	72600	29040	0	2026-02-27 00:16:36.81868	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +72600 Métal, +29040 Cristal, +14520 Deutérium"], "loot": {"metal": 72600.0, "crystal": 29040.0, "deuterium": 14520.0}, "result": "calm", "winner": "calm", "loot_metal": 72600.0, "ships_lost": 0, "loot_crystal": 29040.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 14520.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 10, "cruiser": 50, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "transporter": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"bomber": 10, "cruiser": 50, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "transporter": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_remaining": {}}
263bc15d-2cd7-4ede-bcbb-14baad4bf4b3	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	calm	96600	38640	0	2026-02-27 03:17:43.018928	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +96600 Métal, +38640 Cristal, +19320 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +96600 Métal, +38640 Cristal, +19320 Deutérium"], "loot": {"metal": 96600.0, "crystal": 38640.0, "deuterium": 19320.0}, "result": "calm", "winner": "calm", "loot_metal": 96600.0, "ships_lost": 0, "loot_crystal": 38640.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 19320.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"bomber": 10, "cruiser": 100, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"bomber": 10, "cruiser": 100, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_remaining": {}}
a16b341d-6b5a-4046-b4d3-94be7c87a2ea	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Secteur Inconnu	expedition	draw	0	0	75	2026-02-27 03:18:09.728281	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 97%)", "HOSTILES : 10 Recycleur, 7 Chasseur Lourd, 5 Bombardier, 98 Croiseur, 10 Chasseur Léger, 5 Destructeur, 1 Étoile de la Mort, 6 Vaisseau de Guerre", "TOUR 1: Nous infligeons 283600 dmg. Pirates ripostent avec 263050 dmg.", "TOUR 2: Nous infligeons 78040 dmg. Pirates ripostent avec 57490 dmg.", "TOUR 3: Nous infligeons 69280 dmg. Pirates ripostent avec 45170 dmg.", "TOUR 4: Nous infligeons 61320 dmg. Pirates ripostent avec 33500 dmg.", "TOUR 5: Nous infligeons 54160 dmg. Pirates ripostent avec 22630 dmg.", "TOUR 6: Nous infligeons 47800 dmg. Pirates ripostent avec 12160 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 97%)", "HOSTILES : 10 Recycleur, 7 Chasseur Lourd, 5 Bombardier, 98 Croiseur, 10 Chasseur Léger, 5 Destructeur, 1 Étoile de la Mort, 6 Vaisseau de Guerre", "TOUR 1: Nous infligeons 283600 dmg. Pirates ripostent avec 263050 dmg.", "TOUR 2: Nous infligeons 78040 dmg. Pirates ripostent avec 57490 dmg.", "TOUR 3: Nous infligeons 69280 dmg. Pirates ripostent avec 45170 dmg.", "TOUR 4: Nous infligeons 61320 dmg. Pirates ripostent avec 33500 dmg.", "TOUR 5: Nous infligeons 54160 dmg. Pirates ripostent avec 22630 dmg.", "TOUR 6: Nous infligeons 47800 dmg. Pirates ripostent avec 12160 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 75, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 75, "defender_losses": 0, "attacker_initial": {"bomber": 10, "cruiser": 100, "recycler": 10, "deathstar": 1, "destroyer": 10, "battleship": 10, "heavy_hunter": 10, "light_hunter": 10}, "defender_initial": {}, "attacker_remaining": {"bomber": 4, "cruiser": 62, "recycler": 4, "destroyer": 4, "battleship": 4, "heavy_hunter": 4, "light_hunter": 4}, "defender_remaining": {}}
7857d81c-ecbd-4d38-8310-c950a29346ad	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Spinach XX (Homeworld)	spy_attack	success	0	0	1	2026-02-27 03:52:23.732792	ChupaChups	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:9:10]", "target_planet": "Spinach XX (Homeworld)", "target_player": "ChupaChups", "detection_level": "none", "tech_difference": -12, "target_planet_id": "fd5b308c-668c-4f6b-9079-e77ade26fdf8"}
617eef27-143d-4bf4-b485-10b6c0f8041c	fd5b308c-668c-4f6b-9079-e77ade26fdf8	Orion-63	spy_defense	alert	0	0	0	2026-02-27 03:52:23.813279	Marc	{"type": "spy_alert", "coordinates": "[1:1:7]", "attacker_planet": "Orion-63", "attacker_player": "Marc"}
b2f8c78b-6014-4e42-adbc-7c519f265cf6	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	160800	64320	0	2026-03-01 02:15:48.520128	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +160800 Métal, +64320 Cristal, +32160 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +160800 Métal, +64320 Cristal, +32160 Deutérium"], "loot": {"metal": 160800.0, "crystal": 64320.0, "deuterium": 32160.0}, "result": "calm", "winner": "calm", "loot_metal": 160800.0, "ships_lost": 0, "loot_crystal": 64320.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 32160.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 268}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 268}, "defender_remaining": {}}
29a04a9e-fedc-4ce5-957f-1660f805bbe3	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	calm	160800	64320	0	2026-03-01 10:29:37.914112	\N	{"log": ["SCAN : Secteur calme.", "DÉCOUVERTE : +160800 Métal, +64320 Cristal, +32160 Deutérium"], "logs": ["SCAN : Secteur calme.", "DÉCOUVERTE : +160800 Métal, +64320 Cristal, +32160 Deutérium"], "loot": {"metal": 160800.0, "crystal": 64320.0, "deuterium": 32160.0}, "result": "calm", "winner": "calm", "loot_metal": 160800.0, "ships_lost": 0, "loot_crystal": 64320.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 32160.0, "attacker_losses": 0, "defender_losses": 0, "attacker_initial": {"light_hunter": 268}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 268}, "defender_remaining": {}}
ec2de4c0-b29e-4455-b0b2-1fd3ba62337d	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	spy_attack	success	0	0	1	2026-03-01 20:58:15.315272	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Quartier rouge", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -8, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
1b800b9a-7e4f-4d2e-9b53-5dcc044260d2	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	spy_defense	alert	0	0	0	2026-03-01 20:58:15.317832	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Kronos Major", "attacker_player": "Gollum"}
5b9cfa25-18c5-43f6-8200-cdf70cc9acd3	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	defense	defeat	-0	-0	5597	2026-03-01 21:19:20.912671	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 7996555 dégâts", "Défenseur inflige 7248335 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7482090 dégâts", "Défenseur inflige 6398365 dégâts", "--- ROUND 3 ---", "Attaquant inflige 6994425 dégâts", "Défenseur inflige 5537795 dégâts", "--- ROUND 4 ---", "Attaquant inflige 6535060 dégâts", "Défenseur inflige 4645220 dégâts", "--- ROUND 5 ---", "Attaquant inflige 6108295 dégâts", "Défenseur inflige 3678140 dégâts", "--- ROUND 6 ---", "Attaquant inflige 5717230 dégâts", "Défenseur inflige 2715860 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"cruiser": 765, "destroyer": 765, "spy_probe": 6, "battleship": 765, "transporter": 6, "light_hunter": 1148}, "total_ships": 5597}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 1462, "defender_losses": 5597, "attacker_initial": {"bomber": 47, "cruiser": 1000, "recycler": 7, "deathstar": 11, "destroyer": 1000, "battleship": 3300, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defender_initial": {"cruiser": 2000, "deathstar": 5, "destroyer": 2000, "spy_probe": 21, "battleship": 2000, "colony_ship": 6, "transporter": 20, "light_hunter": 3000}, "attacker_remaining": {"bomber": 32, "cruiser": 753, "recycler": 1, "deathstar": 5, "destroyer": 753, "battleship": 2490, "transporter": 1, "heavy_hunter": 1, "light_hunter": 358}, "defender_remaining": {"cruiser": 765, "destroyer": 765, "spy_probe": 6, "battleship": 765, "transporter": 6, "light_hunter": 1148}}
f744118e-a1c0-420b-acd8-f9b7be785fed	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	defeat	0	0	1462	2026-03-01 21:19:20.912671	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 7996555 dégâts", "Défenseur inflige 7248335 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7482090 dégâts", "Défenseur inflige 6398365 dégâts", "--- ROUND 3 ---", "Attaquant inflige 6994425 dégâts", "Défenseur inflige 5537795 dégâts", "--- ROUND 4 ---", "Attaquant inflige 6535060 dégâts", "Défenseur inflige 4645220 dégâts", "--- ROUND 5 ---", "Attaquant inflige 6108295 dégâts", "Défenseur inflige 3678140 dégâts", "--- ROUND 6 ---", "Attaquant inflige 5717230 dégâts", "Défenseur inflige 2715860 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 32, "cruiser": 753, "recycler": 1, "deathstar": 5, "destroyer": 753, "battleship": 2490, "transporter": 1, "heavy_hunter": 1, "light_hunter": 358}, "total_ships": 1462}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 1462, "defender_losses": 5597, "attacker_initial": {"bomber": 47, "cruiser": 1000, "recycler": 7, "deathstar": 11, "destroyer": 1000, "battleship": 3300, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defender_initial": {"cruiser": 2000, "deathstar": 5, "destroyer": 2000, "spy_probe": 21, "battleship": 2000, "colony_ship": 6, "transporter": 20, "light_hunter": 3000}, "attacker_remaining": {"bomber": 32, "cruiser": 753, "recycler": 1, "deathstar": 5, "destroyer": 753, "battleship": 2490, "transporter": 1, "heavy_hunter": 1, "light_hunter": 358}, "defender_remaining": {"cruiser": 765, "destroyer": 765, "spy_probe": 6, "battleship": 765, "transporter": 6, "light_hunter": 1148}}
a2ad7c2c-8820-48d5-92a5-28d44b2d9ca5	c34a3382-e6eb-4f51-8d48-021102098f85	Kronos Major	defense	defeat	-47085514.67137151	-7983913.058606322	3466	2026-03-01 21:19:21.812297	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 7996555 dégâts", "Défenseur inflige 3162000 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7657490 dégâts", "Défenseur inflige 2599640 dégâts", "--- ROUND 3 ---", "Attaquant inflige 7336825 dégâts", "Défenseur inflige 2019580 dégâts", "--- ROUND 4 ---", "Attaquant inflige 7037860 dégâts", "Défenseur inflige 1404020 dégâts", "--- ROUND 5 ---", "Attaquant inflige 6762795 dégâts", "Défenseur inflige 699660 dégâts", "--- ROUND 6 ---", "Attaquant inflige 6521330 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47085514.67137151, "crystal": 7983913.058606322, "deuterium": 51477849.93180362}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 3466}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 498, "defender_losses": 3466, "attacker_initial": {"bomber": 47, "cruiser": 1000, "recycler": 7, "deathstar": 11, "destroyer": 1000, "battleship": 3300, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 41, "cruiser": 918, "recycler": 2, "deathstar": 6, "destroyer": 918, "battleship": 3033, "transporter": 2, "heavy_hunter": 2, "light_hunter": 436}, "defender_remaining": {}}
b2eb9cba-4051-4199-9fcc-559c0064639c	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	victory	47085514.67137151	7983913.058606322	498	2026-03-01 21:19:21.812297	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 7996555 dégâts", "Défenseur inflige 3162000 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7657490 dégâts", "Défenseur inflige 2599640 dégâts", "--- ROUND 3 ---", "Attaquant inflige 7336825 dégâts", "Défenseur inflige 2019580 dégâts", "--- ROUND 4 ---", "Attaquant inflige 7037860 dégâts", "Défenseur inflige 1404020 dégâts", "--- ROUND 5 ---", "Attaquant inflige 6762795 dégâts", "Défenseur inflige 699660 dégâts", "--- ROUND 6 ---", "Attaquant inflige 6521330 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47085514.67137151, "crystal": 7983913.058606322, "deuterium": 51477849.93180362}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 41, "cruiser": 918, "recycler": 2, "deathstar": 6, "destroyer": 918, "battleship": 3033, "transporter": 2, "heavy_hunter": 2, "light_hunter": 436}, "total_ships": 498}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 498, "defender_losses": 3466, "attacker_initial": {"bomber": 47, "cruiser": 1000, "recycler": 7, "deathstar": 11, "destroyer": 1000, "battleship": 3300, "transporter": 7, "heavy_hunter": 7, "light_hunter": 477}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 41, "cruiser": 918, "recycler": 2, "deathstar": 6, "destroyer": 918, "battleship": 3033, "transporter": 2, "heavy_hunter": 2, "light_hunter": 436}, "defender_remaining": {}}
2c3674e0-dc5f-430c-86fa-7f99a42c4b23	82c16717-d644-43e9-ba12-8350e9dec152	Secteur Inconnu	expedition	draw	0	0	196	2026-03-01 21:25:33.737622	\N	{"log": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 259 Chasseur Léger", "TOUR 1: Nous infligeons 26800 dmg. Pirates ripostent avec 25900 dmg.", "TOUR 2: Nous infligeons 21000 dmg. Pirates ripostent avec 19900 dmg.", "TOUR 3: Nous infligeons 16500 dmg. Pirates ripostent avec 15200 dmg.", "TOUR 4: Nous infligeons 13100 dmg. Pirates ripostent avec 11500 dmg.", "TOUR 5: Nous infligeons 10500 dmg. Pirates ripostent avec 8500 dmg.", "TOUR 6: Nous infligeons 8600 dmg. Pirates ripostent avec 6100 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "logs": ["⚠️ RADAR : Signature hostile détectée.", "ALERTE : Flotte Pirate interceptée ! (Force estimée: 96%)", "HOSTILES : 259 Chasseur Léger", "TOUR 1: Nous infligeons 26800 dmg. Pirates ripostent avec 25900 dmg.", "TOUR 2: Nous infligeons 21000 dmg. Pirates ripostent avec 19900 dmg.", "TOUR 3: Nous infligeons 16500 dmg. Pirates ripostent avec 15200 dmg.", "TOUR 4: Nous infligeons 13100 dmg. Pirates ripostent avec 11500 dmg.", "TOUR 5: Nous infligeons 10500 dmg. Pirates ripostent avec 8500 dmg.", "TOUR 6: Nous infligeons 8600 dmg. Pirates ripostent avec 6100 dmg.", "FUITE : Le combat s'éternise, les flottes se désengagent."], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "result": "draw", "winner": "draw", "loot_metal": 0.0, "ships_lost": 196, "loot_crystal": 0.0, "lost_plasmas": 0, "mission_type": "expedition", "lost_missiles": 0, "loot_deuterium": 0.0, "attacker_losses": 196, "defender_losses": 0, "attacker_initial": {"light_hunter": 268}, "defender_initial": {}, "attacker_remaining": {"light_hunter": 72}, "defender_remaining": {}}
e1e96af1-cb0b-4e14-84bc-4e893c9bedca	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	defense	defeat	-47662815.33851496	-8318580.112022961	3466	2026-03-01 22:05:13.922885	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 11886595 dégâts", "Défenseur inflige 2987840 dégâts", "--- ROUND 2 ---", "Attaquant inflige 11500930 dégâts", "Défenseur inflige 2272880 dégâts", "--- ROUND 3 ---", "Attaquant inflige 11151065 dégâts", "Défenseur inflige 1565020 dégâts", "--- ROUND 4 ---", "Attaquant inflige 10842300 dégâts", "Défenseur inflige 857060 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10578300 dégâts", "Défenseur inflige 117200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 10366400 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47662815.33851496, "crystal": 8318580.112022961, "deuterium": 51736622.03325658}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 3466}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 537, "defender_losses": 3466, "attacker_initial": {"bomber": 73, "cruiser": 1671, "recycler": 3, "deathstar": 11, "destroyer": 1671, "battleship": 5523, "transporter": 3, "heavy_hunter": 3, "light_hunter": 794}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "defender_remaining": {}}
e4b61470-3375-4506-b8ad-7b0ea2dd623e	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	defense	defeat	-47662815.33851496	-8318580.112022961	3466	2026-03-01 22:05:14.114823	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 11886595 dégâts", "Défenseur inflige 2987840 dégâts", "--- ROUND 2 ---", "Attaquant inflige 11500930 dégâts", "Défenseur inflige 2272880 dégâts", "--- ROUND 3 ---", "Attaquant inflige 11151065 dégâts", "Défenseur inflige 1565020 dégâts", "--- ROUND 4 ---", "Attaquant inflige 10842300 dégâts", "Défenseur inflige 857060 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10578300 dégâts", "Défenseur inflige 117200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 10366400 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47662815.33851496, "crystal": 8318580.112022961, "deuterium": 51736622.03325658}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 3466}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 537, "defender_losses": 3466, "attacker_initial": {"bomber": 73, "cruiser": 1671, "recycler": 3, "deathstar": 11, "destroyer": 1671, "battleship": 5523, "transporter": 3, "heavy_hunter": 3, "light_hunter": 794}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "defender_remaining": {}}
66e6ecac-40c1-425c-a57a-2d01f632539b	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	victory	47662815.33851496	8318580.112022961	537	2026-03-01 22:05:13.922885	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 11886595 dégâts", "Défenseur inflige 2987840 dégâts", "--- ROUND 2 ---", "Attaquant inflige 11500930 dégâts", "Défenseur inflige 2272880 dégâts", "--- ROUND 3 ---", "Attaquant inflige 11151065 dégâts", "Défenseur inflige 1565020 dégâts", "--- ROUND 4 ---", "Attaquant inflige 10842300 dégâts", "Défenseur inflige 857060 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10578300 dégâts", "Défenseur inflige 117200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 10366400 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47662815.33851496, "crystal": 8318580.112022961, "deuterium": 51736622.03325658}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "total_ships": 537}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 537, "defender_losses": 3466, "attacker_initial": {"bomber": 73, "cruiser": 1671, "recycler": 3, "deathstar": 11, "destroyer": 1671, "battleship": 5523, "transporter": 3, "heavy_hunter": 3, "light_hunter": 794}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "defender_remaining": {}}
e81388a4-ee52-45cd-b747-d015e2f93811	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	victory	47662815.33851496	8318580.112022961	537	2026-03-01 22:05:14.114823	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 11886595 dégâts", "Défenseur inflige 2987840 dégâts", "--- ROUND 2 ---", "Attaquant inflige 11500930 dégâts", "Défenseur inflige 2272880 dégâts", "--- ROUND 3 ---", "Attaquant inflige 11151065 dégâts", "Défenseur inflige 1565020 dégâts", "--- ROUND 4 ---", "Attaquant inflige 10842300 dégâts", "Défenseur inflige 857060 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10578300 dégâts", "Défenseur inflige 117200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 10366400 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 47662815.33851496, "crystal": 8318580.112022961, "deuterium": 51736622.03325658}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "total_ships": 537}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 537, "defender_losses": 3466, "attacker_initial": {"bomber": 73, "cruiser": 1671, "recycler": 3, "deathstar": 11, "destroyer": 1671, "battleship": 5523, "transporter": 3, "heavy_hunter": 3, "light_hunter": 794}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 66, "cruiser": 1581, "deathstar": 6, "destroyer": 1581, "battleship": 5231, "light_hunter": 750}, "defender_remaining": {}}
eea5958a-7143-455c-8842-f94a5246e769	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Terre du Milieu	defense	defeat	-0	-0	7117	2026-03-01 22:32:28.979573	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 20662050 dégâts", "Défenseur inflige 7537430 dégâts", "--- ROUND 2 ---", "Attaquant inflige 19832600 dégâts", "Défenseur inflige 6310640 dégâts", "--- ROUND 3 ---", "Attaquant inflige 19091450 dégâts", "Défenseur inflige 5095650 dégâts", "--- ROUND 4 ---", "Attaquant inflige 18441100 dégâts", "Défenseur inflige 3877075 dégâts", "--- ROUND 5 ---", "Attaquant inflige 17884550 dégâts", "Défenseur inflige 2630200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 17431600 dégâts", "Défenseur inflige 1302925 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}, "total_ships": 7117}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 2299, "defender_losses": 7117, "attacker_initial": {"bomber": 132, "cruiser": 3162, "deathstar": 12, "destroyer": 3162, "battleship": 10462, "colony_ship": 17, "light_hunter": 750}, "defender_initial": {"bomber": 10, "cruiser": 300, "recycler": 10, "deathstar": 13, "destroyer": 2000, "spy_probe": 15, "battleship": 1000, "colony_ship": 1, "transporter": 10, "heavy_hunter": 3500, "light_hunter": 1800}, "attacker_remaining": {"bomber": 113, "cruiser": 2752, "deathstar": 6, "destroyer": 2752, "battleship": 9114, "colony_ship": 11, "light_hunter": 650}, "defender_remaining": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}}
dda38721-6432-49ba-a5a1-da4597f3dc29	e777dba1-794e-46cd-aca8-908ad8948537	Broute moules	attack	defeat	0	0	2299	2026-03-01 22:32:28.979573	Lapin en rute	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 20662050 dégâts", "Défenseur inflige 7537430 dégâts", "--- ROUND 2 ---", "Attaquant inflige 19832600 dégâts", "Défenseur inflige 6310640 dégâts", "--- ROUND 3 ---", "Attaquant inflige 19091450 dégâts", "Défenseur inflige 5095650 dégâts", "--- ROUND 4 ---", "Attaquant inflige 18441100 dégâts", "Défenseur inflige 3877075 dégâts", "--- ROUND 5 ---", "Attaquant inflige 17884550 dégâts", "Défenseur inflige 2630200 dégâts", "--- ROUND 6 ---", "Attaquant inflige 17431600 dégâts", "Défenseur inflige 1302925 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 113, "cruiser": 2752, "deathstar": 6, "destroyer": 2752, "battleship": 9114, "colony_ship": 11, "light_hunter": 650}, "total_ships": 2299}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "Lapin en rute", "attacker_losses": 2299, "defender_losses": 7117, "attacker_initial": {"bomber": 132, "cruiser": 3162, "deathstar": 12, "destroyer": 3162, "battleship": 10462, "colony_ship": 17, "light_hunter": 750}, "defender_initial": {"bomber": 10, "cruiser": 300, "recycler": 10, "deathstar": 13, "destroyer": 2000, "spy_probe": 15, "battleship": 1000, "colony_ship": 1, "transporter": 10, "heavy_hunter": 3500, "light_hunter": 1800}, "attacker_remaining": {"bomber": 113, "cruiser": 2752, "deathstar": 6, "destroyer": 2752, "battleship": 9114, "colony_ship": 11, "light_hunter": 650}, "defender_remaining": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}}
2360fad4-6bc0-449c-b2d6-7a9dbec1e2fa	82c16717-d644-43e9-ba12-8350e9dec152	Broute moules	spy_attack	success	0	0	1	2026-03-01 22:53:30.018184	Lapin en rute	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:67:15]", "target_planet": "Broute moules", "target_player": "Lapin en rute", "detection_level": "none", "tech_difference": -8, "target_planet_id": "ed5401d5-0f45-4939-a003-c5cf17aa11e7"}
0139eca7-66fc-44d5-9102-320680b40bf9	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Vega IX	spy_defense	alert	0	0	0	2026-03-01 22:53:30.020431	Vince	{"type": "spy_alert", "coordinates": "[1:22:4]", "attacker_planet": "Vega IX", "attacker_player": "Vince"}
b9955be8-f4d6-44a4-904e-afc5ef82c4a5	82c16717-d644-43e9-ba12-8350e9dec152	Quartier rouge	spy_attack	success	0	0	1	2026-03-01 22:53:53.012374	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Quartier rouge", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -9, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
93556717-fe34-4d50-ae8a-4e1908f46522	c34a3382-e6eb-4f51-8d48-021102098f85	Vega IX	spy_defense	alert	0	0	0	2026-03-01 22:53:53.014873	Vince	{"type": "spy_alert", "coordinates": "[1:22:4]", "attacker_planet": "Vega IX", "attacker_player": "Vince"}
fdecb997-ed7a-44d6-b5f0-8ac3ab830409	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	defense	defeat	-48417532.45000192	-8756097.278102394	3466	2026-03-01 23:04:14.118358	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 17096800 dégâts", "Défenseur inflige 2557140 dégâts", "--- ROUND 2 ---", "Attaquant inflige 16625800 dégâts", "Défenseur inflige 1315220 dégâts", "--- ROUND 3 ---", "Attaquant inflige 16275800 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 48417532.45000192, "crystal": 8756097.278102394, "deuterium": 51829877.190192536}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 3466}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 410, "defender_losses": 3466, "attacker_initial": {"bomber": 113, "cruiser": 2752, "deathstar": 6, "destroyer": 2752, "battleship": 9114, "light_hunter": 650}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 109, "cruiser": 2679, "deathstar": 4, "destroyer": 2679, "battleship": 8874, "light_hunter": 632}, "defender_remaining": {}}
73591f85-8808-4cb5-a8c1-34495b8115a4	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	victory	48417532.45000192	8756097.278102394	410	2026-03-01 23:04:14.118358	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 17096800 dégâts", "Défenseur inflige 2557140 dégâts", "--- ROUND 2 ---", "Attaquant inflige 16625800 dégâts", "Défenseur inflige 1315220 dégâts", "--- ROUND 3 ---", "Attaquant inflige 16275800 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 48417532.45000192, "crystal": 8756097.278102394, "deuterium": 51829877.190192536}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 109, "cruiser": 2679, "deathstar": 4, "destroyer": 2679, "battleship": 8874, "light_hunter": 632}, "total_ships": 410}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 410, "defender_losses": 3466, "attacker_initial": {"bomber": 113, "cruiser": 2752, "deathstar": 6, "destroyer": 2752, "battleship": 9114, "light_hunter": 650}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 109, "cruiser": 2679, "deathstar": 4, "destroyer": 2679, "battleship": 8874, "light_hunter": 632}, "defender_remaining": {}}
a1a4f599-6e9e-4f70-a125-93bfba2dd853	e777dba1-794e-46cd-aca8-908ad8948537	Enculator Alpha	spy_attack	success	0	0	1	2026-03-01 23:23:18.314611	Tomdindon	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:68:13]", "target_planet": "Enculator Alpha", "target_player": "Tomdindon", "detection_level": "none", "tech_difference": -3, "target_planet_id": "2477366c-9fd2-4d61-abc6-72cce81e5fee"}
51c30274-2715-4b96-a0e1-441f70454503	2477366c-9fd2-4d61-abc6-72cce81e5fee	Terre du Milieu	spy_defense	alert	0	0	0	2026-03-01 23:23:18.317428	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Terre du Milieu", "attacker_player": "Gollum"}
854d25ae-4d4f-4c88-a7ab-3453c5d9a611	82c16717-d644-43e9-ba12-8350e9dec152	Broute moules	attack	defeat	0	0	834	2026-03-02 00:59:07.298967	Lapin en rute	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 663000 dégâts", "Défenseur inflige 1052205 dégâts", "--- ROUND 2 ---", "Attaquant inflige 477300 dégâts", "Défenseur inflige 965100 dégâts", "--- ROUND 3 ---", "Attaquant inflige 304700 dégâts", "Défenseur inflige 909200 dégâts", "--- ROUND 4 ---", "Attaquant inflige 142150 dégâts", "Défenseur inflige 880850 dégâts", "Attaquant détruit !", "RÉSULTAT: VICTOIRE DÉFENSEUR"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 834}, "result": "defeat", "winner": "defender", "conquered": false, "is_defense": false, "opponent_name": "Lapin en rute", "attacker_losses": 834, "defender_losses": 318, "attacker_initial": {"bomber": 9, "cruiser": 100, "destroyer": 270, "battleship": 15, "heavy_hunter": 100, "light_hunter": 340}, "defender_initial": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "colony_ship": 1, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}, "attacker_remaining": {}, "defender_remaining": {"cruiser": 40, "destroyer": 286, "battleship": 142, "heavy_hunter": 501, "light_hunter": 256}}
e45e5119-787c-40d0-b6af-0b7059c276ed	2477366c-9fd2-4d61-abc6-72cce81e5fee	Terre du Milieu	defense	defeat	-0	-0	3014	2026-03-01 23:24:58.424275	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 16276050 dégâts", "Défenseur inflige 10366975 dégâts", "--- ROUND 2 ---", "Attaquant inflige 14842100 dégâts", "Défenseur inflige 9470305 dégâts", "--- ROUND 3 ---", "Attaquant inflige 13453800 dégâts", "Défenseur inflige 8603085 dégâts", "--- ROUND 4 ---", "Attaquant inflige 12099100 dégâts", "Défenseur inflige 7765065 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10762600 dégâts", "Défenseur inflige 7151495 dégâts", "--- ROUND 6 ---", "Attaquant inflige 9585200 dégâts", "Défenseur inflige 6578725 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 312, "cruiser": 627, "recycler": 4, "deathstar": 10, "destroyer": 1255, "spy_probe": 7, "battleship": 1255, "heavy_hunter": 627, "light_hunter": 941}, "total_ships": 3014}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 6751, "defender_losses": 3014, "attacker_initial": {"bomber": 109, "cruiser": 2679, "deathstar": 4, "destroyer": 2679, "battleship": 8874, "colony_ship": 1, "light_hunter": 632}, "defender_initial": {"bomber": 500, "cruiser": 1000, "recycler": 10, "deathstar": 20, "destroyer": 2000, "spy_probe": 14, "battleship": 2000, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "attacker_remaining": {"bomber": 57, "cruiser": 1471, "destroyer": 1471, "battleship": 4882, "light_hunter": 346}, "defender_remaining": {"bomber": 312, "cruiser": 627, "recycler": 4, "deathstar": 10, "destroyer": 1255, "spy_probe": 7, "battleship": 1255, "heavy_hunter": 627, "light_hunter": 941}}
3b80e2e5-a89b-4f77-a84c-4c4130ec1b8a	e777dba1-794e-46cd-aca8-908ad8948537	Enculator Alpha	attack	defeat	0	0	6751	2026-03-01 23:24:58.424275	Tomdindon	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 16276050 dégâts", "Défenseur inflige 10366975 dégâts", "--- ROUND 2 ---", "Attaquant inflige 14842100 dégâts", "Défenseur inflige 9470305 dégâts", "--- ROUND 3 ---", "Attaquant inflige 13453800 dégâts", "Défenseur inflige 8603085 dégâts", "--- ROUND 4 ---", "Attaquant inflige 12099100 dégâts", "Défenseur inflige 7765065 dégâts", "--- ROUND 5 ---", "Attaquant inflige 10762600 dégâts", "Défenseur inflige 7151495 dégâts", "--- ROUND 6 ---", "Attaquant inflige 9585200 dégâts", "Défenseur inflige 6578725 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 57, "cruiser": 1471, "destroyer": 1471, "battleship": 4882, "light_hunter": 346}, "total_ships": 6751}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "Tomdindon", "attacker_losses": 6751, "defender_losses": 3014, "attacker_initial": {"bomber": 109, "cruiser": 2679, "deathstar": 4, "destroyer": 2679, "battleship": 8874, "colony_ship": 1, "light_hunter": 632}, "defender_initial": {"bomber": 500, "cruiser": 1000, "recycler": 10, "deathstar": 20, "destroyer": 2000, "spy_probe": 14, "battleship": 2000, "colony_ship": 2, "transporter": 6, "heavy_hunter": 1000, "light_hunter": 1500}, "attacker_remaining": {"bomber": 57, "cruiser": 1471, "destroyer": 1471, "battleship": 4882, "light_hunter": 346}, "defender_remaining": {"bomber": 312, "cruiser": 627, "recycler": 4, "deathstar": 10, "destroyer": 1255, "spy_probe": 7, "battleship": 1255, "heavy_hunter": 627, "light_hunter": 941}}
cb1d8bf3-6bf5-45e5-878d-091017591cb6	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	defense	defeat	-24751313.00582833	-4692568.511994599	3466	2026-03-01 23:46:23.91848	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 8506500 dégâts", "Défenseur inflige 3137300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7988150 dégâts", "Défenseur inflige 2560740 dégâts", "--- ROUND 3 ---", "Attaquant inflige 7565900 dégâts", "Défenseur inflige 1976980 dégâts", "--- ROUND 4 ---", "Attaquant inflige 7237450 dégâts", "Défenseur inflige 1357920 dégâts", "--- ROUND 5 ---", "Attaquant inflige 7012600 dégâts", "Défenseur inflige 646360 dégâts", "--- ROUND 6 ---", "Attaquant inflige 6904250 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 24751313.00582833, "crystal": 4692568.511994599, "deuterium": 25971450.975629255}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 3466}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 1556, "defender_losses": 3466, "attacker_initial": {"bomber": 57, "cruiser": 1471, "destroyer": 1471, "battleship": 4882, "colony_ship": 10, "light_hunter": 346}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 44, "cruiser": 1193, "destroyer": 1193, "battleship": 3968, "colony_ship": 5, "light_hunter": 278}, "defender_remaining": {}}
dcc0f911-d8bf-4eda-b742-fd2cad403726	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	victory	24751313.00582833	4692568.511994599	1556	2026-03-01 23:46:23.91848	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 8506500 dégâts", "Défenseur inflige 3137300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 7988150 dégâts", "Défenseur inflige 2560740 dégâts", "--- ROUND 3 ---", "Attaquant inflige 7565900 dégâts", "Défenseur inflige 1976980 dégâts", "--- ROUND 4 ---", "Attaquant inflige 7237450 dégâts", "Défenseur inflige 1357920 dégâts", "--- ROUND 5 ---", "Attaquant inflige 7012600 dégâts", "Défenseur inflige 646360 dégâts", "--- ROUND 6 ---", "Attaquant inflige 6904250 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 24751313.00582833, "crystal": 4692568.511994599, "deuterium": 25971450.975629255}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 44, "cruiser": 1193, "destroyer": 1193, "battleship": 3968, "colony_ship": 5, "light_hunter": 278}, "total_ships": 1556}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 1556, "defender_losses": 3466, "attacker_initial": {"bomber": 57, "cruiser": 1471, "destroyer": 1471, "battleship": 4882, "colony_ship": 10, "light_hunter": 346}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 44, "cruiser": 1193, "destroyer": 1193, "battleship": 3968, "colony_ship": 5, "light_hunter": 278}, "defender_remaining": {}}
10a56aa5-889c-4cb3-8261-15b65fdf9468	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	defense	defeat	-0	-0	3290	2026-03-02 00:09:14.112135	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 6904250 dégâts", "Défenseur inflige 3208300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 6376400 dégâts", "Défenseur inflige 2702740 dégâts", "--- ROUND 3 ---", "Attaquant inflige 5931550 dégâts", "Défenseur inflige 2186480 dégâts", "--- ROUND 4 ---", "Attaquant inflige 5568600 dégâts", "Défenseur inflige 1638320 dégâts", "--- ROUND 5 ---", "Attaquant inflige 5297450 dégâts", "Défenseur inflige 1001460 dégâts", "--- ROUND 6 ---", "Attaquant inflige 5130900 dégâts", "Défenseur inflige 138500 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"cruiser": 39, "destroyer": 39, "battleship": 39, "light_hunter": 59}, "total_ships": 3290}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 1744, "defender_losses": 3290, "attacker_initial": {"bomber": 44, "cruiser": 1193, "destroyer": 1193, "battleship": 3968, "colony_ship": 5, "light_hunter": 278}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 30, "cruiser": 882, "destroyer": 882, "battleship": 2939, "light_hunter": 204}, "defender_remaining": {"cruiser": 39, "destroyer": 39, "battleship": 39, "light_hunter": 59}}
0246fd13-0ea6-45c7-a2f0-6e090c5793b3	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	attack	defeat	0	0	1744	2026-03-02 00:09:14.112135	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 6904250 dégâts", "Défenseur inflige 3208300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 6376400 dégâts", "Défenseur inflige 2702740 dégâts", "--- ROUND 3 ---", "Attaquant inflige 5931550 dégâts", "Défenseur inflige 2186480 dégâts", "--- ROUND 4 ---", "Attaquant inflige 5568600 dégâts", "Défenseur inflige 1638320 dégâts", "--- ROUND 5 ---", "Attaquant inflige 5297450 dégâts", "Défenseur inflige 1001460 dégâts", "--- ROUND 6 ---", "Attaquant inflige 5130900 dégâts", "Défenseur inflige 138500 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 30, "cruiser": 882, "destroyer": 882, "battleship": 2939, "light_hunter": 204}, "total_ships": 1744}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 1744, "defender_losses": 3290, "attacker_initial": {"bomber": 44, "cruiser": 1193, "destroyer": 1193, "battleship": 3968, "colony_ship": 5, "light_hunter": 278}, "defender_initial": {"cruiser": 765, "deathstar": 5, "destroyer": 765, "spy_probe": 6, "battleship": 765, "colony_ship": 6, "transporter": 6, "light_hunter": 1148}, "attacker_remaining": {"bomber": 30, "cruiser": 882, "destroyer": 882, "battleship": 2939, "light_hunter": 204}, "defender_remaining": {"cruiser": 39, "destroyer": 39, "battleship": 39, "light_hunter": 59}}
379ba0b1-e2b7-4d5f-a2d5-623bc12ada34	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Quartier rouge	spy_attack	success	0	0	1	2026-03-02 00:12:35.81651	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Quartier rouge", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -12, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
c022b7b2-2aa5-4658-8a8b-3082d8c6705f	c34a3382-e6eb-4f51-8d48-021102098f85	Orion-63	spy_defense	alert	0	0	0	2026-03-02 00:12:35.818885	Marc	{"type": "spy_alert", "coordinates": "[1:1:7]", "attacker_planet": "Orion-63", "attacker_player": "Marc"}
c5ab5cd6-85da-451d-805d-62d005e7f6f1	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Terre du Milieu	defense	defeat	-113959901.7661203	-109144154.862311	1543	2026-03-02 00:31:29.052669	Gollum	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 5106200 dégâts", "Défenseur inflige 727805 dégâts", "--- ROUND 2 ---", "Attaquant inflige 4985300 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 113959901.7661203, "crystal": 109144154.862311, "deuterium": 26135987.02631041}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 1543}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Gollum", "attacker_losses": 117, "defender_losses": 1543, "attacker_initial": {"bomber": 30, "cruiser": 882, "destroyer": 882, "battleship": 2939, "light_hunter": 204}, "defender_initial": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "colony_ship": 1, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}, "attacker_remaining": {"bomber": 29, "cruiser": 861, "destroyer": 861, "battleship": 2870, "light_hunter": 199}, "defender_remaining": {}}
b9c0085c-04da-4c33-8b52-1a1422923b39	e777dba1-794e-46cd-aca8-908ad8948537	Broute moules	attack	victory	113959901.7661203	109144154.862311	117	2026-03-02 00:31:29.052669	Lapin en rute	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 5106200 dégâts", "Défenseur inflige 727805 dégâts", "--- ROUND 2 ---", "Attaquant inflige 4985300 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 113959901.7661203, "crystal": 109144154.862311, "deuterium": 26135987.02631041}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 29, "cruiser": 861, "destroyer": 861, "battleship": 2870, "light_hunter": 199}, "total_ships": 117}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Lapin en rute", "attacker_losses": 117, "defender_losses": 1543, "attacker_initial": {"bomber": 30, "cruiser": 882, "destroyer": 882, "battleship": 2939, "light_hunter": 204}, "defender_initial": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "colony_ship": 1, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}, "attacker_remaining": {"bomber": 29, "cruiser": 861, "destroyer": 861, "battleship": 2870, "light_hunter": 199}, "defender_remaining": {}}
880c63dc-2dfc-4207-91b6-b134ee3136bd	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Vega IX	defense	victory	-0	-0	318	2026-03-02 00:59:07.298967	Vince	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 663000 dégâts", "Défenseur inflige 1052205 dégâts", "--- ROUND 2 ---", "Attaquant inflige 477300 dégâts", "Défenseur inflige 965100 dégâts", "--- ROUND 3 ---", "Attaquant inflige 304700 dégâts", "Défenseur inflige 909200 dégâts", "--- ROUND 4 ---", "Attaquant inflige 142150 dégâts", "Défenseur inflige 880850 dégâts", "Attaquant détruit !", "RÉSULTAT: VICTOIRE DÉFENSEUR"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"cruiser": 40, "destroyer": 286, "battleship": 142, "heavy_hunter": 501, "light_hunter": 256}, "total_ships": 318}, "result": "victory", "winner": "defender", "conquered": false, "is_defense": true, "opponent_name": "Vince", "attacker_losses": 834, "defender_losses": 318, "attacker_initial": {"bomber": 9, "cruiser": 100, "destroyer": 270, "battleship": 15, "heavy_hunter": 100, "light_hunter": 340}, "defender_initial": {"bomber": 1, "cruiser": 53, "recycler": 1, "deathstar": 1, "destroyer": 357, "spy_probe": 2, "battleship": 178, "colony_ship": 1, "transporter": 1, "heavy_hunter": 626, "light_hunter": 322}, "attacker_remaining": {}, "defender_remaining": {"cruiser": 40, "destroyer": 286, "battleship": 142, "heavy_hunter": 501, "light_hunter": 256}}
1d8fbcfb-dee5-437e-9011-119f079a27f6	c34a3382-e6eb-4f51-8d48-021102098f85	Orion-63	defense	defeat	-0	-0	65	2026-03-02 01:12:19.415569	Marc	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 525000 dégâts", "Défenseur inflige 936300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 372450 dégâts", "Défenseur inflige 732540 dégâts", "--- ROUND 3 ---", "Attaquant inflige 251400 dégâts", "Défenseur inflige 528780 dégâts", "--- ROUND 4 ---", "Attaquant inflige 163250 dégâts", "Défenseur inflige 325020 dégâts", "--- ROUND 5 ---", "Attaquant inflige 110350 dégâts", "Défenseur inflige 121260 dégâts", "--- ROUND 6 ---", "Attaquant inflige 89350 dégâts", "Défenseur inflige 103300 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"cruiser": 29, "destroyer": 29, "battleship": 29, "light_hunter": 47}, "total_ships": 65}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": true, "opponent_name": "Marc", "attacker_losses": 693, "defender_losses": 65, "attacker_initial": {"bomber": 50, "cruiser": 350, "destroyer": 100, "battleship": 100, "heavy_hunter": 100, "light_hunter": 100}, "defender_initial": {"cruiser": 39, "deathstar": 5, "destroyer": 39, "spy_probe": 6, "battleship": 39, "colony_ship": 6, "transporter": 6, "light_hunter": 59}, "attacker_remaining": {"bomber": 6, "cruiser": 49, "destroyer": 13, "battleship": 13, "heavy_hunter": 13, "light_hunter": 13}, "defender_remaining": {"cruiser": 29, "destroyer": 29, "battleship": 29, "light_hunter": 47}}
a627e563-0742-441c-9012-72f516544927	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Quartier rouge	attack	defeat	0	0	693	2026-03-02 01:12:19.415569	Carlito89	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 525000 dégâts", "Défenseur inflige 936300 dégâts", "--- ROUND 2 ---", "Attaquant inflige 372450 dégâts", "Défenseur inflige 732540 dégâts", "--- ROUND 3 ---", "Attaquant inflige 251400 dégâts", "Défenseur inflige 528780 dégâts", "--- ROUND 4 ---", "Attaquant inflige 163250 dégâts", "Défenseur inflige 325020 dégâts", "--- ROUND 5 ---", "Attaquant inflige 110350 dégâts", "Défenseur inflige 121260 dégâts", "--- ROUND 6 ---", "Attaquant inflige 89350 dégâts", "Défenseur inflige 103300 dégâts", "RÉSULTAT: MATCH NUL"], "loot": {"metal": 0.0, "crystal": 0.0, "deuterium": 0.0}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"bomber": 6, "cruiser": 49, "destroyer": 13, "battleship": 13, "heavy_hunter": 13, "light_hunter": 13}, "total_ships": 693}, "result": "defeat", "winner": "draw", "conquered": false, "is_defense": false, "opponent_name": "Carlito89", "attacker_losses": 693, "defender_losses": 65, "attacker_initial": {"bomber": 50, "cruiser": 350, "destroyer": 100, "battleship": 100, "heavy_hunter": 100, "light_hunter": 100}, "defender_initial": {"cruiser": 39, "deathstar": 5, "destroyer": 39, "spy_probe": 6, "battleship": 39, "colony_ship": 6, "transporter": 6, "light_hunter": 59}, "attacker_remaining": {"bomber": 6, "cruiser": 49, "destroyer": 13, "battleship": 13, "heavy_hunter": 13, "light_hunter": 13}, "defender_remaining": {"cruiser": 29, "destroyer": 29, "battleship": 29, "light_hunter": 47}}
f74c4b67-0f7d-46b8-9c87-c1d92dbc39a1	e777dba1-794e-46cd-aca8-908ad8948537	Alpha Secundus 219 (Homeworld)	spy_attack	success	0	0	1	2026-03-02 03:00:08.919588	Vito	{"type": "spy_report", "fleet": {"bomber": 1000, "cruiser": 1000, "recycler": 1, "deathstar": 25, "destroyer": 1000, "spy_probe": 5, "battleship": 1000, "colony_ship": 5, "transporter": 5, "heavy_hunter": 1000, "light_hunter": 1000}, "defense": 40650, "resources": {"metal": 244630791.83525285, "crystal": 214186726.2336214, "deuterium": 16663946.896655157}, "coordinates": "[1:26:5]", "target_planet": "Alpha Secundus 219 (Homeworld)", "target_player": "Vito", "detection_level": "full", "tech_difference": 4, "target_planet_id": "e8836690-7ec2-430b-bb68-3aa95545adf9"}
04f496ab-72d5-419b-8fd2-441e3c958160	e8836690-7ec2-430b-bb68-3aa95545adf9	Terre du Milieu	spy_defense	alert	0	0	0	2026-03-02 03:00:08.922002	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Terre du Milieu", "attacker_player": "Gollum"}
32f64b51-6284-40df-8cd4-ab9cd56d88e3	e777dba1-794e-46cd-aca8-908ad8948537	Quartier rouge	spy_attack	success	0	0	1	2026-03-02 03:02:07.319223	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Quartier rouge", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -8, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
ad7ce58d-a1d6-483e-8aff-7c4c6a5ce882	c34a3382-e6eb-4f51-8d48-021102098f85	Terre du Milieu	spy_defense	alert	0	0	0	2026-03-02 03:02:07.326703	Gollum	{"type": "spy_alert", "coordinates": "[1:95:5]", "attacker_planet": "Terre du Milieu", "attacker_player": "Gollum"}
7f43f0d9-6799-47dc-a5c5-7acfd345ecab	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Terre du Milieu	spy_attack	success	0	0	1	2026-03-02 15:32:34.917055	Gollum	{"type": "spy_report", "fleet": {"bomber": 29, "cruiser": 861, "recycler": 0, "deathstar": 0, "destroyer": 861, "spy_probe": 95, "battleship": 2870, "colony_ship": 0, "transporter": 0, "heavy_hunter": 0, "light_hunter": 199}, "defense": 29241, "resources": {"metal": 271369922.1655074, "crystal": 227693048.29880282, "deuterium": 64129182.46696608}, "coordinates": "[1:95:5]", "target_planet": "Terre du Milieu", "target_player": "Gollum", "detection_level": "full", "tech_difference": 7, "target_planet_id": "e777dba1-794e-46cd-aca8-908ad8948537"}
d65af7af-7aa3-402a-bb7b-13599424d140	e777dba1-794e-46cd-aca8-908ad8948537	Broute moules	spy_defense	alert	0	0	0	2026-03-02 15:32:34.920139	Lapin en rute	{"type": "spy_alert", "coordinates": "[1:67:15]", "attacker_planet": "Broute moules", "attacker_player": "Lapin en rute"}
3d72dacf-83db-42fd-831b-777d5de1ab54	82c16717-d644-43e9-ba12-8350e9dec152	Broute moules	defense	defeat	-58980052.31005739	-38067039.01975538	15	2026-03-03 09:31:25.023402	Lapin en rute	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 1271520 dégâts", "Défenseur inflige 801020 dégâts", "--- ROUND 2 ---", "Attaquant inflige 1010300 dégâts", "Défenseur inflige 600765 dégâts", "--- ROUND 3 ---", "Attaquant inflige 893850 dégâts", "Défenseur inflige 400510 dégâts", "--- ROUND 4 ---", "Attaquant inflige 815150 dégâts", "Défenseur inflige 200255 dégâts", "--- ROUND 5 ---", "Attaquant inflige 775050 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 58980052.31005739, "crystal": 38067039.01975538, "deuterium": 5399367.724498678}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {}, "total_ships": 15}, "result": "defeat", "winner": "attacker", "conquered": false, "is_defense": true, "opponent_name": "Lapin en rute", "attacker_losses": 653, "defender_losses": 15, "attacker_initial": {"bomber": 1, "cruiser": 40, "recycler": 1, "deathstar": 1, "destroyer": 286, "spy_probe": 1, "battleship": 142, "colony_ship": 1, "transporter": 1, "heavy_hunter": 1001, "light_hunter": 900}, "defender_initial": {"deathstar": 5, "spy_probe": 5, "colony_ship": 5}, "attacker_remaining": {"cruiser": 27, "destroyer": 207, "battleship": 102, "heavy_hunter": 731, "light_hunter": 655}, "defender_remaining": {}}
ce47940e-5509-411c-a2a9-f7ad5ae7d3c2	ed5401d5-0f45-4939-a003-c5cf17aa11e7	Vega IX	attack	victory	58980052.31005739	38067039.01975538	653	2026-03-03 09:31:25.023402	Vince	{"log": ["⚔️ ENGAGEMENT DE COMBAT PvP", "--- ROUND 1 ---", "Attaquant inflige 1271520 dégâts", "Défenseur inflige 801020 dégâts", "--- ROUND 2 ---", "Attaquant inflige 1010300 dégâts", "Défenseur inflige 600765 dégâts", "--- ROUND 3 ---", "Attaquant inflige 893850 dégâts", "Défenseur inflige 400510 dégâts", "--- ROUND 4 ---", "Attaquant inflige 815150 dégâts", "Défenseur inflige 200255 dégâts", "--- ROUND 5 ---", "Attaquant inflige 775050 dégâts", "Défenseur détruit !", "RÉSULTAT: VICTOIRE ATTAQUANT"], "loot": {"metal": 58980052.31005739, "crystal": 38067039.01975538, "deuterium": 5399367.724498678}, "debris": {"metal": 0.0, "crystal": 0.0}, "losses": {"ships": {"cruiser": 27, "destroyer": 207, "battleship": 102, "heavy_hunter": 731, "light_hunter": 655}, "total_ships": 653}, "result": "victory", "winner": "attacker", "conquered": false, "is_defense": false, "opponent_name": "Vince", "attacker_losses": 653, "defender_losses": 15, "attacker_initial": {"bomber": 1, "cruiser": 40, "recycler": 1, "deathstar": 1, "destroyer": 286, "spy_probe": 1, "battleship": 142, "colony_ship": 1, "transporter": 1, "heavy_hunter": 1001, "light_hunter": 900}, "defender_initial": {"deathstar": 5, "spy_probe": 5, "colony_ship": 5}, "attacker_remaining": {"cruiser": 27, "destroyer": 207, "battleship": 102, "heavy_hunter": 731, "light_hunter": 655}, "defender_remaining": {}}
0046f6eb-0f25-4659-ab34-208021519dc8	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Quartier rouge	spy_attack	success	0	0	1	2026-03-04 00:42:47.817709	Carlito89	{"type": "spy_report", "fleet": null, "defense": null, "resources": null, "coordinates": "[1:62:2]", "target_planet": "Quartier rouge", "target_player": "Carlito89", "detection_level": "none", "tech_difference": -6, "target_planet_id": "c34a3382-e6eb-4f51-8d48-021102098f85"}
b3271b3a-db7b-49f9-8814-a6c22fb62874	c34a3382-e6eb-4f51-8d48-021102098f85	Orion-63	spy_defense	alert	0	0	0	2026-03-04 00:42:47.821027	Marc	{"type": "spy_alert", "coordinates": "[1:1:7]", "attacker_planet": "Orion-63", "attacker_player": "Marc"}
fd1d952f-d9c9-48f0-9790-2ca7d75965da	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	Vega IX	spy_attack	success	0	0	1	2026-03-04 00:43:19.229765	Vince	{"type": "spy_report", "fleet": {"bomber": 0, "cruiser": 0, "deathstar": 5, "destroyer": 0, "spy_probe": 5, "battleship": 0, "colony_ship": 5, "heavy_hunter": 0, "light_hunter": 0}, "defense": 6202, "resources": {"metal": 93299652.2670187, "crystal": 97591064.42639096, "deuterium": 11829909.809520014}, "coordinates": "[1:22:4]", "target_planet": "Vega IX", "target_player": "Vince", "detection_level": "full", "tech_difference": 3, "target_planet_id": "82c16717-d644-43e9-ba12-8350e9dec152"}
74d8234c-5020-4f53-b3da-45b43cf19c8c	82c16717-d644-43e9-ba12-8350e9dec152	Orion-63	spy_defense	alert	0	0	0	2026-03-04 00:43:19.311115	Marc	{"type": "spy_alert", "coordinates": "[1:1:7]", "attacker_planet": "Orion-63", "attacker_player": "Marc"}
\.


--
-- TOC entry 3930 (class 0 OID 18509)
-- Dependencies: 242
-- Data for Name: construction_queue; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.construction_queue (id, planet_id, building_type, level, end_time) FROM stdin;
4c8ebffd-7742-49a2-9c1a-0aed23bedce5	82c16717-d644-43e9-ba12-8350e9dec152	crystal_mine	24	2026-03-05 16:20:53.113064
38bf161d-187c-434b-8012-fa66c00a9080	82c16717-d644-43e9-ba12-8350e9dec152	shipyard	15	2026-03-05 02:07:04.817385
7a8ab1b6-70a6-4ef5-b8cb-e37396306fa7	e777dba1-794e-46cd-aca8-908ad8948537	hangar	14	2026-03-05 00:38:15.993564
b9a70a48-7bb7-4800-bbf9-45f21c6dcb6f	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	hyperspace_drive	8	2026-03-05 04:31:10.416867
b994fa1d-a12b-47bb-95a1-2fa3360078a5	fd5b308c-668c-4f6b-9079-e77ade26fdf8	espionage_tech	18	2026-03-07 18:07:56.714157
36450a24-4adc-4a25-8153-d25c8a70fee4	fd5b308c-668c-4f6b-9079-e77ade26fdf8	armour_tech	18	2026-03-06 21:09:50.618012
\.


--
-- TOC entry 3931 (class 0 OID 18519)
-- Dependencies: 243
-- Data for Name: conversation; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.conversation (id, user1_id, user2_id, last_message_at, user1_unread_count, user2_unread_count, user1_archived, user2_archived) FROM stdin;
5272ff84-be15-4e60-af4d-a4ac4d0a4fba	5c07a266-2739-4999-80c4-bcbf67b81466	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	2026-01-26 20:12:07.352661	0	0	f	f
786436fd-0740-46dc-a376-0b2ca4f3b361	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	91944471-91a5-4961-9964-01d20e3e697a	2026-01-22 19:00:12.329414	0	1	f	f
bc1bdce8-3ec7-436f-9018-103cf2632c30	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	2026-01-24 18:22:41.429083	0	0	f	f
\.


--
-- TOC entry 3932 (class 0 OID 18534)
-- Dependencies: 244
-- Data for Name: daily_mission; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.daily_mission (id, mission_key, name, description, mission_type, target, required_amount, difficulty, reward_metal, reward_crystal, reward_deuterium, reward_xp, is_active) FROM stdin;
a0000001-0000-0000-0000-000000000001	build_hunters_5	Escadron de chasse	Construisez 5 chasseurs légers	build	light_hunter	5	easy	1000	500	0	10	t
a0000001-0000-0000-0000-000000000002	collect_metal_10k	Mineur assidu	Collectez 10 000 de métal	collect	metal	10000	easy	2000	0	0	10	t
a0000001-0000-0000-0000-000000000003	upgrade_building_1	Constructeur	Améliorez n'importe quel bâtiment	upgrade	any	1	easy	500	500	0	10	t
a0000001-0000-0000-0000-000000000004	expedition_2	Explorateur	Lancez 2 expéditions	expedition	any	2	medium	3000	2000	500	25	t
a0000001-0000-0000-0000-000000000005	spy_3	Agent secret	Espionnez 3 planètes ennemies	spy	any	3	medium	2000	3000	0	25	t
a0000001-0000-0000-0000-000000000006	build_cruisers_3	Flotte de croisière	Construisez 3 croiseurs	build	cruiser	3	medium	5000	3000	1000	25	t
a0000001-0000-0000-0000-000000000007	attack_1	Conquérant	Attaquez une planète ennemie	attack	any	1	hard	10000	5000	2000	50	t
a0000001-0000-0000-0000-000000000008	transport_5k	Logisticien	Transportez 5 000 ressources au total	transport	any	5000	hard	5000	5000	2000	50	t
\.


--
-- TOC entry 3933 (class 0 OID 18557)
-- Dependencies: 245
-- Data for Name: defense_requirements; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.defense_requirements (id, defense_type_id, required_tech_id, required_building_id, required_level) FROM stdin;
1	1	\N	7	1
2	2	1	\N	2
3	2	2	\N	3
4	3	1	\N	3
5	3	2	\N	6
6	3	\N	7	4
7	4	1	\N	6
8	4	13	\N	3
9	4	5	\N	1
10	5	3	\N	4
11	6	4	\N	7
12	7	5	\N	2
13	8	5	\N	6
14	9	\N	7	2
15	10	8	\N	1
16	10	\N	7	4
17	10	15	7	6
\.


--
-- TOC entry 3935 (class 0 OID 18564)
-- Dependencies: 247
-- Data for Name: defense_types; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.defense_types (id, defense_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, build_time_seconds, attack, shield, hull, description, created_at) FROM stdin;
1	rocket_launcher	Lance-Roquettes	light	2000	0	0	2000	80	20	200	Défense anti-vaisseau légère	2026-01-21 14:18:53.189964
2	light_laser	Laser Léger	light	1500	500	0	2000	100	25	100	Défense laser rapide	2026-01-21 14:18:53.189964
3	heavy_laser	Laser Lourd	heavy	6000	2000	0	8000	250	100	800	Défense laser lourde	2026-01-21 14:18:53.189964
4	gauss_cannon	Canon de Gauss	heavy	20000	15000	2000	35000	1100	200	3500	Canon électromagnétique puissant	2026-01-21 14:18:53.189964
5	ion_cannon	Canon à Ions	heavy	5000	3000	0	8000	150	500	800	Neutralise les boucliers	2026-01-21 14:18:53.189964
7	small_shield	Petit Bouclier	shield	10000	10000	0	0	1	2000	20000	Bouclier planétaire léger	2026-01-21 14:18:53.189964
8	large_shield	Grand Bouclier	shield	50000	50000	0	0	1	10000	100000	Bouclier planétaire lourd	2026-01-21 14:18:53.189964
9	anti_missile	Missile Anti-Balistique	special	8000	0	2000	8000	1	1	800	Intercepte les missiles	2026-01-21 14:18:53.189964
10	interplanetary_missile	Missile Interplanétaire	special	1250000	80000	250000	120000	12000	5000	15000	Attaque à distance	2026-01-21 14:18:53.189964
6	plasma_turret	Tourelle à Plasma	heavy	50000	50000	30000	100000	6000	3000	10000	Défense plasma dévastatrice	2026-01-21 14:18:53.189964
\.


--
-- TOC entry 3937 (class 0 OID 18582)
-- Dependencies: 249
-- Data for Name: fleet_mission; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.fleet_mission (id, source_planet_id, target_planet_id, mission_type, arrival_time, metal, crystal, deuterium, ships_count, fleet_data) FROM stdin;
\.


--
-- TOC entry 3971 (class 0 OID 19354)
-- Dependencies: 283
-- Data for Name: global_chat_message; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.global_chat_message (id, sender_id, sender_name, content, created_at) FROM stdin;
5fbed4e5-37b7-4f84-ac93-bc32dfc5ccec	5c07a266-2739-4999-80c4-bcbf67b81466	phantomhex	Hello, j'ai commencé à rebosser dessus. Quelques modifs de faites	2026-01-26 18:21:04.743942
30fcc04a-60d4-4457-a4b4-4439321816f2	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	Carlito89	C’est bon ça 😝	2026-01-31 00:48:57.677968
a6e44b5f-1e01-4600-a6e7-2c866e3680e0	079f1020-0115-4e3d-b78c-5f9ec3e98003	ChupaChups	Beh il es temps lollll 😍	2026-01-31 21:50:15.82462
7fe81203-9dd2-4bd6-b8fb-83a7b672518d	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	Tomdindon	han ouais, mes couilles, ça chauffe toujours sur le portable et Carlito89 est toujours save ! Que faire de toutes ces étoiles de la mort ?	2026-02-02 09:29:58.602111
\.


--
-- TOC entry 3938 (class 0 OID 18600)
-- Dependencies: 250
-- Data for Name: login_streak; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.login_streak (id, user_id, current_streak, best_streak, total_login_days, last_login_date, daily_reward_claimed, last_reward_date) FROM stdin;
5151f0b2-2718-4d38-a7f0-f59be52ac28f	aa44498d-24ae-46d7-a1af-43c303f1fa8f	1	1	2	2026-02-16	f	\N
d62013f5-eece-47fc-962c-7bb87c4a821f	91944471-91a5-4961-9964-01d20e3e697a	2	2	2	2026-01-23	f	\N
28e22e0d-ddca-4096-a3f4-6bac5f90879a	6bfe5069-b203-4bd1-b92a-5648543065a3	1	2	8	2026-02-22	f	2026-02-11
8ab85d4e-9971-4706-99d5-bb3d0168b312	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	1	3	4	2026-01-26	t	2026-01-27
9256076a-5bb4-4dcc-b8a9-9f7f61d9b51e	91b8bdd3-38de-40f7-9ea1-523fb5117a46	1	1	1	2026-01-29	f	\N
62d22eb3-788e-44a3-be02-8414233bc6ba	5c07a266-2739-4999-80c4-bcbf67b81466	1	3	4	2026-02-02	f	2026-01-26
3872eea1-2a9c-4ee6-9e5d-4658e07b1e45	5c673356-eeda-4bef-95bf-c7686f0bf250	1	2	4	2026-02-07	f	\N
86b66ef4-86a5-4f89-8105-91c6da60f7ea	849ffcd5-711f-4fda-8d73-27654e2274ea	1	1	1	2026-03-01	f	\N
fe9d9a27-054c-4aea-970f-9ee4c601e9fa	e77bdc80-958a-4ea9-8167-18b653d265a1	7	7	24	2026-03-01	t	2026-03-01
8528c47b-30c3-42ae-a06e-cc0f06897f69	e0105e0b-ef87-4ef1-b511-29aa73b054e0	1	1	1	2026-03-01	t	2026-03-01
3679d283-51f9-4cee-a669-b936b939fe4c	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	7	7	8	2026-03-01	t	2026-03-02
017e28ea-f3fc-42ad-a024-73d2dfc2d557	079f1020-0115-4e3d-b78c-5f9ec3e98003	1	1	4	2026-02-09	f	2026-01-23
c2902343-c4fa-4a26-92d0-7f6e73a9dbbe	2bfc8dfe-5c21-403a-bd72-079278cc0743	7	7	12	2026-03-01	t	2026-03-02
410d5f07-8c60-4b74-ada6-75744f0f024e	fbbd65cc-c22b-4e5a-ad27-caa1ccfef603	1	1	1	2026-03-03	f	\N
e82e06e5-524d-4e2b-933d-68fd3a5c6abc	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	5	36	41	2026-03-04	f	2026-02-14
\.


--
-- TOC entry 3939 (class 0 OID 18614)
-- Dependencies: 251
-- Data for Name: market_listing; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.market_listing (id, seller_planet_id, seller_user_id, resource_type, quantity, price_per_unit, target_resource, created_at, expires_at, is_active) FROM stdin;
b9c07278-02ed-4da8-a619-52487f678e3a	ed5401d5-0f45-4939-a003-c5cf17aa11e7	6bfe5069-b203-4bd1-b92a-5648543065a3	deuterium	500000	0.65	metal	2026-01-24 03:10:02.753036	2026-01-31 03:10:02.753036	f
593dc0a5-2da8-4904-b435-82b0dc84ffcf	a1150086-b563-4c44-b97c-2b6dbd35fa2c	e0105e0b-ef87-4ef1-b511-29aa73b054e0	metal	1000	0.65	crystal	2026-03-02 00:20:04.413087	2026-03-09 00:20:04.413087	f
\.


--
-- TOC entry 3940 (class 0 OID 18628)
-- Dependencies: 252
-- Data for Name: market_price_history; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.market_price_history (id, resource_type, npc_buy_price, npc_sell_price, avg_player_price, player_listings_count, recorded_at) FROM stdin;
\.


--
-- TOC entry 3941 (class 0 OID 18639)
-- Dependencies: 253
-- Data for Name: market_transaction; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.market_transaction (id, seller_planet_id, seller_user_id, buyer_planet_id, buyer_user_id, resource_sold, resource_paid, quantity_sold, quantity_paid, price_per_unit, tax_amount, transaction_type, created_at) FROM stdin;
a44304d1-e524-4d6b-80e2-367b08eefddf	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	52771.34545436908	0.689821509207439	0	npc	2026-01-22 07:13:53.231428
ae3c3c77-be0e-41b7-b8c6-292ee149ae94	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	54737.49822714552	0.7155228526424251	0	npc	2026-01-22 07:13:58.399922
5c4cf78f-c94e-4557-840b-7e0104ef5b63	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	56809.698820800426	0.7426104421019665	0	npc	2026-01-22 07:13:59.405669
98fa24cb-820a-4df3-87bd-034bc64b6a35	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	58996.46273772957	0.7711955913428703	0	npc	2026-01-22 07:13:59.744135
501e09d0-921a-4492-a3c5-d10d53dff766	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	61315.884063115634	0.8015148243544528	0	npc	2026-01-22 07:14:00.028789
e150689a-5175-4edc-94b3-826feae04c3e	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	63779.07976987803	0.8337134610441573	0	npc	2026-01-22 07:14:00.129549
59f46c01-888e-44eb-b21b-b49876c48c53	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	66398.36715818115	0.867952511871649	0	npc	2026-01-22 07:14:00.329743
a1a5775f-5895-4033-8a21-1335f0652e72	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	66402.91034590083	0.868011899946416	0	npc	2026-01-22 07:14:00.430843
d305f3c0-6ec3-4101-98ec-4a0bdf1ded80	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	69192.15781750933	0.9044726512092723	0	npc	2026-01-22 07:14:00.558475
f7130c48-bea5-4653-a4d4-857e5f386358	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	72166.41050525731	0.943351771310553	0	npc	2026-01-22 07:14:00.725203
9b4436bb-1b39-423e-936e-fa81b239d576	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	75342.65443698553	0.9848712998298762	0	npc	2026-01-22 07:14:00.947819
198fac98-13bb-47d6-8f76-93b85732a1ed	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	78739.8892938388	1.029279598612272	0	npc	2026-01-22 07:14:01.102358
bead6d0a-27c7-46f2-bad0-7dcb9698b8f3	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	82379.42365922937	1.0768552112317564	0	npc	2026-01-22 07:14:01.328395
0e8b5fa0-9a34-470f-8c2d-377ed8dea027	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	86290.46729119036	1.1279799645907238	0	npc	2026-01-22 07:14:01.628483
97e249b6-b97e-4fab-a8ed-22ea80cf788c	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	90489.81634518562	1.1828734162769363	0	npc	2026-01-22 07:14:01.791058
4c956f23-dc88-4cc7-b0c3-a520924c54f6	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	95013.0635985547	1.2420008313536561	0	npc	2026-01-22 07:14:02.029841
936e8a0f-53f7-42a2-b4f5-11caafc77098	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	99894.9258641741	1.305816024368289	0	npc	2026-01-22 07:14:02.280177
2c36c84f-675e-4531-84e3-6db264a3ca95	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	105174.94431897729	1.3748358734506836	0	npc	2026-01-22 07:14:02.432783
949aec16-c8d6-4513-be7d-7fda5c6fee07	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	110898.31728817648	1.449651206381392	0	npc	2026-01-22 07:14:02.527912
69d28ad1-2e81-490a-96fd-13bc0ee3e3cd	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	117116.90652130752	1.5309399545268958	0	npc	2026-01-22 07:14:02.530758
c08f48ef-d2c3-4e30-a3e1-a10739b48ff8	072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	90000	117276.25252711002	1.5330229088511114	0	npc	2026-01-22 07:14:02.63317
c9d2211d-2588-4be0-aa30-2bad93f930c7	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	500000	288314.2155208646	0.6783863894608578	0	npc	2026-01-22 10:24:49.234558
47b53027-c0d6-4177-b345-1c741306cd79	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	4745885	3624629.4493591553	0.8985194416684213	0	npc	2026-01-22 21:03:40.031018
5fe2328a-16ef-45bb-bea6-935023cb1208	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	200000	57893.80235262411	0.3405517785448477	0	npc	2026-01-22 23:23:40.836056
ec2ae398-80a2-4c70-b332-c13e363b5e01	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	500000	147746.01246243698	0.3476376763822046	0	npc	2026-01-22 23:35:58.770807
72044c0f-674a-4cd2-add0-efb17bdbc9e9	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	300000	128013.88033707606	0.5020152170081414	0	npc	2026-01-23 00:35:03.836425
7dfc64e0-16bc-4c21-8d9c-9f37a8b62bba	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	500000	186126.41989381745	0.43794451739721757	0	npc	2026-01-23 01:42:12.62967
983cc877-3c30-40cd-a92a-64822c1faa47	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	20000	7878.229468405858	0.46342526284740343	0	npc	2026-01-23 01:42:44.134775
dc0264c7-febd-403f-a3ab-309ecb7e3cd3	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	12000	4440.807108797974	0.4353732459605857	0	npc	2026-01-23 02:19:56.96626
4e27d4e3-ceb4-4642-9349-4144188d1b14	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	900000	287799.21692059	0.3762081266935817	0	npc	2026-01-23 03:53:18.534824
e79aa3b5-9c1d-4b70-b677-cb5db4f528e9	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	100000	34906.568452337226	0.4106655112039674	0	npc	2026-01-23 03:53:54.839806
408dc004-7ba7-43a9-a049-8d2c317ff148	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	100000	69215.19165944435	0.8142963724640512	0	npc	2026-01-23 03:54:05.443951
e722a73f-7e8e-4474-9007-d793fea7109c	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	100000	69938.73040540417	0.8228085930047551	0	npc	2026-01-23 03:54:08.533804
10a85124-eb42-4cce-a9a5-1434c0ae1b35	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	450000	298549.06047195446	0.7805204195345216	0	npc	2026-01-23 04:02:04.03203
237e4e10-c2d4-4fe0-b8b4-91b14ebdd9bf	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	1000000	523804.6776647199	0.6162407972526116	0	npc	2026-01-23 09:02:05.43362
f3aaf616-689e-4db3-9345-5da8723d95df	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	3000000	1697132.4606201153	0.6655421414196531	0	npc	2026-01-23 09:26:56.232163
b1f6a08b-4b92-4f92-ab24-d9ab1cba48d1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	1236383.2561360071	1847616.0696456926	1.7580842780759383	0	npc	2026-01-24 03:33:45.630009
6051a73c-023f-4077-85e4-0836a7217e14	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	2000000	1169411.0286784992	0.6878888403991172	0	npc	2026-01-24 03:34:26.141216
9930b40d-bc05-4c9e-8de5-f390dde89081	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	1000000	319852.1988335088	0.37629670451001035	0	npc	2026-01-24 06:05:17.026711
01e6ec9c-abe8-4427-8925-91d52186671a	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	1000000	475450.8577404554	0.5593539502828887	0	npc	2026-01-24 06:05:33.520918
7f4d2961-526e-4330-a1af-22b278660972	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	3000000	2935332.4610035047	1.1511107690209823	0	npc	2026-01-24 17:37:24.561676
5f3ecd3b-eb72-45cd-89c3-4663fce0a887	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	400000	642275.7191889273	1.88904623290861	0	npc	2026-01-24 17:38:04.030624
f2e952df-375d-4465-abf6-fa4401047ffb	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	1092948	2537278.562540675	2.7311762343579287	0	npc	2026-01-26 02:42:47.652404
0d5e255c-0b04-4e24-833d-a373c43cca41	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	1000000	1275401.5726285737	1.5004724383865573	0	npc	2026-01-26 02:43:04.929302
28e933b1-fe11-4698-92fc-a6e33f6f3673	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	2500000	4170055.561974857	1.9623790879881682	0	npc	2026-01-27 21:15:22.379886
5e121cdc-0146-4cbe-8033-d6a405ab8260	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	2500000	4191633.15995078	1.9725332517415437	0	npc	2026-01-27 21:15:37.540431
601bba5e-264d-4d39-8af1-195e4b991563	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	1000000	1800527.266216744	2.118267372019699	0	npc	2026-01-27 21:17:22.60889
10f4f4ba-7edc-48fa-a278-06312718c848	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	2000000	3655730.880951119	2.1504299299712466	0	npc	2026-01-28 01:04:04.179498
e3143f44-5713-4364-bacb-e8a403f2d65b	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	4000000	4211516.707795313	1.2386813846456801	0	npc	2026-01-28 05:17:45.451901
8187a382-c602-40f9-beae-b9795d632161	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	1000000	2038500.7337300344	2.3982361573294524	0	npc	2026-01-28 05:18:39.214547
735e02a3-d97e-4ede-89ec-d0cb636d7d81	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	3500000	7924541.273674873	2.6637113524957554	0	npc	2026-01-28 16:30:11.215143
76a29944-0e81-4765-8de6-d34e9cdc182c	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	1000000	1261520.6254253807	1.4841419122651538	0	npc	2026-01-29 05:55:59.927218
1bf02502-1003-40c1-878d-382f334b70d9	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	5000000	6162450.105500515	1.449988260117768	0	npc	2026-01-29 06:51:17.661108
a6289a4e-1fa8-4c69-9dc9-769a05fed121	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	5000000	12073739.589099236	2.8408799033174676	0	npc	2026-01-30 08:57:36.467738
8dcdb2d4-9581-40d0-8733-f7f54d279f2a	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	5000000	12074259.035139408	2.8410021259151548	0	npc	2026-01-30 08:59:06.173566
bbf46f35-2828-4ed4-a468-c3e04f22b3a4	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	10000000	14841516.419513237	1.7460607552368514	0	npc	2026-01-31 01:41:37.048749
d01d9c22-1fa1-4cad-a0a0-303e033466a1	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	2000000	7212799.146293352	4.242823027231384	0	npc	2026-01-31 16:31:59.554996
29bace81-0949-4a55-819a-6025950ba7a8	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	15000000	2332750.946499576	0.18296085854898636	0	npc	2026-02-01 18:50:54.652565
04958b47-2f4e-44b2-bdf1-03c673d28ae6	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	15000000	4003031.7535769097	0.31396327479034586	0	npc	2026-02-01 18:51:50.788332
74f6cc56-f316-493b-b406-ac575fbe1923	e8836690-7ec2-430b-bb68-3aa95545adf9	5c673356-eeda-4bef-95bf-c7686f0bf250	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	1000000	2398108.2079431606	2.821303774050777	0	npc	2026-02-02 16:24:14.289316
f739c3c8-a868-40a0-87a5-66c7c88184b5	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	metal	10000000	9185970.833421303	1.0807024509907415	0	npc	2026-02-06 20:54:16.485085
c24b38bf-f4c8-4a83-9690-f0ae97dc8b7e	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	1000000	2339545.982938424	2.752407038751087	0	npc	2026-02-06 20:55:19.527647
b623dd84-5fbe-4566-833b-c9ea2b9c110f	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	5000000	1624183.9679239623	0.3821609336291676	0	npc	2026-02-07 13:59:48.282589
61dd7d65-8146-427f-ad04-73dc8539205d	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	5000000	1544783.1353533447	0.3634783847890223	0	npc	2026-02-08 17:34:34.383985
1facb776-e77e-41d8-948c-665d6062d8d9	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	5000000	1701836.101008556	0.4004320237667191	0	npc	2026-02-08 17:34:45.484691
400367ec-1804-446d-8684-42f962da85d5	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	500000	157497.46681411678	0.3705822748567454	0	npc	2026-02-08 17:34:59.909493
40b49b5b-d1ce-460b-8df4-69be765b824b	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	500000	172731.39068672238	0.40642680161581735	0	npc	2026-02-08 17:35:02.089098
a5c9467b-46c0-46c8-9c6f-60255eefbe71	c34a3382-e6eb-4f51-8d48-021102098f85	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	crystal	58486002	47199396.28979491	0.9494357558823354	0	npc	2026-02-09 15:00:41.186539
4e581cef-f369-4e91-b4ed-adabb3180f3e	c34a3382-e6eb-4f51-8d48-021102098f85	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	2322942	3540059.4291039226	1.7928884143236428	0	npc	2026-02-09 15:01:08.984699
03688e4d-4fcc-480b-ad4a-798e7c26a151	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	13000000	32127038.633941673	2.907424310763952	0	npc	2026-02-17 17:07:43.684392
befa3ad3-e847-4e0f-8dbf-d488d127698a	2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	30000000	6913879.321039597	0.27113252239370966	0	npc	2026-02-19 20:55:16.925418
af279958-c9df-4dbf-9429-730dcd4ba669	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	25000000	82271389.72355664	3.871594810520313	0	npc	2026-02-22 22:01:21.778734
49d086c0-f1e7-454e-bf17-372ec04b2987	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	crystal	25000000	79914920.56596152	3.760702144280542	0	npc	2026-02-22 22:01:41.737356
2bd120ad-4757-49b2-93fc-eeb9c79e3c71	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	deuterium	metal	5500000	22350413.41015858	4.780837093082049	0	npc	2026-02-22 22:02:06.38736
c1e0f512-140c-4833-9d3d-7d9db88dafe0	fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	crystal	deuterium	10000000	1923321.7213486498	0.22627314368807647	0	npc	2026-02-22 23:58:16.297193
913b00d4-407a-4565-8db9-96b5d27b980f	82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	10000000	1584781.729081395	0.18644490930369353	0	npc	2026-02-24 22:25:34.212874
520e4ebf-55ce-4254-beb5-22518e79eea1	82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	10000000	1602244.4904700476	0.1884993518200056	0	npc	2026-02-24 22:25:40.211279
174fe2a7-99f7-479e-bd13-7e1611eed4b0	82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	10000000	1620006.4646785615	0.19058899584453667	0	npc	2026-02-24 22:25:43.013871
2151cdea-26d9-40e2-b2b7-75e042d938ab	82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	15000000	2646093.1464487077	0.2075367173685261	0	npc	2026-03-02 02:44:27.376777
4f2e825e-3795-41d5-a031-79da44bf2ab8	82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	00000000-0000-0000-0000-000000000000	00000000-0000-0000-0000-000000000000	metal	deuterium	15000000	2712360.528503843	0.21273415909834062	0	npc	2026-03-02 02:44:32.8237
\.


--
-- TOC entry 3942 (class 0 OID 18655)
-- Dependencies: 254
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.message (id, sender_id, receiver_id, subject, content, is_read, created_at, conversation_id) FROM stdin;
efa8fb22-fd6e-4182-9be3-8f39908f5f03	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	91944471-91a5-4961-9964-01d20e3e697a	Nouvelle discussion	alors petite bite on fais moins le malin maintenant hein ??? mouhaaaaaaa	f	2026-01-22 19:00:12.331651	786436fd-0740-46dc-a376-0b2ca4f3b361
cd9f7b7d-4ad6-4c4d-8b32-8e54abaf421a	5c07a266-2739-4999-80c4-bcbf67b81466	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		le vaisseau colonisateur est fonctionnel, maintenant, normalement. Je vois que t'en as 5	t	2026-01-26 19:32:57.692583	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
e5d15893-8e21-46f6-80ee-ff320f0da43a	5c07a266-2739-4999-80c4-bcbf67b81466	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		Réglé !	t	2026-01-26 19:17:44.361339	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
c6b28785-5378-495d-88cf-17342487e317	5c07a266-2739-4999-80c4-bcbf67b81466	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		Fais CTRL + R pour voir	t	2026-01-26 19:54:54.357768	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
c0463fb7-236c-4a69-9cf8-f55b04f62599	5c07a266-2739-4999-80c4-bcbf67b81466	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		Bizarre :(	t	2026-01-26 19:55:00.37352	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
4195b37a-0c64-4ec4-bd45-f73b000a2fdd	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466		Oui mais je sais toujours pas colonisé 	t	2026-01-26 19:43:17.926979	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
74858efa-f3b3-4ac9-98a1-d4f44be7ff7e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466		Sur tablette c’est quoi ?	t	2026-01-26 20:12:07.354669	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
debf1384-c187-4f60-abcd-92a311730f5b	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466		Il m.inquide 0 disponible quand je veux coloniser 	t	2026-01-26 19:44:27.099552	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
b1c103f5-ab47-45b9-86f0-7c5bb2243c8d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466	Nouvelle discussion	salut cava ? dis la zone debutante elle est ilimité ? car je sais attaqué personne :(	t	2026-01-24 16:41:07.427331	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
5ceb4ff7-5965-4de9-9aec-cbc4d211f57e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003		mouhaaaa	t	2026-01-24 18:22:41.430978	bc1bdce8-3ec7-436f-9018-103cf2632c30
7266e1cd-cd16-4f46-ab76-b866ac7278b3	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003		ta de la chance que vous etes tous proteger car je vais tous vous niquer mdr	t	2026-01-24 17:51:35.573493	bc1bdce8-3ec7-436f-9018-103cf2632c30
031b7517-96d3-4440-9e0a-dd67634a9460	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003		toi aussi tu vas rejoindre la'alliance contre  carlito?	t	2026-01-24 17:52:13.531395	bc1bdce8-3ec7-436f-9018-103cf2632c30
ec3d20de-72b2-402b-9324-693599ba96e6	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003		je vais fumer je te sone apres 	t	2026-01-23 17:59:08.693125	bc1bdce8-3ec7-436f-9018-103cf2632c30
94a46613-0b54-4536-b75f-2dc29773bb41	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003	Nouvelle discussion	c'est qui le patron ? hein? c'est BIBI mouhaaaaa	t	2026-01-23 18:51:26.138891	bc1bdce8-3ec7-436f-9018-103cf2632c30
40f50ed0-effb-41d5-9554-d74fdde9fe46	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466		On voit qui est le boss maintenant lol	t	2026-01-26 19:29:22.428769	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
194e948a-218e-4933-8f36-c44c26f32373	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5c07a266-2739-4999-80c4-bcbf67b81466		Mais comment t’as fais pour ta deuxièmes planète ?	t	2026-01-26 19:29:54.670531	5272ff84-be15-4e60-af4d-a4ac4d0a4fba
44a61927-f2cc-4da5-988b-2df9f1378ec5	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		Gna Gna Gna	t	2026-01-24 18:00:08.383338	bc1bdce8-3ec7-436f-9018-103cf2632c30
092a0836-378d-4ff7-892a-6a594527c4ba	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		C'est qui le patron heinnnn	t	2026-01-24 17:34:59.477168	bc1bdce8-3ec7-436f-9018-103cf2632c30
8445dff7-f988-45f7-b7c9-6c3a6805f4f9	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	Nouvelle discussion	Tcheuuuu....\nQu'est ce que tu as évolué pour avoir fait un bon dans le classement comme ça ?	t	2026-01-23 17:49:01.169095	bc1bdce8-3ec7-436f-9018-103cf2632c30
1a376847-47cf-40b9-a2a5-681d9ee9cb02	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		😅	t	2026-01-23 18:59:32.144208	bc1bdce8-3ec7-436f-9018-103cf2632c30
80168096-25e4-457a-bae4-ee331a7ba9ce	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		J'évolue moi...	t	2026-01-24 17:34:47.415019	bc1bdce8-3ec7-436f-9018-103cf2632c30
9eea2806-e21d-4bd9-a42d-ba24e78231fe	079f1020-0115-4e3d-b78c-5f9ec3e98003	6f9f0b38-07bb-475c-ab1e-2681496e1ea1		lolll je fais cavalier seul mwoi...	t	2026-01-24 18:00:01.736715	bc1bdce8-3ec7-436f-9018-103cf2632c30
5bec3dab-2522-443b-917b-08d336a1251d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	079f1020-0115-4e3d-b78c-5f9ec3e98003		alots tu as trouvé mon Glitch pour avancer rapidmeent ? lol	t	2026-01-24 16:40:20.960241	bc1bdce8-3ec7-436f-9018-103cf2632c30
\.


--
-- TOC entry 3943 (class 0 OID 18668)
-- Dependencies: 255
-- Data for Name: officer_template; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.officer_template (id, name, description, specialization, rarity, bonus_type, base_bonus_value, bonus_per_level, max_level, image_type, recruitment_cost_metal, recruitment_cost_crystal, recruitment_cost_deuterium, is_available) FROM stdin;
6d0d8474-de61-4c09-b178-00352daae57e	Ingénieur Minier	Spécialiste de l'extraction minière, augmente la production de métal.	economy	common	metal_production	5	0.5	50	engineer	1000	500	100	t
7c73d9dc-5243-48ee-b8a5-1259931ffc19	Géologue Cristallin	Expert en cristallographie, améliore l'extraction de cristal.	economy	common	crystal_production	5	0.5	50	scientist	500	1000	100	t
f443de37-c77a-4e37-9300-4594565bb491	Chef des Opérations	Gestionnaire efficace, améliore toute la production de ressources.	economy	uncommon	all_production	3	0.3	50	manager	2000	2000	500	t
417fd06a-2c63-4fe1-93a9-75b6b5271260	Ingénieur Énergétique	Optimise la production et consommation d'énergie.	economy	uncommon	energy_efficiency	8	0.8	50	engineer	1500	1500	1000	t
a259e443-4dbe-41f1-8ed0-7a1461818871	Maître Économiste	Réduit les coûts de construction et amélioration.	economy	rare	construction_cost_reduction	10	1	50	economist	5000	5000	2000	t
8521e189-1b79-4e23-abda-94b6bb6f4716	Baron Industriel	Magnat de l'industrie, bonus massif à la production.	economy	epic	all_production	15	1.5	50	noble	10000	10000	5000	t
168c7b7e-bfb2-4184-a4d3-d4b68601b450	Empereur du Commerce	Légende vivante du commerce interstellaire.	economy	legendary	all_production	25	2.5	50	emperor	25000	25000	15000	t
43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	Sergent d'Infanterie	Augmente légèrement la puissance d'attaque de la flotte.	military	common	fleet_attack	5	0.5	50	soldier	1000	500	250	t
78fb3df8-7668-46e4-8fac-8d0dede32211	Capitaine Défensif	Renforce les défenses planétaires.	military	common	defense_power	5	0.5	50	soldier	1000	500	250	t
a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	Tacticien de Flotte	Améliore les capacités de combat spatial.	military	uncommon	fleet_attack	8	0.8	50	tactician	2000	1000	800	t
8272f515-7fdf-4fc9-977c-46c35f62ff7e	Ingénieur de Combat	Augmente la résistance des vaisseaux.	military	uncommon	fleet_defense	8	0.8	50	engineer	1500	1500	500	t
fcbc7e69-d084-4fb9-9a58-44d474d5f341	Commandant d'Escadre	Bonus significatif à l'attaque et à la défense.	military	rare	fleet_power	10	1	50	commander	5000	3000	2000	t
853eb44d-448a-444d-a5ae-b8fb33b8feb3	Amiral de Guerre	Vétéran de mille batailles, puissance militaire accrue.	military	epic	fleet_power	15	1.5	50	admiral	10000	8000	5000	t
3a4c8111-dc57-4572-a8a5-203db202eb98	Grand Stratège	Génie militaire légendaire, maître de la guerre.	military	legendary	fleet_power	25	2.5	50	strategist	25000	20000	15000	t
fb147dcf-6721-4c71-aa09-8f4d5c5510d3	Assistant de Recherche	Accélère légèrement les recherches technologiques.	research	common	research_speed	5	0.5	50	scientist	800	1200	200	t
b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	Chercheur Senior	Scientifique expérimenté, bonus de recherche amélioré.	research	uncommon	research_speed	8	0.8	50	scientist	1500	2500	1000	t
5e5e45c6-24bb-4852-8cfd-fca37a6706e7	Spécialiste Armement	Accélère les recherches en technologies d'armes.	research	uncommon	weapon_research_speed	10	1	50	weaponsmith	2000	2000	800	t
290695c5-2ac2-4a1b-8643-9dfd55023f3e	Professeur de Physique	Expert en physique quantique et propulsion.	research	rare	research_speed	12	1.2	50	professor	4000	6000	2000	t
daedb7c9-433c-4c07-b6f9-09b3e424450b	Savant Fou	Génie excentrique aux découvertes révolutionnaires.	research	epic	research_speed	18	1.8	50	genius	8000	12000	6000	t
88ef4ec3-f586-42ca-a6e4-15567ff42c8b	Archiviste Galactique	Détient les connaissances ancestrales de l'univers.	research	legendary	research_speed	30	3	50	archivist	20000	30000	18000	t
\.


--
-- TOC entry 3944 (class 0 OID 18692)
-- Dependencies: 256
-- Data for Name: planet; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.planet (id, owner_id, name, galaxy, system, "position", metal_mine_level, crystal_mine_level, deuterium_mine_level, metal_amount, crystal_amount, deuterium_amount, last_update, construction_end, construction_type, shipyard_level, light_hunter_count, shipyard_construction_end, research_lab_level, laser_battery_level, energy_tech_level, expedition_end, pending_fleet_count, pending_fleet_type, cruiser_count, recycler_count, unread_report, spy_probe_count, espionage_tech_level, password, missile_launcher_count, plasma_turret_count, debris_metal, debris_crystal, colony_ship_count, transporter_count, solar_plant_level, hangar_level, armour_tech_level, created_at, resource_storage_level, combustion_drive_level, impulse_drive_level, hyperspace_drive_level, ion_tech_level, plasma_tech_level, shield_tech_level, weapons_tech_level, computer_tech_level, astrophysics_level, logistics_tech_level, deuterium_synthesizer_level, heavy_hunter_count, battleship_count, bomber_count, destroyer_count, is_homeworld) FROM stdin;
409170ea-959f-42fa-899a-0792cdb1a872	fbbd65cc-c22b-4e5a-ad27-caa1ccfef603	Centauri V	1	67	6	1	1	1	293651.24999999936	195434.1666666633	93298.12499999948	2026-03-04 23:38:14.781532	\N	\N	1	0	\N	0	0	0	\N	0	\N	0	0	\N	0	0		0	0	0	0	0	0	3	0	0	2026-03-03 12:10:51.798778	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
ed5401d5-0f45-4939-a003-c5cf17aa11e7	6bfe5069-b203-4bd1-b92a-5648543065a3	Broute moules	1	67	15	19	19	19	319647255.4157954	260380039.57953653	50104340.98189894	2026-03-04 14:41:24.326939	\N	\N	14	0	\N	4	0	0	2026-02-23 00:40:14.986111	0	\N	0	0	\N	0	0		0	0	0	0	0	0	23	18	0	2026-01-22 04:20:59.151896	16	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
a1150086-b563-4c44-b97c-2b6dbd35fa2c	e0105e0b-ef87-4ef1-b511-29aa73b054e0	Centauri X	1	61	4	1	1	1	212838.27029270463	83301.2155723255	46370.45922928439	2026-03-02 04:37:47.644926	\N	\N	5	0	\N	0	0	0	\N	0	\N	0	0	\N	0	0		0	0	0	0	0	0	12	5	0	2026-03-01 21:34:54.851907	6	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
c34a3382-e6eb-4f51-8d48-021102098f85	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	Quartier rouge	1	62	2	23	22	22	55626923.04546323	22591472.88279745	39831063.10005897	2026-03-02 21:11:44.780018	\N	\N	14	10	\N	12	0	0	2026-01-26 19:48:59.887179	0	\N	5	0	{"message":"Votre planète a été espionnée !","type":"spy_alert"}	0	0		0	0	0	0	0	0	24	18	0	2026-01-21 14:18:53.458036	15	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
82c16717-d644-43e9-ba12-8350e9dec152	2bfc8dfe-5c21-403a-bd72-079278cc0743	Vega IX	1	22	4	1	1	1	61084110.10804366	94490453.37951176	24895481.0226619	2026-03-04 22:12:51.340033	\N	\N	14	0	\N	0	0	0	2026-03-01 21:25:34.735172	0	\N	0	0	\N	0	0		0	0	0	0	0	0	22	9	0	2026-02-09 13:21:43.28558	14	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
2477366c-9fd2-4d61-abc6-72cce81e5fee	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	Enculator Alpha	1	68	13	21	19	19	168884986.02639383	166708805.38151738	46298239.86823185	2026-03-04 09:00:48.563734	\N	\N	11	10	\N	7	0	0	2026-02-14 23:21:58.627918	0	\N	5	0	\N	0	0		0	0	0	0	0	0	23	18	0	2026-01-21 14:18:53.474911	12	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
f91dc474-2254-4fdc-ba0c-7cdc67e1e527	849ffcd5-711f-4fda-8d73-27654e2274ea	Kronos Gamma	1	27	7	1	1	1	2511.041666666671	1340.6944444444453	662.6041666666678	2026-03-01 21:41:02.412214	\N	\N	1	0	\N	0	0	0	\N	0	\N	0	0	\N	0	0		0	0	0	0	0	0	3	0	0	2026-03-01 21:37:11.55324	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
072a1afe-dd24-4087-9e95-bf753f2cf07f	91944471-91a5-4961-9964-01d20e3e697a	 le ripper (Homeworld)	1	3	8	20	17	15	960000	960000	960000	2026-01-23 23:02:00.420492	\N	\N	1	10	\N	1	0	0	\N	0	\N	5	0	{"message":"Votre planète a été espionnée !","type":"spy_alert"}	0	0		0	0	0	0	0	0	23	0	0	2026-01-21 14:18:53.49091	1	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
5351891c-73d9-4831-a343-b83a4581d0cc	91b8bdd3-38de-40f7-9ea1-523fb5117a46	Vega V	1	85	15	1	1	1	22309.848333855272	54943.90171112598	20861.63663078891	2026-01-29 16:02:06.069102	\N	\N	1	0	\N	0	0	0	\N	0	\N	0	0	{"message":"Votre planète a été espionnée !","type":"spy_alert"}	0	0		0	0	0	0	0	0	7	0	0	2026-01-29 13:55:21.575567	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
e777dba1-794e-46cd-aca8-908ad8948537	e77bdc80-958a-4ea9-8167-18b653d265a1	Terre du Milieu	1	95	5	20	18	19	368770297.79535985	295903432.0520376	97220791.89728318	2026-03-04 21:13:04.937995	\N	\N	10	0	\N	6	0	0	2026-02-25 00:44:43.815799	0	\N	0	0	\N	0	0		0	0	0	0	0	0	24	13	0	2026-01-22 04:20:38.953387	15	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	Orion-63	1	1	7	8	8	7	82953842.27483535	52607631.507249825	9062910.287580129	2026-03-04 23:38:14.027589	\N	\N	16	0	\N	1	0	0	2026-02-27 03:18:10.726294	0	\N	0	0	\N	0	0		0	0	0	0	0	0	26	12	0	2026-01-23 18:00:48.809149	14	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	5c07a266-2739-4999-80c4-bcbf67b81466	Néo Omicron 957 (Homeworld)	1	55	4	17	18	16	65970697.66656007	65970697.66656007	65970697.66656007	2026-03-03 12:24:11.744395	\N	\N	5	3500	\N	10	10	10	2026-01-26 18:39:28.843138	0	\N	2000	150	\N	100	10		100	150	0	0	3	340	17	4	10	2026-01-21 14:18:53.522436	10	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
e8836690-7ec2-430b-bb68-3aa95545adf9	5c673356-eeda-4bef-95bf-c7686f0bf250	Alpha Secundus 219 (Homeworld)	1	26	5	18	19	20	240035246.08463213	254823667.8396552	13806425.401281115	2026-03-04 16:54:57.358475	\N	\N	11	10	\N	6	0	0	2026-02-02 15:19:46.386189	0	\N	5	0	\N	0	0		0	0	0	0	0	0	21	17	0	2026-01-21 14:18:53.506833	13	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
b3d19ba9-9a81-427e-870d-8f8fbbb838c7	5c07a266-2739-4999-80c4-bcbf67b81466	Proxima Omicron 261	1	55	14	1	1	1	998418	1005344	1305600	2026-01-26 17:03:14.699154	\N	\N	0	0	\N	0	0	0	\N	0	\N	0	0	\N	0	0		0	0	0	0	0	0	3	0	0	2026-01-26 16:13:18.718285	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	f
fd5b308c-668c-4f6b-9079-e77ade26fdf8	079f1020-0115-4e3d-b78c-5f9ec3e98003	Spinach XX (Homeworld)	1	9	10	22	21	22	202655308.54326734	112557957.33492842	67786618.73928122	2026-03-04 23:38:44.553193	\N	\N	11	10	\N	10	0	0	2026-01-23 07:18:13.434922	0	\N	5	0	\N	0	0		0	0	0	0	0	0	24	19	0	2026-01-21 14:18:53.442173	14	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
05cd7974-174d-4e91-94d2-3effaba14d09	aa44498d-24ae-46d7-a1af-43c303f1fa8f	Andromeda-388	1	49	12	1	1	1	94478.43181298987	635114.1117776863	651416.4120175905	2026-02-16 03:11:10.58316	\N	\N	4	0	\N	0	0	0	\N	0	\N	0	0	\N	0	0		0	0	0	0	0	0	14	4	0	2026-01-31 15:48:08.393348	8	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	t
\.


--
-- TOC entry 3945 (class 0 OID 18791)
-- Dependencies: 257
-- Data for Name: planet_buildings; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.planet_buildings (planet_id, building_type_id, level, upgrading_to_level, upgrade_end_time, updated_at) FROM stdin;
072a1afe-dd24-4087-9e95-bf753f2cf07f	6	1	\N	\N	2026-01-21 14:18:53.6369
072a1afe-dd24-4087-9e95-bf753f2cf07f	7	1	\N	\N	2026-01-21 14:18:53.6369
072a1afe-dd24-4087-9e95-bf753f2cf07f	1	20	\N	\N	2026-01-21 14:18:53.6369
072a1afe-dd24-4087-9e95-bf753f2cf07f	3	15	\N	\N	2026-01-21 14:18:53.6369
072a1afe-dd24-4087-9e95-bf753f2cf07f	4	23	\N	\N	2026-01-21 14:18:53.6369
e8836690-7ec2-430b-bb68-3aa95545adf9	11	1	\N	\N	2026-01-27 02:36:41.939392
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	13	4	\N	\N	2026-02-26 04:21:45.939419
82c16717-d644-43e9-ba12-8350e9dec152	10	2	\N	\N	2026-02-10 17:24:11.940036
ed5401d5-0f45-4939-a003-c5cf17aa11e7	3	26	\N	\N	2026-01-22 21:43:37.839614
c34a3382-e6eb-4f51-8d48-021102098f85	6	13	\N	\N	2026-01-21 14:18:53.580187
fd5b308c-668c-4f6b-9079-e77ade26fdf8	1	22	\N	\N	2026-01-21 14:18:53.551091
c34a3382-e6eb-4f51-8d48-021102098f85	11	1	\N	\N	2026-01-24 05:06:47.839728
ed5401d5-0f45-4939-a003-c5cf17aa11e7	6	14	\N	\N	2026-01-22 21:54:09.840573
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	8	12	\N	\N	2026-01-23 18:11:03.712964
2477366c-9fd2-4d61-abc6-72cce81e5fee	4	23	\N	\N	2026-01-21 14:18:53.608491
e8836690-7ec2-430b-bb68-3aa95545adf9	3	22	\N	\N	2026-01-21 14:18:53.664915
fd5b308c-668c-4f6b-9079-e77ade26fdf8	13	3	\N	\N	2026-02-06 19:56:27.426534
e8836690-7ec2-430b-bb68-3aa95545adf9	2	22	\N	\N	2026-01-21 14:18:53.664915
fd5b308c-668c-4f6b-9079-e77ade26fdf8	7	11	\N	\N	2026-01-21 14:18:53.551091
c34a3382-e6eb-4f51-8d48-021102098f85	1	23	\N	\N	2026-01-21 14:18:53.580187
c34a3382-e6eb-4f51-8d48-021102098f85	2	22	\N	\N	2026-01-21 14:18:53.580187
e777dba1-794e-46cd-aca8-908ad8948537	9	15	\N	\N	2026-01-22 21:43:09.839761
fd5b308c-668c-4f6b-9079-e77ade26fdf8	9	14	\N	\N	2026-01-22 10:03:53.426772
82c16717-d644-43e9-ba12-8350e9dec152	4	22	\N	\N	2026-02-10 17:20:25.939879
2477366c-9fd2-4d61-abc6-72cce81e5fee	9	12	\N	\N	2026-01-22 03:01:44.848318
e8836690-7ec2-430b-bb68-3aa95545adf9	9	13	\N	\N	2026-01-24 15:03:05.839238
2477366c-9fd2-4d61-abc6-72cce81e5fee	7	11	\N	\N	2026-01-21 14:18:53.608491
fd5b308c-668c-4f6b-9079-e77ade26fdf8	4	24	\N	\N	2026-01-21 14:18:53.551091
c34a3382-e6eb-4f51-8d48-021102098f85	4	24	\N	\N	2026-01-21 14:18:53.580187
ed5401d5-0f45-4939-a003-c5cf17aa11e7	10	3	\N	\N	2026-01-22 22:20:21.839539
fd5b308c-668c-4f6b-9079-e77ade26fdf8	6	11	\N	\N	2026-01-21 14:18:53.551091
82c16717-d644-43e9-ba12-8350e9dec152	7	14	\N	\N	2026-02-10 17:20:53.132899
2477366c-9fd2-4d61-abc6-72cce81e5fee	2	22	\N	\N	2026-01-21 14:18:53.608491
05cd7974-174d-4e91-94d2-3effaba14d09	9	8	\N	\N	2026-02-16 02:11:03.93981
2477366c-9fd2-4d61-abc6-72cce81e5fee	3	22	\N	\N	2026-01-21 14:18:53.608491
e8836690-7ec2-430b-bb68-3aa95545adf9	8	17	\N	\N	2026-01-25 18:00:48.750935
5351891c-73d9-4831-a343-b83a4581d0cc	3	6	\N	\N	2026-01-29 13:57:33.93969
c34a3382-e6eb-4f51-8d48-021102098f85	13	6	\N	\N	2026-01-22 20:14:31.839559
e777dba1-794e-46cd-aca8-908ad8948537	7	10	\N	\N	2026-01-22 22:02:23.839055
2477366c-9fd2-4d61-abc6-72cce81e5fee	11	1	\N	\N	2026-02-15 19:04:09.940212
ed5401d5-0f45-4939-a003-c5cf17aa11e7	13	3	\N	\N	2026-02-03 11:53:11.939376
c34a3382-e6eb-4f51-8d48-021102098f85	7	14	\N	\N	2026-01-21 14:18:53.580187
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	2	19	\N	\N	2026-01-21 14:18:53.693439
05cd7974-174d-4e91-94d2-3effaba14d09	10	2	\N	\N	2026-02-16 02:16:23.94014
82c16717-d644-43e9-ba12-8350e9dec152	6	12	\N	\N	2026-02-10 17:18:57.940354
5351891c-73d9-4831-a343-b83a4581d0cc	2	7	\N	\N	2026-01-29 13:57:31.242779
5351891c-73d9-4831-a343-b83a4581d0cc	4	7	\N	\N	2026-01-29 14:51:05.940116
e8836690-7ec2-430b-bb68-3aa95545adf9	7	11	\N	\N	2026-01-21 14:18:53.664915
5351891c-73d9-4831-a343-b83a4581d0cc	1	8	\N	\N	2026-01-29 13:57:29.939392
e8836690-7ec2-430b-bb68-3aa95545adf9	10	1	\N	\N	2026-02-09 18:28:00.90641
072a1afe-dd24-4087-9e95-bf753f2cf07f	9	1	\N	\N	2026-01-22 07:11:39.840192
e777dba1-794e-46cd-aca8-908ad8948537	10	2	\N	\N	2026-01-22 21:48:45.838649
072a1afe-dd24-4087-9e95-bf753f2cf07f	2	17	\N	\N	2026-01-21 14:18:53.6369
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	10	3	\N	\N	2026-01-23 18:18:01.839142
c34a3382-e6eb-4f51-8d48-021102098f85	3	26	\N	\N	2026-01-21 14:18:53.580187
e777dba1-794e-46cd-aca8-908ad8948537	4	24	\N	\N	2026-01-22 04:25:51.839677
ed5401d5-0f45-4939-a003-c5cf17aa11e7	11	1	\N	\N	2026-02-13 01:18:15.939514
2477366c-9fd2-4d61-abc6-72cce81e5fee	1	21	\N	\N	2026-01-21 14:18:53.608491
e777dba1-794e-46cd-aca8-908ad8948537	6	10	\N	\N	2026-01-22 04:26:29.840003
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	9	14	\N	\N	2026-01-23 18:11:09.7489
c34a3382-e6eb-4f51-8d48-021102098f85	9	15	\N	\N	2026-01-22 15:20:35.929189
fd5b308c-668c-4f6b-9079-e77ade26fdf8	2	21	\N	\N	2026-01-21 14:18:53.551091
2477366c-9fd2-4d61-abc6-72cce81e5fee	10	2	\N	\N	2026-01-23 02:47:45.839283
b3d19ba9-9a81-427e-870d-8f8fbbb838c7	1	1	\N	\N	2026-01-26 16:14:03.840013
b3d19ba9-9a81-427e-870d-8f8fbbb838c7	2	1	\N	\N	2026-01-26 16:14:03.840013
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	4	17	\N	\N	2026-01-21 14:18:53.693439
e8836690-7ec2-430b-bb68-3aa95545adf9	6	7	\N	\N	2026-01-21 14:18:53.664915
fd5b308c-668c-4f6b-9079-e77ade26fdf8	3	22	\N	\N	2026-01-21 14:18:53.551091
e8836690-7ec2-430b-bb68-3aa95545adf9	12	2	\N	\N	2026-01-25 01:12:25.839837
b3d19ba9-9a81-427e-870d-8f8fbbb838c7	3	1	\N	\N	2026-01-26 16:14:05.33991
c34a3382-e6eb-4f51-8d48-021102098f85	12	4	\N	\N	2026-01-22 21:46:59.839698
c34a3382-e6eb-4f51-8d48-021102098f85	8	18	\N	\N	2026-01-22 15:21:49.839837
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	6	11	\N	\N	2026-01-23 18:11:03.710938
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	6	20	\N	\N	2026-01-21 14:18:53.693439
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	7	20	\N	\N	2026-01-21 14:18:53.693439
e777dba1-794e-46cd-aca8-908ad8948537	3	24	\N	\N	2026-01-22 04:25:53.839284
e8836690-7ec2-430b-bb68-3aa95545adf9	4	21	\N	\N	2026-01-21 14:18:53.664915
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	8	25	\N	\N	2026-01-21 19:57:43.846713
e8836690-7ec2-430b-bb68-3aa95545adf9	1	22	\N	\N	2026-01-21 14:18:53.664915
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	9	19	\N	\N	2026-01-21 19:57:07.847451
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	11	18	\N	\N	2026-01-22 02:19:16.844927
ed5401d5-0f45-4939-a003-c5cf17aa11e7	8	18	\N	\N	2026-01-22 22:15:49.840208
e777dba1-794e-46cd-aca8-908ad8948537	11	2	\N	\N	2026-02-02 01:20:15.939577
fd5b308c-668c-4f6b-9079-e77ade26fdf8	10	5	\N	\N	2026-01-22 10:09:59.839216
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	10	1	\N	\N	2026-01-26 18:46:17.49004
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	3	18	\N	\N	2026-01-21 14:18:53.693439
fd5b308c-668c-4f6b-9079-e77ade26fdf8	8	19	\N	\N	2026-01-22 11:19:43.83953
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	1	19	\N	\N	2026-01-21 14:18:53.693439
05cd7974-174d-4e91-94d2-3effaba14d09	2	13	\N	\N	2026-01-31 15:53:13.939669
fd5b308c-668c-4f6b-9079-e77ade26fdf8	12	2	\N	\N	2026-01-25 17:49:51.839704
05cd7974-174d-4e91-94d2-3effaba14d09	1	16	\N	\N	2026-01-31 15:50:24.811132
82c16717-d644-43e9-ba12-8350e9dec152	3	24	\N	\N	2026-02-09 13:23:51.9395
ed5401d5-0f45-4939-a003-c5cf17aa11e7	7	14	\N	\N	2026-01-22 04:22:01.839769
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	11	2	\N	\N	2026-02-24 12:21:55.939545
82c16717-d644-43e9-ba12-8350e9dec152	9	14	\N	\N	2026-02-10 17:18:47.940114
e777dba1-794e-46cd-aca8-908ad8948537	12	5	\N	\N	2026-01-25 02:15:56.881472
82c16717-d644-43e9-ba12-8350e9dec152	8	9	\N	\N	2026-02-25 13:00:27.940297
e8836690-7ec2-430b-bb68-3aa95545adf9	13	3	\N	\N	2026-02-14 23:22:05.894587
fd5b308c-668c-4f6b-9079-e77ade26fdf8	11	1	\N	\N	2026-02-12 08:01:45.939547
c34a3382-e6eb-4f51-8d48-021102098f85	10	7	\N	\N	2026-01-22 18:46:21.839009
82c16717-d644-43e9-ba12-8350e9dec152	13	6	\N	\N	2026-02-14 17:25:01.793871
2477366c-9fd2-4d61-abc6-72cce81e5fee	6	9	\N	\N	2026-01-21 14:18:53.608491
ed5401d5-0f45-4939-a003-c5cf17aa11e7	4	23	\N	\N	2026-01-22 21:42:13.839268
2477366c-9fd2-4d61-abc6-72cce81e5fee	12	3	\N	\N	2026-01-23 10:06:23.839128
ed5401d5-0f45-4939-a003-c5cf17aa11e7	2	26	\N	\N	2026-01-22 21:43:35.734307
2477366c-9fd2-4d61-abc6-72cce81e5fee	8	18	\N	\N	2026-01-22 03:03:48.860884
2477366c-9fd2-4d61-abc6-72cce81e5fee	13	2	\N	\N	2026-02-15 11:57:29.939551
82c16717-d644-43e9-ba12-8350e9dec152	1	24	\N	\N	2026-02-09 13:23:45.940188
e777dba1-794e-46cd-aca8-908ad8948537	1	24	\N	\N	2026-01-22 04:22:19.840039
ed5401d5-0f45-4939-a003-c5cf17aa11e7	12	3	\N	\N	2026-01-24 00:59:05.229483
ed5401d5-0f45-4939-a003-c5cf17aa11e7	1	25	\N	\N	2026-01-22 04:22:59.839192
05cd7974-174d-4e91-94d2-3effaba14d09	4	14	\N	\N	2026-01-31 15:54:14.746393
05cd7974-174d-4e91-94d2-3effaba14d09	6	6	\N	\N	2026-02-16 02:11:10.398965
05cd7974-174d-4e91-94d2-3effaba14d09	8	4	\N	\N	2026-02-16 02:14:25.41793
05cd7974-174d-4e91-94d2-3effaba14d09	3	15	\N	\N	2026-01-31 15:58:17.93963
05cd7974-174d-4e91-94d2-3effaba14d09	7	4	\N	\N	2026-02-16 02:11:49.940231
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	1	22	\N	\N	2026-01-23 18:04:23.839996
ed5401d5-0f45-4939-a003-c5cf17aa11e7	9	16	\N	\N	2026-01-22 04:21:47.55205
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	4	26	\N	\N	2026-01-23 18:11:03.705852
e777dba1-794e-46cd-aca8-908ad8948537	2	24	\N	\N	2026-01-22 04:22:31.839621
82c16717-d644-43e9-ba12-8350e9dec152	11	1	\N	\N	2026-02-25 23:17:07.939641
82c16717-d644-43e9-ba12-8350e9dec152	2	23	\N	\N	2026-02-09 13:23:47.939945
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	12	6	\N	\N	2026-02-24 22:31:35.939873
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	3	22	\N	\N	2026-01-23 18:10:29.628478
82c16717-d644-43e9-ba12-8350e9dec152	12	7	\N	\N	2026-02-15 15:04:31.94024
e777dba1-794e-46cd-aca8-908ad8948537	8	13	\N	\N	2026-01-22 22:04:11.298312
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	7	16	\N	\N	2026-01-23 18:11:03.708425
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	2	21	\N	\N	2026-01-23 18:10:29.628478
a1150086-b563-4c44-b97c-2b6dbd35fa2c	2	10	\N	\N	2026-03-01 21:52:49.512313
a1150086-b563-4c44-b97c-2b6dbd35fa2c	7	5	\N	\N	2026-03-01 22:23:49.939644
a1150086-b563-4c44-b97c-2b6dbd35fa2c	3	12	\N	\N	2026-03-01 21:52:51.940141
a1150086-b563-4c44-b97c-2b6dbd35fa2c	4	12	\N	\N	2026-03-01 21:52:51.940141
a1150086-b563-4c44-b97c-2b6dbd35fa2c	9	6	\N	\N	2026-03-01 21:53:02.979233
a1150086-b563-4c44-b97c-2b6dbd35fa2c	6	6	\N	\N	2026-03-01 22:24:41.940052
a1150086-b563-4c44-b97c-2b6dbd35fa2c	10	1	\N	\N	2026-03-02 03:57:25.93905
a1150086-b563-4c44-b97c-2b6dbd35fa2c	8	5	\N	\N	2026-03-01 23:15:09.939598
a1150086-b563-4c44-b97c-2b6dbd35fa2c	1	13	\N	\N	2026-03-01 21:52:46.026149
\.


--
-- TOC entry 3946 (class 0 OID 18799)
-- Dependencies: 258
-- Data for Name: planet_defenses; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.planet_defenses (planet_id, defense_type_id, count, building_count, build_end_time, updated_at) FROM stdin;
e777dba1-794e-46cd-aca8-908ad8948537	7	2000	\N	\N	2026-01-24 00:20:09.839787
82c16717-d644-43e9-ba12-8350e9dec152	9	151	\N	\N	2026-02-14 15:26:15.84022
2477366c-9fd2-4d61-abc6-72cce81e5fee	6	2000	\N	\N	2026-01-23 23:00:34.640589
a1150086-b563-4c44-b97c-2b6dbd35fa2c	2	4	\N	\N	2026-03-01 23:13:41.21351
e8836690-7ec2-430b-bb68-3aa95545adf9	3	5000	\N	\N	2026-01-24 16:09:52.537465
ed5401d5-0f45-4939-a003-c5cf17aa11e7	7	5000	\N	\N	2026-01-22 23:31:00.23141
ed5401d5-0f45-4939-a003-c5cf17aa11e7	6	2200	\N	\N	2026-01-29 13:46:54.472426
e777dba1-794e-46cd-aca8-908ad8948537	4	5000	\N	\N	2026-01-23 02:36:06.756583
2477366c-9fd2-4d61-abc6-72cce81e5fee	3	2000	\N	\N	2026-01-22 18:18:58.03275
e8836690-7ec2-430b-bb68-3aa95545adf9	9	3000	\N	\N	2026-01-24 15:18:12.032836
2477366c-9fd2-4d61-abc6-72cce81e5fee	10	150	\N	\N	2026-01-23 03:34:00.462825
2477366c-9fd2-4d61-abc6-72cce81e5fee	9	100	\N	\N	2026-01-23 03:26:48.140592
2477366c-9fd2-4d61-abc6-72cce81e5fee	8	2100	\N	\N	2026-01-23 03:26:19.685394
e777dba1-794e-46cd-aca8-908ad8948537	9	2000	\N	\N	2026-01-22 23:23:42.696946
a1150086-b563-4c44-b97c-2b6dbd35fa2c	9	1	\N	\N	2026-03-01 23:13:53.945549
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	9	100	\N	\N	2026-02-27 00:47:45.894388
ed5401d5-0f45-4939-a003-c5cf17aa11e7	10	2	\N	\N	2026-01-22 23:28:15.686891
c34a3382-e6eb-4f51-8d48-021102098f85	10	15	\N	\N	2026-01-22 16:34:32.332835
2477366c-9fd2-4d61-abc6-72cce81e5fee	2	2000	\N	\N	2026-01-22 18:17:23.433221
2477366c-9fd2-4d61-abc6-72cce81e5fee	7	910	\N	\N	2026-01-23 03:25:36.43917
c34a3382-e6eb-4f51-8d48-021102098f85	3	5000	\N	\N	2026-01-23 14:33:46.238406
2477366c-9fd2-4d61-abc6-72cce81e5fee	5	2000	\N	\N	2026-01-22 23:52:37.081522
fd5b308c-668c-4f6b-9079-e77ade26fdf8	10	100	\N	\N	2026-01-23 07:13:49.636335
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	1	3500	\N	\N	2026-01-22 02:08:03.05162
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	6	1954	\N	\N	2026-01-24 00:32:07.842361
82c16717-d644-43e9-ba12-8350e9dec152	6	200	\N	\N	2026-02-20 15:42:41.440269
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	8	20	\N	\N	2026-01-26 18:50:51.634786
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	9	1	\N	\N	2026-01-26 18:50:38.639962
fd5b308c-668c-4f6b-9079-e77ade26fdf8	9	1000	\N	\N	2026-01-23 07:13:20.138131
e777dba1-794e-46cd-aca8-908ad8948537	8	2000	\N	\N	2026-01-24 00:19:35.635217
c34a3382-e6eb-4f51-8d48-021102098f85	7	5000	\N	\N	2026-02-01 13:29:54.567776
e777dba1-794e-46cd-aca8-908ad8948537	10	10	\N	\N	2026-01-24 00:20:18.433336
82c16717-d644-43e9-ba12-8350e9dec152	5	1550	\N	\N	2026-02-17 18:12:41.489926
c34a3382-e6eb-4f51-8d48-021102098f85	9	100	\N	\N	2026-01-24 21:42:33.737586
fd5b308c-668c-4f6b-9079-e77ade26fdf8	1	1000	\N	\N	2026-01-22 09:36:38.807071
fd5b308c-668c-4f6b-9079-e77ade26fdf8	6	2200	\N	\N	2026-01-24 00:01:22.83661
e777dba1-794e-46cd-aca8-908ad8948537	3	2000	\N	\N	2026-01-23 02:35:52.988625
2477366c-9fd2-4d61-abc6-72cce81e5fee	4	2000	\N	\N	2026-01-22 18:31:42.585966
82c16717-d644-43e9-ba12-8350e9dec152	10	80	\N	\N	2026-02-19 20:05:10.92919
e8836690-7ec2-430b-bb68-3aa95545adf9	4	5000	\N	\N	2026-01-24 16:50:45.556772
ed5401d5-0f45-4939-a003-c5cf17aa11e7	4	5020	\N	\N	2026-01-24 21:01:25.68538
fd5b308c-668c-4f6b-9079-e77ade26fdf8	2	1000	\N	\N	2026-01-22 09:49:04.416472
82c16717-d644-43e9-ba12-8350e9dec152	3	2570	\N	\N	2026-02-15 15:29:34.887438
e8836690-7ec2-430b-bb68-3aa95545adf9	10	150	\N	\N	2026-01-24 15:17:37.446884
c34a3382-e6eb-4f51-8d48-021102098f85	4	1000	\N	\N	2026-01-26 13:10:05.338619
fd5b308c-668c-4f6b-9079-e77ade26fdf8	3	1000	\N	\N	2026-01-24 06:06:55.734644
e777dba1-794e-46cd-aca8-908ad8948537	1	6230	\N	\N	2026-01-22 22:07:54.57856
fd5b308c-668c-4f6b-9079-e77ade26fdf8	4	3100	\N	\N	2026-01-22 10:14:25.170289
ed5401d5-0f45-4939-a003-c5cf17aa11e7	1	21599	\N	\N	2026-01-22 23:13:13.434618
e8836690-7ec2-430b-bb68-3aa95545adf9	6	3000	500	2026-03-06 13:27:36.312742	2026-01-24 18:26:48.046861
fd5b308c-668c-4f6b-9079-e77ade26fdf8	8	2000	\N	\N	2026-01-22 10:13:30.143843
e777dba1-794e-46cd-aca8-908ad8948537	2	6001	\N	\N	2026-01-22 23:24:09.843067
82c16717-d644-43e9-ba12-8350e9dec152	7	100	\N	\N	2026-02-15 13:40:29.515809
ed5401d5-0f45-4939-a003-c5cf17aa11e7	2	110	\N	\N	2026-01-23 03:14:00.905157
fd5b308c-668c-4f6b-9079-e77ade26fdf8	7	2000	\N	\N	2026-01-22 10:14:04.239354
2477366c-9fd2-4d61-abc6-72cce81e5fee	1	200	\N	\N	2026-01-22 02:57:32.685553
ed5401d5-0f45-4939-a003-c5cf17aa11e7	8	11000	\N	\N	2026-01-25 00:01:20.72724
c34a3382-e6eb-4f51-8d48-021102098f85	5	1000	\N	\N	2026-01-25 00:06:33.018794
c34a3382-e6eb-4f51-8d48-021102098f85	1	5000	\N	\N	2026-01-24 23:12:31.227561
e8836690-7ec2-430b-bb68-3aa95545adf9	1	5000	\N	\N	2026-01-24 15:16:11.383364
a1150086-b563-4c44-b97c-2b6dbd35fa2c	5	1	\N	\N	2026-03-02 01:29:27.220994
e8836690-7ec2-430b-bb68-3aa95545adf9	7	5000	\N	\N	2026-01-24 16:51:39.233996
ed5401d5-0f45-4939-a003-c5cf17aa11e7	3	130	\N	\N	2026-01-23 21:36:37.237831
c34a3382-e6eb-4f51-8d48-021102098f85	2	5000	\N	\N	2026-01-25 14:19:34.681727
ed5401d5-0f45-4939-a003-c5cf17aa11e7	5	30	\N	\N	2026-01-23 02:58:26.041552
fd5b308c-668c-4f6b-9079-e77ade26fdf8	5	1000	\N	\N	2026-01-22 10:14:18.033802
e8836690-7ec2-430b-bb68-3aa95545adf9	8	5000	\N	\N	2026-01-24 17:15:56.439222
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	10	20	\N	\N	2026-02-28 02:11:57.553894
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	8	500	\N	\N	2026-02-27 00:47:23.112103
e777dba1-794e-46cd-aca8-908ad8948537	5	2000	\N	\N	2026-01-22 23:32:22.839918
a1150086-b563-4c44-b97c-2b6dbd35fa2c	3	1	\N	\N	2026-03-02 02:38:50.218513
ed5401d5-0f45-4939-a003-c5cf17aa11e7	9	113	\N	\N	2026-01-22 23:13:44.140961
e8836690-7ec2-430b-bb68-3aa95545adf9	2	5000	\N	\N	2026-01-24 15:14:07.145728
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	1	200	\N	\N	2026-01-23 18:11:03.752624
e777dba1-794e-46cd-aca8-908ad8948537	6	2000	4000	2026-03-19 15:48:12.221217	2026-01-24 21:13:47.426279
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	2	100	\N	\N	2026-02-26 23:38:26.725431
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	6	70	\N	\N	2026-01-23 18:11:03.831236
a1150086-b563-4c44-b97c-2b6dbd35fa2c	7	1	\N	\N	2026-03-02 02:57:53.216612
e8836690-7ec2-430b-bb68-3aa95545adf9	5	5000	\N	\N	2026-01-24 17:13:17.580274
82c16717-d644-43e9-ba12-8350e9dec152	4	350	\N	\N	2026-02-16 14:27:14.085776
c34a3382-e6eb-4f51-8d48-021102098f85	8	5000	\N	\N	2026-01-22 16:33:30.61752
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	3	100	\N	\N	2026-02-27 00:14:30.51705
c34a3382-e6eb-4f51-8d48-021102098f85	6	100	900	2026-03-05 20:58:27.018019	2026-01-25 16:01:02.636199
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	5	100	\N	\N	2026-02-27 00:46:36.827216
a1150086-b563-4c44-b97c-2b6dbd35fa2c	1	6	\N	\N	2026-03-01 23:13:34.312504
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	4	100	\N	\N	2026-02-27 00:19:55.726324
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	7	1000	\N	\N	2026-02-27 00:47:02.624075
82c16717-d644-43e9-ba12-8350e9dec152	1	1000	\N	\N	2026-02-14 15:26:05.244514
82c16717-d644-43e9-ba12-8350e9dec152	8	450	\N	\N	2026-02-15 14:22:21.863046
82c16717-d644-43e9-ba12-8350e9dec152	2	1000	10000	2026-03-05 15:49:19.82477	2026-02-24 01:10:06.813357
\.


--
-- TOC entry 3947 (class 0 OID 18807)
-- Dependencies: 259
-- Data for Name: planet_ships; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.planet_ships (planet_id, ship_type_id, count, updated_at, building_count, build_end_time) FROM stdin;
c34a3382-e6eb-4f51-8d48-021102098f85	7	5	2026-01-23 19:17:09.550843	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	3	250	2026-01-23 18:11:03.737646	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	9	10	2026-01-23 02:45:31.261425	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	8	5	2026-01-25 18:31:38.706874	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	1	47	2026-02-03 00:34:14.685013	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	1	1000	2026-01-24 18:06:22.143059	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	5	1700	2026-01-23 09:03:45.821009	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	2	1000	2026-01-24 16:10:27.713548	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	9	5	2026-01-25 18:31:45.619829	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	3	1500	2026-01-22 10:11:00.732487	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	10	6	2026-01-22 13:34:20.485944	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	4	29	2026-01-22 15:42:55.602655	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	5	1000	2026-01-25 18:20:57.834321	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	8	5	2026-01-22 15:11:15.49176	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	11	10	2026-01-23 02:28:00.62911	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	1	1000	2026-01-23 18:11:03.73419	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	10	5	2026-01-25 18:32:16.64344	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	8	26	2026-01-22 11:25:34.034903	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	6	129	2026-01-23 17:46:01.333514	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	6	29	2026-01-24 00:56:34.042261	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	6	0	2026-01-22 15:43:00.911042	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	9	0	2026-01-22 23:05:55.310575	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	2	0	2026-01-22 22:14:47.343526	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	5	29	2026-01-23 23:02:41.387712	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	2	0	2026-01-26 23:48:34.268493	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	4	1000	2026-01-24 20:14:44.232095	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	1	1000	2026-01-22 22:09:32.456307	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	11	519	2026-01-23 09:34:14.643966	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	5	300	2026-02-25 22:54:49.233004	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	3	0	2026-02-14 15:44:24.183357	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	9	6	2026-01-22 13:50:05.067986	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	2	2516	2026-01-22 10:10:07.461622	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	10	2	2026-01-24 02:42:32.241491	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	1	866	2026-01-22 10:09:41.627863	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	5	20	2026-02-25 23:43:09.433925	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	10	9	2026-01-22 08:20:00.597	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	9	6	2026-01-23 02:35:02.761265	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	10	5	2026-02-23 23:08:25.622	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	6	0	2026-02-20 17:53:46.488317	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	8	7	2026-01-22 22:21:19.484541	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	7	40	2026-01-24 20:55:29.739783	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	1	4500	2026-01-22 02:53:07.153216	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	7	14	2026-01-24 20:55:29.739783	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	7	0	2026-02-26 01:13:26.318022	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	2	0	2026-02-26 23:30:55.903751	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	6	312	2026-01-23 02:27:34.234136	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	4	1500	2026-01-22 21:41:19.613886	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	4	0	2026-02-15 16:07:52.683339	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	11	100	2026-01-24 00:32:07.747031	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	2	501	2026-01-22 02:55:23.054925	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	9	50	2026-01-23 18:11:03.752535	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	10	503	2026-01-24 00:32:07.755008	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	7	5	2026-02-25 02:26:21.515658	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	10	0	2026-02-07 07:50:38.924005	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	11	1	2026-01-24 20:39:56.338429	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	8	10	2026-01-23 00:47:09.146849	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	3	503	2026-01-24 00:32:07.742866	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	1	941	2026-01-22 03:04:24.948877	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	4	2000	2026-01-22 10:25:11.371373	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	3	1000	2026-01-25 18:02:44.542677	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	11	50	2026-01-23 18:11:03.74185	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	6	10	2026-02-07 07:54:49.277648	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	8	95	2026-01-22 23:05:47.60466	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	8	5	2026-02-14 18:12:50.58297	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	8	6	2026-01-22 13:49:58.669035	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	2	1100	2026-01-22 22:20:23.659163	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	1	500	2026-02-26 00:40:50.91658	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	7	30	2026-01-26 06:45:39.12752	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	11	0	2026-01-24 02:46:54.970979	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	3	1186	2026-01-22 07:01:58.045554	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	4	540	2026-01-24 00:32:07.747031	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	5	540	2026-01-24 00:32:07.747031	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	6	450	2026-01-24 00:32:07.747031	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	9	3560	2026-01-22 11:25:26.337757	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	2	627	2026-01-22 03:20:30.044246	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	6	1000	2026-01-24 20:05:00.635103	1000	2026-03-08 07:31:44.919112
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	10	50	2026-01-23 18:11:03.748952	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	4	102	2026-01-23 23:46:51.532432	858	2026-03-06 14:00:35.336849
ed5401d5-0f45-4939-a003-c5cf17aa11e7	7	0	2026-01-25 00:48:04.922998	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	11	4	2026-01-22 03:55:10.377364	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	2	100	2026-01-23 20:29:07.214851	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	4	20	2026-02-25 22:37:18.219637	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	6	20	2026-02-25 23:52:09.921514	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	3	100	2026-01-22 23:21:23.079509	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	5	1255	2026-01-23 02:02:40.986257	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	8	8	2026-01-23 18:11:03.745478	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	5	900	2026-01-24 02:06:43.547886	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	7	10	2026-01-23 15:41:24.244887	20	2026-03-10 12:53:31.816616
e777dba1-794e-46cd-aca8-908ad8948537	10	0	2026-01-23 02:56:12.938494	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	7	180	2026-01-23 14:38:11.679098	20	2026-03-07 23:07:31.718775
e777dba1-794e-46cd-aca8-908ad8948537	5	861	2026-01-24 02:03:46.891246	1000	2026-03-09 05:04:44.318226
e777dba1-794e-46cd-aca8-908ad8948537	3	861	2026-01-23 00:14:58.533174	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	4	2870	2026-01-23 22:44:22.836221	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	1	199	2026-01-22 22:14:44.591516	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	3	29	2026-01-28 21:33:17.763533	\N	\N
\.


--
-- TOC entry 3948 (class 0 OID 18816)
-- Dependencies: 260
-- Data for Name: planet_technologies; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.planet_technologies (planet_id, tech_id, current_level, updated_at, researching_to_level, research_end_time) FROM stdin;
05cd7974-174d-4e91-94d2-3effaba14d09	1	1	2026-01-31 15:52:35.943697	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	2	20	2026-01-22 02:51:51.685823	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	6	12	2026-01-22 22:09:15.845024	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	1	19	2026-01-22 02:51:30.850499	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	2	19	2026-01-22 08:13:05.853481	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	4	19	2026-01-26 18:43:53.943181	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	15	7	2026-01-22 14:31:01.847187	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	3	6	2026-01-24 16:24:57.845426	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	13	17	2026-01-26 18:43:49.942684	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	5	10	2026-01-22 08:20:29.847872	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	3	19	2026-01-26 18:31:37.943567	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	3	10	2026-01-22 08:40:51.846292	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	12	12	2026-01-22 08:23:09.847304	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	10	17	2026-01-22 22:14:35.84446	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	12	5	2026-01-23 03:47:51.843969	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	13	12	2026-01-22 22:59:11.84236	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	2	18	2026-01-22 03:02:40.853491	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	11	12	2026-01-22 22:10:25.844652	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	2	19	2026-01-22 13:14:55.84601	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	4	15	2026-01-22 14:18:21.845811	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	10	17	2026-01-22 08:15:41.848234	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	15	6	2026-01-23 02:20:39.846849	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	1	15	2026-01-22 13:14:47.846822	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	2	11	2026-01-23 18:11:03.721045	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	4	9	2026-01-22 21:18:13.84459	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	15	6	2026-01-24 18:39:41.84559	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	9	10	2026-01-23 02:02:41.14473	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	1	12	2026-01-22 22:10:37.754069	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	11	11	2026-01-22 03:02:58.331441	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	2	21	2026-01-24 15:04:31.845841	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	11	16	2026-01-22 13:15:53.332499	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	2	12	2026-01-22 22:10:32.839489	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	5	20	2026-01-24 00:32:55.847066	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	11	10	2026-01-24 16:25:25.645613	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	9	12	2026-01-22 06:12:03.846125	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	7	10	2026-01-23 18:14:37.845349	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	8	9	2026-02-10 17:20:01.942215	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	12	9	2026-02-14 20:09:49.942416	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	6	17	2026-01-22 13:23:53.846988	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	5	10	2026-01-23 20:27:09.845406	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	6	19	2026-01-22 02:51:48.852565	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	2	9	2026-02-10 17:22:39.439687	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	6	16	2026-01-22 03:02:44.932519	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	9	7	2026-01-23 01:58:05.848774	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	9	10	2026-01-22 14:28:59.846719	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	5	13	2026-01-24 16:48:30.699135	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	10	13	2026-01-22 03:13:58.851963	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	6	10	2026-01-23 18:11:03.723647	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	7	15	2026-01-22 13:14:53.042865	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	4	9	2026-02-14 20:10:35.944153	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	4	10	2026-01-23 04:36:59.845821	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	14	9	2026-02-14 20:02:09.943007	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	3	15	2026-01-22 13:49:39.846781	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	1	12	2026-01-24 15:08:37.846498	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	13	15	2026-01-22 23:03:19.798211	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	7	19	2026-01-22 02:51:26.671525	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	9	10	2026-01-22 08:56:21.856432	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	7	9	2026-02-10 17:22:43.941522	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	13	12	2026-01-22 03:16:45.964794	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	1	12	2026-01-22 04:26:53.845426	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	8	18	2026-01-22 02:52:32.851517	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	7	12	2026-01-22 08:14:21.846762	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	2	12	2026-01-22 22:10:53.843892	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	14	7	2026-01-23 00:37:31.053167	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	13	18	2026-01-22 14:31:13.933485	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	13	15	2026-01-22 08:31:12.733893	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	10	10	2026-01-22 22:12:03.844708	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	14	10	2026-01-22 14:18:07.846824	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	8	10	2026-01-22 22:12:19.844606	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	7	12	2026-01-22 22:08:59.845312	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	3	12	2026-01-22 23:00:19.842557	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	3	10	2026-01-22 22:58:39.843222	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	7	12	2026-01-22 03:02:54.851562	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	12	1	2026-01-23 02:55:23.935253	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	9	7	2026-01-24 18:30:43.84637	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	14	11	2026-01-22 04:10:45.845992	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	11	10	2026-01-22 22:09:17.844219	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	14	6	2026-01-24 17:51:51.845986	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	10	12	2026-01-23 18:11:03.726424	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	5	12	2026-01-22 22:51:53.843715	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	4	9	2026-01-24 17:11:19.732113	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	8	11	2026-01-22 08:14:47.745309	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	8	7	2026-01-24 15:11:25.845722	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	11	12	2026-01-23 18:14:41.845667	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	5	11	2026-02-10 18:33:13.943104	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	5	15	2026-01-22 13:48:51.846152	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	13	15	2026-01-24 16:48:43.037368	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	3	10	2026-01-22 03:26:20.852376	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	1	13	2026-01-22 08:13:05.847779	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	11	12	2026-01-22 08:14:21.852317	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	12	11	2026-01-22 14:18:58.842196	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	1	12	2026-01-22 03:02:02.853031	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	10	6	2026-01-24 16:31:01.84509	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	5	10	2026-01-22 03:14:22.851153	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	14	6	2026-01-22 23:40:15.932826	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	9	20	2026-01-26 15:35:07.846104	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	7	6	2026-01-24 15:04:25.846369	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	15	10	2026-01-22 06:12:33.84556	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	14	12	2026-01-22 08:42:45.847805	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	4	11	2026-01-24 03:29:27.844288	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	4	11	2026-01-22 15:23:01.507967	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	6	16	2026-01-22 22:09:23.844931	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	8	10	2026-01-23 19:39:23.847395	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	14	3	2026-03-02 01:51:57.016045	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	10	18	2026-01-22 11:24:03.847834	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	11	19	2026-01-22 11:23:19.848499	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	12	19	2026-01-24 00:34:49.659161	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	14	21	2026-01-26 15:08:25.845961	\N	\N
a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	15	20	2026-01-26 15:56:45.845408	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	15	8	2026-01-22 09:25:17.476951	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	10	18	2026-01-22 13:17:37.850765	\N	\N
e8836690-7ec2-430b-bb68-3aa95545adf9	6	18	2026-01-24 15:04:14.802207	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	5	10	2026-01-22 22:57:45.847534	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	8	11	2026-01-22 03:14:10.85122	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	11	11	2026-02-14 13:37:58.192355	\N	\N
ed5401d5-0f45-4939-a003-c5cf17aa11e7	8	11	2026-01-22 22:15:01.844812	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	7	8	2026-01-22 22:09:21.84428	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	1	13	2026-02-10 17:19:03.943531	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	1	12	2026-01-23 18:11:03.718375	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	10	9	2026-02-14 17:59:03.942812	\N	\N
2477366c-9fd2-4d61-abc6-72cce81e5fee	12	11	2026-01-22 04:08:45.845769	\N	\N
e777dba1-794e-46cd-aca8-908ad8948537	15	9	2026-01-23 03:54:09.84484	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	3	9	2026-02-14 15:27:19.942438	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	13	10	2026-02-14 20:08:31.271947	\N	\N
c34a3382-e6eb-4f51-8d48-021102098f85	8	15	2026-01-22 13:18:03.050281	\N	\N
fd5b308c-668c-4f6b-9079-e77ade26fdf8	6	17	2026-01-22 08:13:07.656828	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	11	5	2026-03-01 22:07:33.941209	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	2	7	2026-03-01 21:58:51.943066	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	13	4	2026-03-02 00:15:11.942194	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	3	4	2026-03-02 00:13:15.11682	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	15	8	2026-02-17 17:08:57.943523	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	5	5	2026-03-01 23:18:11.942788	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	8	3	2026-03-01 23:04:11.958879	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	7	5	2026-03-01 22:01:30.016387	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	1	6	2026-03-01 21:53:11.942135	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	10	5	2026-03-01 22:15:50.013727	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	6	3	2026-03-01 23:15:17.942417	\N	\N
a1150086-b563-4c44-b97c-2b6dbd35fa2c	12	2	2026-03-02 01:30:11.921173	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	3	11	2026-01-23 20:27:09.580119	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	4	9	2026-02-24 04:01:07.881747	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	12	9	2026-02-24 04:06:01.805816	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	14	10	2026-02-24 04:02:49.94068	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	13	11	2026-02-23 22:39:03.98985	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	9	7	2026-02-24 04:13:19.940888	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	9	9	2026-02-15 13:37:11.941717	\N	\N
89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	15	6	2026-02-24 23:51:54.01613	\N	\N
82c16717-d644-43e9-ba12-8350e9dec152	6	10	2026-02-10 17:23:49.446875	\N	\N
\.


--
-- TOC entry 3949 (class 0 OID 18825)
-- Dependencies: 261
-- Data for Name: rapid_fire_rules; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.rapid_fire_rules (id, attacker_ship_type_id, target_ship_type_id, rapid_fire_value) FROM stdin;
\.


--
-- TOC entry 3951 (class 0 OID 18834)
-- Dependencies: 263
-- Data for Name: resource_slots; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.resource_slots (id, planet_id, slot_number, resource_type, level, is_locked, is_active) FROM stdin;
1	2477366c-9fd2-4d61-abc6-72cce81e5fee	1	metal	1	t	t
2	2477366c-9fd2-4d61-abc6-72cce81e5fee	2	crystal	1	t	t
3	2477366c-9fd2-4d61-abc6-72cce81e5fee	3	deuterium	1	t	t
4	2477366c-9fd2-4d61-abc6-72cce81e5fee	4	energy	0	t	t
9	e777dba1-794e-46cd-aca8-908ad8948537	1	metal	1	t	t
10	e777dba1-794e-46cd-aca8-908ad8948537	2	crystal	1	t	t
11	e777dba1-794e-46cd-aca8-908ad8948537	3	deuterium	1	t	t
12	e777dba1-794e-46cd-aca8-908ad8948537	4	energy	1	t	t
17	ed5401d5-0f45-4939-a003-c5cf17aa11e7	1	metal	1	t	t
18	ed5401d5-0f45-4939-a003-c5cf17aa11e7	2	crystal	1	t	t
19	ed5401d5-0f45-4939-a003-c5cf17aa11e7	3	deuterium	1	t	t
20	ed5401d5-0f45-4939-a003-c5cf17aa11e7	4	energy	1	t	t
25	072a1afe-dd24-4087-9e95-bf753f2cf07f	1	metal	1	t	t
26	072a1afe-dd24-4087-9e95-bf753f2cf07f	2	crystal	1	t	t
27	072a1afe-dd24-4087-9e95-bf753f2cf07f	3	deuterium	1	t	t
28	072a1afe-dd24-4087-9e95-bf753f2cf07f	4	energy	0	t	t
29	072a1afe-dd24-4087-9e95-bf753f2cf07f	5	metal	0	f	f
30	072a1afe-dd24-4087-9e95-bf753f2cf07f	6	metal	0	f	f
31	072a1afe-dd24-4087-9e95-bf753f2cf07f	7	metal	0	f	f
32	072a1afe-dd24-4087-9e95-bf753f2cf07f	8	metal	0	f	f
33	fd5b308c-668c-4f6b-9079-e77ade26fdf8	1	metal	1	t	t
34	fd5b308c-668c-4f6b-9079-e77ade26fdf8	2	crystal	1	t	t
35	fd5b308c-668c-4f6b-9079-e77ade26fdf8	3	deuterium	1	t	t
36	fd5b308c-668c-4f6b-9079-e77ade26fdf8	4	energy	0	t	t
64	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	8	deuterium	0	f	t
62	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	6	deuterium	0	f	t
104	82c16717-d644-43e9-ba12-8350e9dec152	8	deuterium	0	f	t
71	e8836690-7ec2-430b-bb68-3aa95545adf9	7	deuterium	0	f	t
38	fd5b308c-668c-4f6b-9079-e77ade26fdf8	6	deuterium	0	f	t
16	e777dba1-794e-46cd-aca8-908ad8948537	8	deuterium	0	f	t
70	e8836690-7ec2-430b-bb68-3aa95545adf9	6	deuterium	0	f	t
81	5351891c-73d9-4831-a343-b83a4581d0cc	1	metal	1	t	t
82	5351891c-73d9-4831-a343-b83a4581d0cc	2	crystal	1	t	t
83	5351891c-73d9-4831-a343-b83a4581d0cc	3	deuterium	1	t	t
84	5351891c-73d9-4831-a343-b83a4581d0cc	4	energy	1	t	t
41	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	1	metal	1	t	t
42	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	2	crystal	1	t	t
43	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	3	deuterium	1	t	t
44	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	4	energy	0	t	t
45	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	5	metal	0	f	t
46	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	6	metal	0	f	t
6	2477366c-9fd2-4d61-abc6-72cce81e5fee	6	crystal	0	f	t
47	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	7	crystal	0	f	t
87	5351891c-73d9-4831-a343-b83a4581d0cc	7	metal	0	f	f
88	5351891c-73d9-4831-a343-b83a4581d0cc	8	metal	0	f	f
56	c34a3382-e6eb-4f51-8d48-021102098f85	8	deuterium	0	f	t
103	82c16717-d644-43e9-ba12-8350e9dec152	7	deuterium	0	f	t
23	ed5401d5-0f45-4939-a003-c5cf17aa11e7	7	metal	0	f	t
97	82c16717-d644-43e9-ba12-8350e9dec152	1	metal	1	t	t
73	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	1	metal	1	t	t
39	fd5b308c-668c-4f6b-9079-e77ade26fdf8	7	deuterium	0	f	t
98	82c16717-d644-43e9-ba12-8350e9dec152	2	crystal	1	t	t
40	fd5b308c-668c-4f6b-9079-e77ade26fdf8	8	deuterium	0	f	t
85	5351891c-73d9-4831-a343-b83a4581d0cc	5	metal	0	f	f
74	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	2	crystal	1	t	t
86	5351891c-73d9-4831-a343-b83a4581d0cc	6	metal	0	f	f
49	c34a3382-e6eb-4f51-8d48-021102098f85	1	metal	1	t	t
50	c34a3382-e6eb-4f51-8d48-021102098f85	2	crystal	1	t	t
51	c34a3382-e6eb-4f51-8d48-021102098f85	3	deuterium	1	t	t
52	c34a3382-e6eb-4f51-8d48-021102098f85	4	energy	0	t	t
24	ed5401d5-0f45-4939-a003-c5cf17aa11e7	8	deuterium	0	f	t
37	fd5b308c-668c-4f6b-9079-e77ade26fdf8	5	deuterium	0	f	t
75	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	3	deuterium	1	t	t
76	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	4	energy	0	t	t
77	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	5	metal	0	f	f
99	82c16717-d644-43e9-ba12-8350e9dec152	3	deuterium	1	t	t
5	2477366c-9fd2-4d61-abc6-72cce81e5fee	5	metal	0	f	t
78	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	6	metal	0	f	f
79	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	7	metal	0	f	f
57	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	1	metal	1	t	t
58	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	2	crystal	1	t	t
48	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	8	deuterium	0	f	t
59	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	3	deuterium	1	t	t
55	c34a3382-e6eb-4f51-8d48-021102098f85	7	deuterium	0	f	t
60	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	4	energy	1	t	t
80	b3d19ba9-9a81-427e-870d-8f8fbbb838c7	8	metal	0	f	f
8	2477366c-9fd2-4d61-abc6-72cce81e5fee	8	deuterium	0	f	t
53	c34a3382-e6eb-4f51-8d48-021102098f85	5	deuterium	0	f	t
15	e777dba1-794e-46cd-aca8-908ad8948537	7	deuterium	0	f	t
65	e8836690-7ec2-430b-bb68-3aa95545adf9	1	metal	1	t	t
66	e8836690-7ec2-430b-bb68-3aa95545adf9	2	crystal	1	t	t
67	e8836690-7ec2-430b-bb68-3aa95545adf9	3	deuterium	1	t	t
68	e8836690-7ec2-430b-bb68-3aa95545adf9	4	energy	0	t	t
7	2477366c-9fd2-4d61-abc6-72cce81e5fee	7	deuterium	0	f	t
72	e8836690-7ec2-430b-bb68-3aa95545adf9	8	crystal	0	f	t
22	ed5401d5-0f45-4939-a003-c5cf17aa11e7	6	crystal	0	f	t
54	c34a3382-e6eb-4f51-8d48-021102098f85	6	deuterium	0	f	t
13	e777dba1-794e-46cd-aca8-908ad8948537	5	deuterium	0	f	t
61	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	5	deuterium	0	f	t
14	e777dba1-794e-46cd-aca8-908ad8948537	6	deuterium	0	f	t
105	a1150086-b563-4c44-b97c-2b6dbd35fa2c	1	metal	1	t	t
89	05cd7974-174d-4e91-94d2-3effaba14d09	1	metal	1	t	t
90	05cd7974-174d-4e91-94d2-3effaba14d09	2	crystal	1	t	t
91	05cd7974-174d-4e91-94d2-3effaba14d09	3	deuterium	1	t	t
100	82c16717-d644-43e9-ba12-8350e9dec152	4	energy	1	t	t
92	05cd7974-174d-4e91-94d2-3effaba14d09	4	energy	1	t	t
93	05cd7974-174d-4e91-94d2-3effaba14d09	5	metal	0	f	f
94	05cd7974-174d-4e91-94d2-3effaba14d09	6	metal	0	f	f
95	05cd7974-174d-4e91-94d2-3effaba14d09	7	metal	0	f	f
96	05cd7974-174d-4e91-94d2-3effaba14d09	8	metal	0	f	f
101	82c16717-d644-43e9-ba12-8350e9dec152	5	deuterium	0	f	t
102	82c16717-d644-43e9-ba12-8350e9dec152	6	deuterium	0	f	t
63	89fd6f5b-a7de-4d92-bb9c-5389dccbf57f	7	deuterium	0	f	t
69	e8836690-7ec2-430b-bb68-3aa95545adf9	5	deuterium	0	f	t
106	a1150086-b563-4c44-b97c-2b6dbd35fa2c	2	crystal	1	t	t
107	a1150086-b563-4c44-b97c-2b6dbd35fa2c	3	deuterium	1	t	t
108	a1150086-b563-4c44-b97c-2b6dbd35fa2c	4	energy	1	t	t
113	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	1	metal	1	t	t
110	a1150086-b563-4c44-b97c-2b6dbd35fa2c	6	crystal	0	f	f
111	a1150086-b563-4c44-b97c-2b6dbd35fa2c	7	deuterium	0	f	f
21	ed5401d5-0f45-4939-a003-c5cf17aa11e7	5	metal	0	f	t
114	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	2	crystal	1	t	t
115	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	3	deuterium	1	t	t
116	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	4	energy	1	t	t
117	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	5	metal	0	f	f
118	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	6	metal	0	f	f
119	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	7	metal	0	f	f
120	f91dc474-2254-4fdc-ba0c-7cdc67e1e527	8	metal	0	f	f
109	a1150086-b563-4c44-b97c-2b6dbd35fa2c	5	metal	0	f	f
112	a1150086-b563-4c44-b97c-2b6dbd35fa2c	8	deuterium	0	f	f
121	409170ea-959f-42fa-899a-0792cdb1a872	1	metal	1	t	t
122	409170ea-959f-42fa-899a-0792cdb1a872	2	crystal	1	t	t
123	409170ea-959f-42fa-899a-0792cdb1a872	3	deuterium	1	t	t
124	409170ea-959f-42fa-899a-0792cdb1a872	4	energy	1	t	t
125	409170ea-959f-42fa-899a-0792cdb1a872	5	metal	0	f	f
126	409170ea-959f-42fa-899a-0792cdb1a872	6	metal	0	f	f
127	409170ea-959f-42fa-899a-0792cdb1a872	7	metal	0	f	f
128	409170ea-959f-42fa-899a-0792cdb1a872	8	metal	0	f	f
\.


--
-- TOC entry 3953 (class 0 OID 18850)
-- Dependencies: 265
-- Data for Name: sabotage_effect; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.sabotage_effect (id, target_planet_id, attacker_user_id, effect_type, created_at, expires_at, was_detected, metadata) FROM stdin;
\.


--
-- TOC entry 3954 (class 0 OID 18863)
-- Dependencies: 266
-- Data for Name: seaql_migrations; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.seaql_migrations (version, applied_at) FROM stdin;
m20220101_000001_create_table	1769005133
m20260109_001344_add_construction_time	1769005133
m20260109_002654_add_other_resources	1769005133
m20260109_003719_add_construction_type	1769005133
m20260109_005503_add_fleet_and_shipyard	1769005133
m20260109_013834_update_planet_table	1769005133
m20260109_014709_create_user_table	1769005133
m20260109_023850_add_ships_and_pending_system	1769005133
m20260109_195343_add_unread_report	1769005133
m20260109_200503_create_combat_log	1769005133
m20260109_202322_add_espionage	1769005133
m20260109_210008_add_password	1769005133
m20260109_211546_add_defenses	1769005133
m20260109_220528_add_debris	1769005133
m20260109_222210_add_coordinates	1769005133
m20260111_210917_add_colony_ship	1769005133
m20260111_213610_add_transporter	1769005133
m20260111_222219_create_fleet_mission	1769005133
m20260111_223746_create_transport_log	1769005133
m20260112_004006_create_message_table	1769005133
m20260112_032740_add_solar_plant	1769005133
m20260112_054113_add_hangar_level	1769005133
m20260112_060815_create_construction_queue	1769005133
m20260112_072815_add_usernames_to_logs	1769005133
m20260112_152510_add_armour_tech	1769005133
m20260118_000001_create_conversation_system	1769005133
m20260118_000002_add_conversation_archived	1769005133
m20260118_000003_add_created_at_to_users	1769005133
m20260118_200000_create_market_system	1769005133
m20260119_000001_add_created_at_to_planets	1769005133
m20260119_000002_add_detailed_report_to_combat_log	1769005133
m20260119_000003_create_server_config	1769005133
m20260119_000004_create_resource_slots	1769005133
m20260119_100000_add_role_to_users	1769005133
m20260119_200000_create_alliance_system	1769005133
m20260119_300000_create_missions_achievements	1769005133
m20260119_400000_create_officers_system	1769005133
m20260119_400001_seed_officers	1769005133
m20260120_000001_add_resource_storage	1769005133
m20260120_000002_create_sabotage_system	1769005133
m20260120_000003_create_casus_belli	1769005133
m20260120_000004_populate_server_config	1769005133
m20260120_000005_add_game_mechanics_config	1769005133
m20260120_000006_create_announcements	1769005133
m20260125_000001_expansion_update	1769005133
m20260125_000002_expansion_config	1769005133
m20260125_100001_create_tech_tree_system	1769005133
m20260125_100002_seed_tech_tree_data	1769005133
m20260125_100003_migrate_planet_data	1769005133
m20260125_100004_add_research_tracking_columns	1769005133
m20260125_100005_add_build_time_columns	1769005133
m20260125_100006_add_ship_building_columns	1769005133
m20260125_200001_create_complete_expansion_system	1769005133
m20260125_200002_seed_complete_expansion_data	1769005133
m20260125_200003_fix_missing_time_columns	1769005133
m20260126_000001_add_fleet_data_column	1769005133
m20260121_000001_add_flight_speed_config	1769005133
m20260121_000002_add_homeworld_system	1769005133
m20260121_000003_add_maintenance_system	1769005133
m20260127_000001_create_beginner_protection	1769047038
m20260127_000002_fix_graviton_costs	1769451301
m20260128_000001_create_global_chat	1769451301
\.


--
-- TOC entry 3955 (class 0 OID 18870)
-- Dependencies: 267
-- Data for Name: server_config; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.server_config (id, config_key, config_value, updated_at) FROM stdin;
75	combat_rf_plasma_vs_cruiser	3	2026-01-22 01:59:48.62312
105	storage_capacity_base	600000	2026-01-22 01:59:48.62312
61	combat_light_hunter_shield	10	2026-01-22 01:59:48.62312
18	ship_spy_probe_metal	1000.0	2026-01-22 01:59:48.62312
64	combat_cruiser_shield	50	2026-01-22 01:59:48.62312
86	expedition_max_rounds	6	2026-01-22 01:59:48.62312
101	expedition_pirate_loot_multiplier	10	2026-01-22 01:59:48.62312
63	combat_cruiser_attack	400	2026-01-22 01:59:48.62312
33	defense_plasma_turret_crystal	50000.0	2026-01-22 01:59:48.62312
55	energy_deuterium_extra_consumption	20.0	2026-01-22 01:59:48.62312
67	combat_missile_launcher_shield	20	2026-01-22 01:59:48.62312
138	cost_destroyer_crystal	50000	2026-01-22 01:59:48.62312
99	expedition_pirate_scaling_min	0.5	2026-01-22 01:59:48.62312
44	production_crystal_growth	1.1	2026-01-22 01:59:48.62312
79	combat_loot_cap_per_resource	50000	2026-01-22 01:59:48.62312
84	cargo_transporter_bonus_per_hangar	0.05	2026-01-22 01:59:48.62312
82	cargo_cruiser	800	2026-01-22 01:59:48.62312
132	cost_bomber_deuterium	15000	2026-01-22 01:59:48.62312
133	combat_bomber_attack	1000	2026-01-22 01:59:48.62312
127	combat_battleship_shield	200	2026-01-22 01:59:48.62312
131	cost_bomber_crystal	25000	2026-01-22 01:59:48.62312
20	ship_colony_ship_metal	10000.0	2026-01-22 01:59:48.62312
110	energy_cons_crystal	10	2026-01-22 01:59:48.62312
137	cost_destroyer_metal	60000	2026-01-22 01:59:48.62312
102	expedition_pirate_loot_base	5000	2026-01-22 01:59:48.62312
104	hangar_capacity_per_level	500	2026-01-22 01:59:48.62312
13	ship_cruiser_crystal	7000.0	2026-01-22 01:59:48.62312
80	combat_debris_percentage	0.3	2026-01-22 01:59:48.62312
72	combat_rf_cruiser_vs_light_hunter	6	2026-01-22 01:59:48.62312
14	ship_transporter_metal	4000.0	2026-01-22 01:59:48.62312
129	cargo_battleship	1500	2026-01-22 01:59:48.62312
121	combat_heavy_hunter_hull	1000	2026-01-22 01:59:48.62312
100	expedition_pirate_scaling_max	1.1	2026-01-22 01:59:48.62312
92	expedition_hunter_deuterium_max	25	2026-01-22 01:59:48.62312
54	energy_mine_consumption_growth	1.1	2026-01-22 01:59:48.62312
45	production_deuterium_growth	1.05	2026-01-22 01:59:48.62312
51	energy_solar_growth	1.1	2026-01-22 01:59:48.62312
87	expedition_hunter_metal_min	50	2026-01-22 01:59:48.62312
40	production_metal_base	30.0	2026-01-22 01:59:48.62312
74	combat_rf_plasma_vs_light_hunter	5	2026-01-22 01:59:48.62312
73	combat_rf_cruiser_vs_missile_launcher	10	2026-01-22 01:59:48.62312
94	expedition_cruiser_metal_max	250	2026-01-22 01:59:48.62312
11	ship_light_hunter_crystal	1000.0	2026-01-22 01:59:48.62312
116	cost_heavy_hunter_metal	6000	2026-01-22 01:59:48.62312
109	energy_cons_metal	10	2026-01-22 01:59:48.62312
60	combat_light_hunter_attack	50	2026-01-22 01:59:48.62312
12	ship_cruiser_metal	20000.0	2026-01-22 01:59:48.62312
107	slot_bonus_per_slot	0.5	2026-01-22 01:59:48.62312
95	expedition_cruiser_crystal_min	60	2026-01-22 01:59:48.62312
126	combat_battleship_attack	1000	2026-01-22 01:59:48.62312
98	expedition_cruiser_deuterium_max	60	2026-01-22 01:59:48.62312
120	combat_heavy_hunter_shield	25	2026-01-22 01:59:48.62312
115	tech_bonus_weapons	0.1	2026-01-22 01:59:48.62312
1	speed_factor	500.0	2026-01-22 01:59:48.62312
77	combat_armour_tech_bonus	0.1	2026-01-22 01:59:48.62312
103	hangar_capacity_base	500	2026-01-22 01:59:48.62312
139	cost_destroyer_deuterium	15000	2026-01-22 01:59:48.62312
134	combat_bomber_shield	500	2026-01-22 01:59:48.62312
62	combat_light_hunter_hull	400	2026-01-22 01:59:48.62312
135	combat_bomber_hull	7500	2026-01-22 01:59:48.62312
16	ship_recycler_metal	10000.0	2026-01-22 01:59:48.62312
71	combat_plasma_turret_hull	10000	2026-01-22 01:59:48.62312
41	production_crystal_base	20.0	2026-01-22 01:59:48.62312
114	tech_bonus_shield	0.1	2026-01-22 01:59:48.62312
81	cargo_light_hunter	50	2026-01-22 01:59:48.62312
124	cost_battleship_crystal	15000	2026-01-22 01:59:48.62312
90	expedition_hunter_crystal_max	50	2026-01-22 01:59:48.62312
130	cost_bomber_metal	50000	2026-01-22 01:59:48.62312
91	expedition_hunter_deuterium_min	10	2026-01-22 01:59:48.62312
3	mining_speed_multiplier	50.0	2026-01-22 01:59:48.62312
85	expedition_combat_chance	0.3	2026-01-22 01:59:48.62312
17	ship_recycler_crystal	6000.0	2026-01-22 01:59:48.62312
21	ship_colony_ship_crystal	20000.0	2026-01-22 01:59:48.62312
88	expedition_hunter_metal_max	100	2026-01-22 01:59:48.62312
112	tech_bonus_cargo	0.05	2026-01-22 01:59:48.62312
123	cost_battleship_metal	45000	2026-01-22 01:59:48.62312
128	combat_battleship_hull	6000	2026-01-22 01:59:48.62312
43	production_metal_growth	1.1	2026-01-22 01:59:48.62312
122	cargo_heavy_hunter	100	2026-01-22 01:59:48.62312
106	storage_capacity_growth	1.6	2026-01-22 01:59:48.62312
10	ship_light_hunter_metal	3000.0	2026-01-22 01:59:48.62312
50	energy_solar_base	60.0	2026-01-22 01:59:48.62312
97	expedition_cruiser_deuterium_min	30	2026-01-22 01:59:48.62312
113	tech_bonus_plasma_prod	0.01	2026-01-22 01:59:48.62312
136	cargo_bomber	500	2026-01-22 01:59:48.62312
69	combat_plasma_turret_attack	3000	2026-01-22 01:59:48.62312
118	cost_heavy_hunter_deuterium	1000	2026-01-22 01:59:48.62312
111	energy_cons_deuterium	20	2026-01-22 01:59:48.62312
117	cost_heavy_hunter_crystal	4000	2026-01-22 01:59:48.62312
93	expedition_cruiser_metal_min	150	2026-01-22 01:59:48.62312
89	expedition_hunter_crystal_min	20	2026-01-22 01:59:48.62312
53	energy_mine_consumption_base	10.0	2026-01-22 01:59:48.62312
68	combat_missile_launcher_hull	200	2026-01-22 01:59:48.62312
76	combat_laser_tech_bonus	0.1	2026-01-22 01:59:48.62312
32	defense_plasma_turret_metal	50000.0	2026-01-22 01:59:48.62312
19	ship_spy_probe_crystal	0.0	2026-01-22 01:59:48.62312
52	energy_tech_bonus	0.10	2026-01-22 01:59:48.62312
125	cost_battleship_deuterium	5000	2026-01-22 01:59:48.62312
78	combat_loot_percentage	0.5	2026-01-22 01:59:48.62312
83	cargo_transporter_base	10000	2026-01-22 01:59:48.62312
15	ship_transporter_crystal	4000.0	2026-01-22 01:59:48.62312
119	combat_heavy_hunter_attack	150	2026-01-22 01:59:48.62312
65	combat_cruiser_hull	2700	2026-01-22 01:59:48.62312
166	attack_max_points_ratio	5.0	2026-01-22 01:59:48.62312
4	flight_speed_multiplier	30.0	2026-01-22 01:59:48.62312
150	combat_rf_destroyer_vs_bomber	5	2026-01-22 01:59:48.62312
164	beginner_zone_galaxy_max	1	2026-01-22 01:59:48.62312
2	construction_speed_multiplier	50.0	2026-01-22 01:59:48.62312
146	combat_rf_battleship_vs_heavy_hunter	3	2026-01-22 01:59:48.62312
141	combat_destroyer_shield	500	2026-01-22 01:59:48.62312
153	maintenance_message_description	> Nouveau système de tech tree\n> 15+ technologies avancées\n> Système de planète mère\n> Optimisations de performance\n>\n> Vos comptes seront préservés\n> HARD RESET : Vos niveaux de mines, tech, bâtiments, défenses sont perdus.\n> Vos ressources seront compensées\n> Merci de votre patience !	2026-01-22 01:59:48.62312
147	combat_rf_bomber_vs_missile_launcher	20	2026-01-22 01:59:48.62312
167	beginner_protection_enabled	true	2026-01-22 01:59:48.62312
143	cargo_destroyer	2000	2026-01-22 01:59:48.62312
165	attack_min_points_ratio	0.2	2026-01-22 01:59:48.62312
148	combat_rf_bomber_vs_plasma_turret	10	2026-01-22 01:59:48.62312
156	maintenance_auto_disable_at		2026-01-22 01:59:48.62312
66	combat_missile_launcher_attack	80	2026-01-22 01:59:48.62312
168	beginner_zone_protection_enabled	true	2026-01-22 01:59:48.62312
154	maintenance_estimated_duration	3-4 heures	2026-01-22 01:59:48.62312
151	maintenance_enabled	false	2026-01-22 01:59:48.62312
152	maintenance_message_title	MISE À JOUR MAJEURE v2.0	2026-01-22 01:59:48.62312
144	combat_rf_heavy_hunter_vs_spy_probe	5	2026-01-22 01:59:48.62312
163	beginner_protection_days	3	2026-01-22 01:59:48.62312
96	expedition_cruiser_crystal_max	100	2026-01-22 01:59:48.62312
142	combat_destroyer_hull	11000	2026-01-22 01:59:48.62312
140	combat_destroyer_attack	2000	2026-01-22 01:59:48.62312
70	combat_plasma_turret_shield	300	2026-01-22 01:59:48.62312
145	combat_rf_battleship_vs_light_hunter	4	2026-01-22 01:59:48.62312
149	combat_rf_destroyer_vs_battleship	2	2026-01-22 01:59:48.62312
42	production_deuterium_base	10.0	2026-01-22 01:59:48.62312
108	energy_prod_solar_base	20	2026-01-22 01:59:48.62312
30	defense_missile_launcher_metal	10000.0	2026-01-22 01:59:48.62312
31	defense_missile_launcher_crystal	2500.0	2026-01-22 01:59:48.62312
155	maintenance_start_time	2026-01-21 20:48:42.972722+00	2026-01-22 01:59:48.62312
\.


--
-- TOC entry 3957 (class 0 OID 18881)
-- Dependencies: 269
-- Data for Name: server_resource_stats; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.server_resource_stats (id, metal_total, crystal_total, deuterium_total, metal_traded24h, crystal_traded24h, deuterium_traded24h, calculated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	1083055396.6054149	897170827.8350769	240978129.79755664	0	0	0	2026-03-02 02:44:32.91486
\.


--
-- TOC entry 3958 (class 0 OID 18898)
-- Dependencies: 270
-- Data for Name: ship_requirements; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.ship_requirements (id, ship_type_id, required_tech_id, required_level) FROM stdin;
10	1	7	1
11	2	8	2
12	2	6	2
13	3	3	2
14	3	8	4
15	4	9	4
16	4	13	6
17	5	9	6
18	5	13	10
19	6	4	5
20	6	8	6
21	7	9	7
22	7	14	6
23	7	15	1
24	8	7	3
25	8	10	2
26	9	7	2
27	10	8	3
28	11	7	6
29	11	5	2
\.


--
-- TOC entry 3960 (class 0 OID 18907)
-- Dependencies: 272
-- Data for Name: ship_types; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.ship_types (id, ship_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, attack, shield, hull, cargo_capacity, speed, fuel_consumption, shipyard_required, description, created_at, build_time_seconds) FROM stdin;
3	cruiser	Croiseur	combat	20000	7000	2000	400	50	2700	800	15000	300	4	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	38880
4	battleship	Vaisseau de Guerre	combat	45000	15000	0	1000	200	6000	1500	10000	500	7	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	86400
5	destroyer	Destructeur	combat	60000	50000	15000	2000	500	11000	2000	50000	1000	6	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	158400
6	bomber	Bombardier	special	50000	25000	15000	1000	75	7500	500	5000	700	8	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	108000
7	deathstar	Étoile de la Mort	ultimate	5000000	4000000	1000000	200000	1000	9000000	50000	1000000	1	12	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	12960000
8	spy_probe	Sonde Espionnage	utility	0	1000	0	5	0	100	0	100000000	1	3	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	1440
9	transporter	Transporteur	utility	4000	4000	0	5	10	400	5000	5000	50	2	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	11520
1	light_hunter	Chasseur Léger	fighter	3000	1000	0	100	50	400	0	12500	10	1	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	5760
2	heavy_hunter	Chasseur Lourd	fighter	6000	4000	0	250	150	800	50	10000	25	3	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	14400
11	recycler	Recycleur	utility	10000	6000	2000	10	10	1600	20000	2000	1	6	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	23040
10	colony_ship	Vaisseau de Colonisation	utility	10000	20000	10000	250	50	3000	7500	2500	1	4	Vaisseau de combat spatial	2026-01-21 14:18:53.189964	43200
\.


--
-- TOC entry 3962 (class 0 OID 18941)
-- Dependencies: 274
-- Data for Name: technologies; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.technologies (id, tech_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, cost_multiplier, research_lab_required, description, created_at, base_time_seconds) FROM stdin;
1	energy_tech	Technologie Énergie	energy	0	800	400	2	1	Améliore la production d'énergie des centrales solaires	2026-01-21 14:18:53.189964	1152
2	laser_tech	Technologie Laser	weapons	200	100	0	2	1	Technologie de base pour les armes à énergie	2026-01-21 14:18:53.189964	432
3	ion_tech	Technologie Ions	weapons	1000	300	100	2	4	Technologie avancée d'armes ioniques	2026-01-21 14:18:53.189964	1872
4	plasma_tech	Technologie Plasma	weapons	2000	4000	1000	2	4	Technologie ultra-avancée d'armes plasma	2026-01-21 14:18:53.189964	8640
5	shield_tech	Technologie Bouclier	defense	200	600	0	2	6	Technologie de boucliers énergétiques	2026-01-21 14:18:53.189964	1152
6	armour_tech	Technologie Armure	defense	1000	0	0	2	2	Améliore la résistance des coques de vaisseaux	2026-01-21 14:18:53.189964	1440
7	combustion_drive	Réacteur à Combustion	propulsion	400	0	600	2	1	Propulsion chimique de base	2026-01-21 14:18:53.189964	576
8	impulse_drive	Réacteur à Impulsion	propulsion	2000	4000	600	2	1	Propulsion à impulsion avancée	2026-01-21 14:18:53.189964	8640
9	hyperspace_drive	Propulseur Hyperespace	propulsion	10000	20000	6000	2	7	Permet les voyages interstellaires rapides	2026-01-21 14:18:53.189964	43200
10	espionage_tech	Technologie Espionnage	research	200	1000	200	2	3	Améliore les capacités de reconnaissance	2026-01-21 14:18:53.189964	1728
11	computer_tech	Technologie Ordinateur	research	0	400	600	2	1	Améliore la gestion de flotte	2026-01-21 14:18:53.189964	576
12	astrophysics	Astrophysique	research	4000	8000	4000	1.75	3	Permet de coloniser plus de planètes	2026-01-21 14:18:53.189964	17280
13	weapons_tech	Technologie Armement	weapons	800	200	0	2	4	Améliore la puissance de feu générale	2026-01-21 14:18:53.189964	1440
14	hyperspace_tech	Technologie Hyperespace	research	0	4000	2000	2	7	Recherches sur l'hyperespace	2026-01-21 14:18:53.189964	5760
15	graviton_tech	Technologie Graviton	research	0	5000	3000	3	1	Technologie expérimentale de manipulation gravitationnelle	2026-01-21 14:18:53.189964	7200
\.


--
-- TOC entry 3964 (class 0 OID 18965)
-- Dependencies: 276
-- Data for Name: technology_requirements; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.technology_requirements (id, tech_id, required_tech_id, required_level) FROM stdin;
14	3	2	5
15	3	1	4
16	4	3	5
17	4	1	8
18	5	1	3
19	8	1	1
20	9	14	3
21	9	8	5
22	10	11	1
23	13	1	4
24	14	1	5
25	14	5	5
26	12	8	3
27	12	10	4
28	12	11	3
29	15	9	1
30	15	14	3
\.


--
-- TOC entry 3966 (class 0 OID 18974)
-- Dependencies: 278
-- Data for Name: transport_log; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.transport_log (id, target_planet_id, target_planet_name, source_planet_id, source_planet_name, metal, crystal, deuterium, date, source_owner_name, target_owner_name) FROM stdin;
0305da47-0d26-410a-9757-6c256ac763ce	c34a3382-e6eb-4f51-8d48-021102098f85	Eldoria (Homeworld)	a78bbfc5-eaa9-4ea6-9c95-0e71caa6784e	Néo Omicron 957 (Homeworld)	108000	0	0	2026-01-26 19:34:20.727099	phantomhex	Carlito89
\.


--
-- TOC entry 3967 (class 0 OID 18991)
-- Dependencies: 279
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public."user" (id, username, password, email, created_at, role, protection_until, total_points) FROM stdin;
e0105e0b-ef87-4ef1-b511-29aa73b054e0	MehdiTamri	$2b$12$5lGdI0W7TPZbXnGRSDc8dOlxtOAKHB7rRYQYth0rdBQbmaYE03xsC	mehditamri7780@gmail.com	2026-03-01 21:34:54.796458	user	2026-03-04 21:34:54.796458	87341
5c07a266-2739-4999-80c4-bcbf67b81466	phantomhex	$2a$06$YGCxN4r/uRp5aAU3lQpNB.PrBuq/ymSm8Wus.ULswuDegPftKIRPy	phant0mhex@proton.me	2026-01-17 00:00:00	admin	\N	628881218
849ffcd5-711f-4fda-8d73-27654e2274ea	Mehdi	$2b$12$6yYfL3zyrnj8z5v0kKwPgOwDJcNwERa1Dp8ow7XKkJ46p3JSZkMfm	tamrimehdi27@gmail.com	2026-03-01 21:37:11.500634	user	2026-03-04 21:37:11.500634	3
2bfc8dfe-5c21-403a-bd72-079278cc0743	Vince	$2b$12$PYKoGS8EQE5/sR4q0xaJUu.W8WEzPQk1en6anTKiKE21/lCFVVag.	vincent.renard@belgiantrain.be	2026-02-09 13:21:43.256472	user	2026-02-12 13:21:43.256472	90082469
fbbd65cc-c22b-4e5a-ad27-caa1ccfef603	phant0mhex	$2b$12$oYugpfu9YbaKE7Wi23Ss9O.kv./1QSOIpouAvicsFqfXj0mFhkVOu	nd.managment@gmail.com	2026-03-03 12:10:51.795385	user	2026-03-06 12:10:51.795385	581
6bfe5069-b203-4bd1-b92a-5648543065a3	Lapin en rute	$2a$06$Hr7t6s5/6VoeKyxR3sPi6uUfJd.Vf8Ie7AKnfWdr9z.nkD2jL/4cW	alain.shaw@belgiantrain.be	2026-01-22 04:20:59.14872	user	2026-01-25 04:20:59.14872	138535131
0989fb04-fbc8-409b-b6a3-a76ad92bf8db	Marc	$2b$12$yUYaTAdp1qOt75f/bL8dhOiIVjUe05EwfF7jdcp9AcqTcEKo28WUy	marcgeoffroy970@msn.com	2026-01-23 18:00:48.805386	user	2026-01-26 18:00:48.805386	21401622
aa44498d-24ae-46d7-a1af-43c303f1fa8f	Syl	$2b$12$Ko4AnGPzEPHTPIgVmK65je6xAGdACQWo0jlI5Awov7JgcgK.e5yRG	sylvain.bouillon@belgiantrain.be	2026-01-31 15:48:08.365923	user	2026-02-03 15:48:08.365923	99380
96f3d4fb-a9f9-406b-a924-5b7c19f0049c	Tomdindon	$2b$12$rZUdIXNhzmNAgnym/A330eRYz.tx2TJxogagBIEYxLfdEa6dumuxS	axelleaire786@gmail.com	2026-01-17 00:00:00	user	\N	420147890
5c673356-eeda-4bef-95bf-c7686f0bf250	Vito	$2b$12$oVCnbUSZsZipvmrfgJjw6OHvNrQO1HOmQ5xm2in5yG9/OvCYqrKUq	vito.sciarrabone@belgiantrain.b	2026-01-17 00:00:00	user	\N	618939664
91944471-91a5-4961-9964-01d20e3e697a	Juge-Mesrine	$2b$12$mP.mmMmWzimOM07I6bX79eCXpolBH0KyI7TKJu0DQBFAKMSr9WI9a	rodrigue79s@gmail.be	2026-01-17 00:00:00	user	\N	83880
91b8bdd3-38de-40f7-9ea1-523fb5117a46	Agelid	$2b$12$1ZRIS2MA8rAIEy3/lRjZ/.TfUdJn2C.cSpTmEDMpzTTsGav/AuHJu	dilegamibenoit@hotmail.com	2026-01-29 13:55:21.571594	user	2026-02-01 13:55:21.571594	28096
6f9f0b38-07bb-475c-ab1e-2681496e1ea1	Carlito89	$2b$12$WX8gEWfkTbiVXq2TnoMLFujDT2v5xQtNO/Tnb0wDVNLdCqlO3LLq.	jo.carlier89@gmail.com	2026-01-17 00:00:00	user	\N	57020048
079f1020-0115-4e3d-b78c-5f9ec3e98003	ChupaChups	$2b$12$pINcGLhsxItuz83fBy1vg..MFrt0Vqff1gYfwKxJ.BpwDqbmiMf8u	jeanfrancois.deliere@belgiantrain.be	2026-01-17 00:00:00	user	\N	2226512998
e77bdc80-958a-4ea9-8167-18b653d265a1	Gollum	$2b$12$Um18di6Sv7IgnHapgcvwL.k3zeh65AKexYD3z3V5NsVitUTZ1JJQy	benjamin.neusy@belgiantrain.be	2026-01-22 04:20:38.94989	user	2026-01-25 04:20:38.94989	449241893
\.


--
-- TOC entry 3968 (class 0 OID 19003)
-- Dependencies: 280
-- Data for Name: user_achievement; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.user_achievement (id, user_id, achievement_id, current_progress, unlocked, unlocked_at, displayed) FROM stdin;
\.


--
-- TOC entry 3969 (class 0 OID 19015)
-- Dependencies: 281
-- Data for Name: user_daily_mission; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.user_daily_mission (id, user_id, mission_id, assigned_date, current_progress, status, completed_at, claimed_at) FROM stdin;
802119fb-3379-4c0a-995c-b705330f9d1f	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000001	2026-01-22	0	active	\N	\N
83b7b673-dde8-4d6b-b2a4-ec65138134bd	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000002	2026-01-22	0	active	\N	\N
3d07afa6-6f97-4409-bb00-5f02995606fc	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000004	2026-01-22	0	active	\N	\N
d5349f1e-e06a-4903-9896-936bf328c3d7	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000006	2026-01-22	0	active	\N	\N
7cdb8765-ed64-42e7-b974-11115b31c3fc	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000008	2026-01-22	0	active	\N	\N
fd663b64-78d7-48db-8692-bda01dca3e3a	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000001	2026-01-22	0	active	\N	\N
28bb9059-1785-4895-bb99-b62e8565d5e9	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000005	2026-01-22	0	active	\N	\N
9f865664-9f83-4fc0-aa7f-3ff48a5e9511	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000004	2026-01-22	0	active	\N	\N
f82407e3-77a9-48e6-9a32-09797fc4e541	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000007	2026-01-22	0	active	\N	\N
9f34d5aa-ed98-446f-b740-ffb0545c20d5	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-01-24	1	completed	2026-01-24 00:31:55.635196	\N
f1635085-e23e-436c-98b6-db82037f7c33	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000003	2026-01-22	1	claimed	2026-01-22 11:23:35.533504	2026-01-22 15:09:27.374362
adec0a34-98fd-4f08-b381-120d7c2c34c5	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-01-22	0	active	\N	\N
963f1207-f1fd-4cf2-9bd9-49b3a96c754c	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000004	2026-01-22	0	active	\N	\N
7296df00-2cce-4b6a-938f-d9b6adb6a750	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000006	2026-01-22	0	active	\N	\N
9f537ab2-6080-4d4f-ae74-42e67924c43a	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000008	2026-01-22	0	active	\N	\N
3a281cc7-9347-4642-b4e1-fca7d1723e4b	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-01-24	0	active	\N	\N
3991bc01-300b-4916-ab0d-d4ca0c8d4c50	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000003	2026-01-22	1	claimed	2026-01-22 18:58:23.434093	2026-01-22 20:21:04.438667
961c8f0d-aa01-491d-b47d-9a05fd6e7135	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-01-22	0	active	\N	\N
3dee504e-9e82-4c59-b752-60a5c5f83908	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-01-22	0	active	\N	\N
35961a59-14ac-4140-8403-e0ae388308e5	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-01-22	0	active	\N	\N
391b458b-0344-4b15-9f85-d09b4681fb4d	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000007	2026-01-22	0	active	\N	\N
6fc71d28-b727-4882-91c5-ad1141a43174	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-01-22	2	active	\N	\N
41053b92-be93-46ca-a50d-28daede48d01	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000002	2026-01-23	0	active	\N	\N
19988120-3f08-47eb-972e-233a28567f85	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000001	2026-01-23	0	active	\N	\N
625b93e3-9b22-467b-af9d-e9fa88cad48e	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
0cbe3c01-80f4-403d-8846-a25e8d3be92c	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000007	2026-01-23	0	active	\N	\N
5baa0dda-4f3b-4e3a-89a8-3f4d4778246b	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-01-23	0	active	\N	\N
160c5dd8-194c-44ac-912a-765ecc51454d	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-01-23	0	active	\N	\N
0067ba30-fce2-49aa-bd5b-586d946aa950	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
43cfe6ce-54ac-4590-830e-e72f37277f5f	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-01-23	0	active	\N	\N
9338feda-09cc-49f5-96f1-b337ff2802f4	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-01-23	1	completed	2026-01-23 02:02:41.14454	\N
e4405a7a-222c-422e-8b51-79a981404cab	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-01-23	0	active	\N	\N
afc0442c-b538-497b-94fa-34c04d1d2957	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
39a238ae-ffcb-4611-91f7-e7f982f26ad8	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-01-23	0	active	\N	\N
3804666b-e9e2-4bd9-ae8c-5b7cc6819c48	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000007	2026-01-23	0	active	\N	\N
719a1ee6-e702-4aae-9f5f-c4fc00f4e315	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000006	2026-01-24	0	active	\N	\N
28c27c49-7675-466b-aea9-f7856157d0e8	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-01-23	1	completed	2026-01-23 02:52:47.223945	\N
7625a2f6-71d4-4553-a3f4-0059067cc1b5	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000001	2026-01-23	0	active	\N	\N
8574e51a-a729-405c-bb2e-840cf52e64fe	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
088ba1d2-abec-460f-ae95-a0ca97ca4049	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000008	2026-01-23	0	active	\N	\N
a08edd47-efc6-4e6e-a416-9b262f9ca39d	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000003	2026-01-23	1	completed	2026-01-23 07:46:56.787959	\N
1264f253-c336-42eb-9fce-a489794c6ed8	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000005	2026-01-23	1	active	\N	\N
89042208-b2c8-4e6b-9b4c-d837146a5120	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-01-23	0	active	\N	\N
6a3d28f3-3654-4e22-ae0e-528e8f49d495	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
9aa4b96a-c59d-43b9-aa94-a3a6147da92d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000008	2026-01-23	0	active	\N	\N
5c7f9810-167b-48d4-b835-ed66d373ef11	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000003	2026-01-23	1	completed	2026-01-23 16:40:47.751658	\N
ef25f7dd-b47d-492b-acea-0f87375266bc	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000002	2026-01-23	0	active	\N	\N
66f1cf27-1102-423a-8875-ac85b500b9af	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000001	2026-01-23	0	active	\N	\N
7f092094-78a0-4eb2-8d7a-dd4c98ae677e	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000004	2026-01-23	0	active	\N	\N
4117656f-24c4-4f06-a602-d231a4899c2c	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
481cfd00-eea4-407f-955f-b991d09c2300	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000008	2026-01-23	0	active	\N	\N
1577502d-c6ce-4b93-a66e-eb548a4309c4	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000001	2026-01-23	0	active	\N	\N
06ec18e7-139b-42cc-b309-fa5902fdbe6f	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000006	2026-01-23	0	active	\N	\N
4686abf0-7830-4377-a1de-b0f68319ae20	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000004	2026-01-23	0	active	\N	\N
b2772176-7ca6-4cc2-8a89-b948586dd4d1	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000008	2026-01-23	0	active	\N	\N
178dcf4a-8d4c-490b-bd49-0d6ab91f8fa5	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000004	2026-01-24	0	active	\N	\N
2857fa0a-2406-480b-a0a8-14619c4c7d80	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000003	2026-01-23	1	claimed	2026-01-23 18:10:29.644505	2026-01-23 18:35:10.439382
16c24163-cd60-4188-bfd3-105bd461e94a	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000007	2026-01-24	0	active	\N	\N
5444666f-3e19-4fb7-a435-e6600578a901	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000001	2026-01-24	0	active	\N	\N
e6386ebf-f6c6-4e2c-99ce-e093d603dfa4	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000005	2026-01-23	3	claimed	2026-01-23 22:47:43.650598	2026-01-23 22:49:38.340624
5adb4734-4d93-4c5a-8a5e-f4c1743af629	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000005	2026-01-23	3	completed	2026-01-23 23:01:27.045015	\N
f1738f58-015f-4326-a2b3-bbbf7d25826b	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-01-24	0	active	\N	\N
ed76463b-4c75-4dea-b15c-4a2a01b38a6c	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-01-24	0	active	\N	\N
4b0c013b-e677-481c-ade3-68d2e24e0431	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-01-24	0	active	\N	\N
1b6dbe1c-6605-483d-a00f-cf431cef9667	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-01-24	0	active	\N	\N
6e2295b4-d0eb-4fd3-8495-b8764538884a	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000006	2026-01-24	0	active	\N	\N
dd18b3f5-cd65-41da-8a27-679b5541d178	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000007	2026-01-24	0	active	\N	\N
461c663b-d252-457e-991b-1cd446ab0e89	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-01-25	1	completed	2026-01-25 02:15:56.895588	\N
932d4529-1da3-4967-bb3a-25729d9db869	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-01-25	0	active	\N	\N
5f2e0d93-202c-4401-a4a8-7ef7900c84a0	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000003	2026-01-24	1	completed	2026-01-24 02:55:14.433434	\N
02e17d49-d713-45db-b4d8-f6f1bee7bb58	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000003	2026-01-24	1	completed	2026-01-24 16:58:56.236058	\N
26a1b6b9-41bb-4eea-836e-7e602f451dc8	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000005	2026-01-24	3	completed	2026-01-24 22:21:44.929531	\N
5d3c87fe-f510-41a0-891c-16a929e28dba	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-01-25	0	active	\N	\N
0cc42e80-cd19-4b41-868b-97fc12f91362	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-01-25	0	active	\N	\N
7e0bb7db-fcdf-4bd7-b1c2-1271c6d1ab80	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-01-25	0	active	\N	\N
0ab27fe5-9d49-4c30-b5f1-fc3b3b287596	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-01-25	0	active	\N	\N
f2d92a17-d088-41e3-bd5a-a89f8b8bda00	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000002	2026-01-25	0	active	\N	\N
27ca065d-765e-4eb7-830d-2e61985346a1	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000005	2026-01-25	0	active	\N	\N
b09edc22-9a4f-44fd-aac4-e048fcb13451	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000004	2026-01-25	0	active	\N	\N
67eba1ac-29dc-49d4-818d-1dae44bd5352	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000007	2026-01-25	0	active	\N	\N
0f854e9b-0044-4af4-98ca-689ef057c878	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000001	2026-01-26	0	active	\N	\N
59fc6192-3654-4f25-8889-847d26fd0a60	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000004	2026-01-26	0	active	\N	\N
b639bafc-e3d1-47d3-97c6-9035632e1f0d	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000006	2026-01-26	0	active	\N	\N
ac1c3ee1-031a-4dd8-91fb-2f715dcbfbe3	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000007	2026-01-26	0	active	\N	\N
78ccfe06-331b-469d-8451-24d939b21e91	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000003	2026-01-26	1	completed	2026-01-26 18:46:17.525981	\N
c678d9c7-0351-401f-9cf8-bbdb2a6e627e	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000003	2026-01-27	0	active	\N	\N
ee18894b-3248-49f8-ba6b-2c1002c2b3f3	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000002	2026-01-27	0	active	\N	\N
4874379a-84ba-4cc0-9825-2fcc56d9348e	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000004	2026-01-27	0	active	\N	\N
7c59e8ae-a929-4ae0-9b46-73ce71e143e5	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000005	2026-01-27	0	active	\N	\N
3e2b0a14-724e-4f22-8bc1-b9bad561b8ab	5c07a266-2739-4999-80c4-bcbf67b81466	a0000001-0000-0000-0000-000000000007	2026-01-27	0	active	\N	\N
35c65c4d-883c-4057-854f-063bd34a7d93	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000002	2026-01-27	0	active	\N	\N
61395bd3-a618-45b6-9fb9-70b9bf9ed5d2	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000004	2026-01-27	0	active	\N	\N
7ddbe41c-0d53-4235-84fd-74847d2170c8	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000005	2026-01-27	0	active	\N	\N
d24ee71e-6768-4f24-a594-b9bc2368072f	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000008	2026-01-27	0	active	\N	\N
de0289e5-8bd5-4a0a-b59f-7c989db90e72	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000002	2026-01-27	0	active	\N	\N
aceaa7ce-65b4-48b4-99ff-ddcacee67d79	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000003	2026-01-27	0	active	\N	\N
7c6ea025-e51e-4208-bd62-acc3acc76fb3	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000006	2026-01-27	0	active	\N	\N
46374bc0-0406-4117-9e0a-8f270dc55106	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000007	2026-01-27	0	active	\N	\N
1aa1fda0-7ebb-4ab2-aa91-4e5bfb08c002	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000003	2026-01-27	1	completed	2026-01-27 15:21:23.271478	\N
01ffbd19-662a-4182-86b8-358bb3835f20	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000005	2026-01-27	1	active	\N	\N
a7c57c5c-f3a8-429c-b60a-42a2b571df88	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000001	2026-01-29	0	active	\N	\N
eedef4a6-e10d-43b1-887a-bdf3de8e4e2a	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000002	2026-01-29	0	active	\N	\N
e1273ebf-9f76-45df-a263-f789f2f51087	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000005	2026-01-29	0	active	\N	\N
f297f8d2-1826-47fc-a7b8-d21376898007	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000004	2026-01-29	0	active	\N	\N
b80919a4-932f-4fd8-a879-f351160c09b3	079f1020-0115-4e3d-b78c-5f9ec3e98003	a0000001-0000-0000-0000-000000000007	2026-01-29	0	active	\N	\N
5a960f09-a7bc-403c-b555-a24e57c7752d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000002	2026-01-31	0	active	\N	\N
abc57450-1a92-4572-9cde-1536db75f8ec	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-01-31	0	active	\N	\N
a3111860-89bc-4afb-9923-89c94447d93a	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000004	2026-01-31	0	active	\N	\N
7a6a2129-a486-458d-ab2b-118c2834672c	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000006	2026-01-31	0	active	\N	\N
25a1961a-6a46-418c-8596-b44397298938	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000007	2026-01-31	0	active	\N	\N
e48604fb-daa5-4e68-9ce8-f7d49a929e6e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000001	2026-02-02	0	active	\N	\N
b0a97b84-7d00-4ef7-9f41-18f29cf2075a	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000003	2026-02-02	0	active	\N	\N
2b59f4d4-2e19-4e17-be47-42b4262ff80a	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000004	2026-02-02	0	active	\N	\N
f71022a1-a115-4b02-a4e1-861baf472510	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000005	2026-02-02	0	active	\N	\N
50cc9b15-116b-413c-8bcc-d92fd7153b8e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a0000001-0000-0000-0000-000000000007	2026-02-02	0	active	\N	\N
f51ed43c-7cb4-40fc-a993-b167cf21cec9	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-03	0	active	\N	\N
f1a269ea-0d78-411a-a35d-2c56752e5338	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-02-03	0	active	\N	\N
6e890f74-8ea0-4b79-8cca-a4c6c1fd5b35	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-02-03	0	active	\N	\N
a3abdce4-0304-4c31-93a5-c0e362eeee42	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-03	0	active	\N	\N
0ec546ca-7cbc-4d58-8bbd-0c15fe907cd4	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000008	2026-02-03	0	active	\N	\N
e196ec56-b42a-462b-ae57-631fd8c61362	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-02-04	0	active	\N	\N
510adbbb-e7b5-4c7e-a697-5f8970322f13	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-04	0	active	\N	\N
66d1fa20-b5a2-453d-a389-96460f1e0768	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-02-04	0	active	\N	\N
bbfd3dda-8a1f-4012-a8b5-8dc250d513e4	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-02-04	0	active	\N	\N
91ad1148-5ffd-4be9-a67d-9d567479ba9a	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-02-04	1	active	\N	\N
0181be35-1e6d-4e27-a4f5-4cb624719d55	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-07	0	active	\N	\N
c12c1fc2-5de6-4bd0-9f14-a57ec0573b88	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-02-07	0	active	\N	\N
3d7a79a7-c954-44d1-a478-b10745576ce3	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-07	0	active	\N	\N
8e095514-2e55-47ae-840a-74770761a7ef	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000007	2026-02-07	0	active	\N	\N
9f3f7900-8901-4959-bc36-e089b0a9e670	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-02-15	0	active	\N	\N
ba4e7a78-21de-412c-9045-5893fd737561	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000005	2026-02-07	2	active	\N	\N
e35a4278-6111-41c7-819f-0efc76a44706	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-08	0	active	\N	\N
79d80dec-02bc-42fc-aa0b-1ec2142da915	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-08	0	active	\N	\N
d7443922-3a44-4108-a69e-8f3af0937ea6	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000005	2026-02-08	0	active	\N	\N
1bc84894-e473-4af9-9576-20d169913a34	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000007	2026-02-08	0	active	\N	\N
96a76e98-97af-44ed-a290-1932938fba29	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-02-08	1	completed	2026-02-08 12:02:23.683821	\N
89dae089-e3b8-4f47-bb6d-250c33bccbb9	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-02-08	0	active	\N	\N
8669c821-1060-437f-9886-1ed5278060e4	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-08	0	active	\N	\N
dafe51f6-102c-4544-b589-e6f096dc86f7	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-08	0	active	\N	\N
6a60a6f4-c2ba-42b9-83cd-6a218785f1b7	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-02-08	0	active	\N	\N
548fb363-bf1c-4420-814b-2b7ca32d16ce	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000007	2026-02-08	0	active	\N	\N
ce607499-1c0e-40f3-a118-4e5dfa4be3a8	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000001	2026-02-11	0	active	\N	\N
fa581b82-4b52-46d4-b686-1c87ea905e6f	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-02-11	0	active	\N	\N
9872df96-7a73-45b4-8ce2-9eafcbbafe42	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-11	0	active	\N	\N
17a76a70-5715-49dd-87b4-79c3883a576e	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-02-11	0	active	\N	\N
7ee6a7d2-4651-409f-b115-b20f4cb6f810	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000007	2026-02-11	0	active	\N	\N
a08d8d7b-5449-4a73-bc1c-c47d2ac962bd	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-13	0	active	\N	\N
05f752ff-e672-4ed8-b867-8f77ed072750	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000001	2026-02-13	0	active	\N	\N
1b9e614c-2483-4619-92c1-492d4e44cd69	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000005	2026-02-13	0	active	\N	\N
de811895-667c-424e-9ac5-242e862fa311	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-02-13	0	active	\N	\N
1fde7c18-01c7-4546-b88a-1c88a8182342	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000008	2026-02-13	0	active	\N	\N
5178282a-e687-4abe-8b99-207163fe0049	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000001	2026-02-14	0	active	\N	\N
b866cca0-a10e-4c38-8e82-2dcd243dc5ab	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000003	2026-02-14	0	active	\N	\N
b491e87d-325e-4384-a830-94d01072d2e6	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-14	0	active	\N	\N
7bb2c742-9348-4728-96e7-0be6e3eab1d7	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000008	2026-02-14	0	active	\N	\N
f6151d90-0cc2-436f-af9e-1132593806be	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-02-15	0	active	\N	\N
7e9e1787-790e-4d63-91c4-6bf4c5106eec	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000005	2026-02-14	2	active	\N	\N
5166816c-6fb8-4984-b854-c662ffd64c66	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000002	2026-02-14	0	active	\N	\N
c065a7ed-8264-443f-b0ea-d5066dc34d06	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000003	2026-02-14	0	active	\N	\N
18a2aae8-a5db-4775-95e1-6f9ba1dd5cd4	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000004	2026-02-14	0	active	\N	\N
fb78d0cf-c4c8-4501-b16a-817cab189371	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000006	2026-02-14	0	active	\N	\N
a4c3f356-c2fb-4c0d-bf1e-b4675af784d4	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a0000001-0000-0000-0000-000000000008	2026-02-14	0	active	\N	\N
79e5a30c-9daa-4101-bfeb-d73800ccce8b	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-02-15	0	active	\N	\N
2b2bdac9-caa1-4852-b88e-f3221b0690e8	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-15	0	active	\N	\N
0de5895b-108b-478a-8b91-8ebf3aab1c15	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-02-15	0	active	\N	\N
c44a6f0f-40f8-4563-965a-2d7c585ca1a3	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000001	2026-02-17	0	active	\N	\N
4120583e-33b2-4464-abf4-a9ee5f56b475	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-17	0	active	\N	\N
4e060429-5fa0-4fcf-8312-86f8fe7d6cb8	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-17	0	active	\N	\N
287ea80d-e842-466d-858f-8741952ed30d	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-02-17	0	active	\N	\N
b1c00393-f9b2-44d7-9a88-c916f404c537	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000008	2026-02-17	0	active	\N	\N
3f836e5e-d1f8-4483-aa53-3124c1321da6	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-02-20	0	active	\N	\N
dc7f7cb7-34ad-4072-8580-7fd8f3f6eee8	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-20	0	active	\N	\N
873dbbde-f6b9-47a4-9062-d67e5a253a40	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-02-20	0	active	\N	\N
af49bc77-7da9-4394-a16b-64006ef7fbf9	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-20	0	active	\N	\N
312eaf49-80ee-44b5-8a68-946a2f31568f	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-02-20	0	active	\N	\N
cd23d69f-82d9-4fc0-ad1b-a58729c83bc8	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000002	2026-02-20	0	active	\N	\N
19a7ae01-db69-4238-ac59-cd2b4b00e77a	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000001	2026-02-20	0	active	\N	\N
121a37bd-7cc4-4f9a-b03b-1570647b68e7	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000004	2026-02-20	0	active	\N	\N
53218d61-1bea-47e5-9f3e-bd6e951094e1	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000006	2026-02-20	0	active	\N	\N
3c5a20a9-a7fb-43c1-806a-f3416fc9a6f1	6bfe5069-b203-4bd1-b92a-5648543065a3	a0000001-0000-0000-0000-000000000008	2026-02-20	0	active	\N	\N
9ecee321-acb8-4ef2-99ba-f11e642b5681	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-23	0	active	\N	\N
6e0f2020-0674-4568-9411-8514d4b9f11e	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-02-23	0	active	\N	\N
1f842396-35f6-43fd-94ef-16dbff3dab9f	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-23	0	active	\N	\N
d125ff09-5565-44b6-944d-04a051e9c922	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-02-23	0	active	\N	\N
5b4b3e8c-00a3-4cda-9283-522f874233e3	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000007	2026-02-23	0	active	\N	\N
0f203698-4896-40db-a0bb-27fe811f8959	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-02-24	0	active	\N	\N
290a2666-dd79-40c7-8faf-54d3161f3d1a	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-24	0	active	\N	\N
1e2082d9-6279-47f6-a58a-f2e49aee857a	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-02-24	0	active	\N	\N
9f64e9a0-284d-425c-8bd7-2693609e6859	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-24	0	active	\N	\N
9a6a65b3-c89e-4c58-afd4-cfd771ef7d53	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-02-24	0	active	\N	\N
c128da9e-8051-4242-8799-cb07aa7fbf82	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-02-24	0	active	\N	\N
e17c34af-933b-40c1-b5e2-5834fc75ec61	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000002	2026-02-24	0	active	\N	\N
61e59df2-7a7c-4983-86da-c1997ab63c95	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000006	2026-02-24	0	active	\N	\N
2026ecd0-0f0a-4dc9-a773-c8a1844e5327	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000008	2026-02-24	0	active	\N	\N
0c2fce2c-f9d1-4262-8c7d-dc364b32d160	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000003	2026-03-02	0	active	\N	\N
2f01f3d3-f1a2-4fd2-bd81-31c7bba810a0	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-03-02	0	active	\N	\N
e2e33244-ac6e-46c8-aa55-1c571a2ce54e	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-03-02	0	active	\N	\N
fde47859-b97f-4bb3-a77a-764ce4303276	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-02-24	3	claimed	2026-02-24 22:18:45.521603	2026-02-24 22:19:06.41479
22c889a6-a3c3-4bc0-8325-389b721040ce	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000002	2026-02-25	0	active	\N	\N
f24ae432-92b2-4ed6-8d35-80ca3455cf3c	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-02-25	0	active	\N	\N
c779c38b-b243-4da8-bcb7-c89e633283fb	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-02-25	0	active	\N	\N
3841c977-23fd-45f9-a9d1-f4bf350a8c7f	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000007	2026-02-25	0	active	\N	\N
8ed71e5b-1e0d-42df-9245-5d77f8da4fe3	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-02-25	1	claimed	2026-02-25 14:39:15.742572	2026-02-25 21:06:23.826741
ab4464fa-d66f-4147-8b0d-9b51e1487e86	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-02-25	0	active	\N	\N
f6bb5b4e-7696-494b-8b37-e4e53f5ed6be	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-02-25	0	active	\N	\N
2a77fc2f-c844-4bec-bd4d-badc3777b358	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-02-25	0	active	\N	\N
9d54f01b-3499-4afb-ad88-ee87984b3521	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000004	2026-02-25	0	active	\N	\N
df22ed75-7d6f-45b7-a050-8a5ff4b3cbc3	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000007	2026-02-25	0	active	\N	\N
92704785-f7fa-4945-afad-fe5216936525	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-02-26	0	active	\N	\N
0200fff8-06d9-4b98-8ef6-bdd4e595ece8	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000002	2026-02-26	0	active	\N	\N
667f9308-b2ac-4415-8a43-cbfd1a2c24e5	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-02-26	0	active	\N	\N
56d05333-bb31-4ca3-ab36-6657bae3ed30	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000006	2026-02-26	0	active	\N	\N
e982ffc9-79b7-4c42-911a-8759a75d42d9	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000008	2026-02-26	0	active	\N	\N
af7ddb2b-0bd0-4a17-a370-6453c2c4b6de	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-02-27	0	active	\N	\N
5f219fa4-3126-4d7b-80fe-8f1ff26cebaa	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-02-27	0	active	\N	\N
0d740c86-ffab-4fe7-a888-c7f4c4431c1e	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-02-27	0	active	\N	\N
3b821ceb-c5bf-41db-9fe0-163752b153ed	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-02-27	0	active	\N	\N
f7118640-56b7-44c2-8df1-d6d223c2b059	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000008	2026-02-27	0	active	\N	\N
1e419bb5-2299-4124-a736-2ce51e897877	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000002	2026-02-28	0	active	\N	\N
f22bf5b9-8739-4c6f-bc1b-ba067f8e1014	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-02-28	0	active	\N	\N
e133a714-74b1-4bab-8003-c2a18c1cc3f0	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000006	2026-02-28	0	active	\N	\N
5b82dbf2-5ce4-4efe-9086-fd2d51319dab	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000007	2026-02-28	0	active	\N	\N
109c94ea-6057-4011-8fa3-60a0299d9e83	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000007	2026-03-02	0	active	\N	\N
5047cc37-e012-46f7-9d8f-f647a0a2da36	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-02-28	1	claimed	2026-02-28 18:06:23.213579	2026-02-28 18:19:54.717178
736b5b8d-4428-47fb-97fd-3d324531f02f	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-03-01	0	active	\N	\N
b264e9fe-66ee-4de9-893a-b504fa8767c5	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-03-01	0	active	\N	\N
ba6df9b7-0856-4640-93e0-5b6c63ebba9e	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-03-01	0	active	\N	\N
a762368f-ca52-44a7-a597-00b8221cc0f1	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000007	2026-03-01	0	active	\N	\N
fea44827-2e17-4c2d-9650-83013c796085	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-03-01	2	active	\N	\N
6117ae39-3a5c-46ce-a6ac-f2b82b4fa961	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000002	2026-03-01	0	active	\N	\N
a17fa6d2-2ed3-45fb-ba98-f39feeb24c68	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000001	2026-03-01	0	active	\N	\N
9f77f45e-02c0-41f1-9d0d-b91984da86b1	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000006	2026-03-01	0	active	\N	\N
02b50ca6-0552-4c5e-82a5-5ea13c2fd666	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000008	2026-03-01	0	active	\N	\N
10f445f9-daf8-41d3-be67-c2e8aea06345	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-03-01	1	active	\N	\N
75874abd-9890-40ed-8617-cc232ad6fbf1	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000003	2026-03-01	0	active	\N	\N
529b3a4f-3516-4424-8aa0-9ed28123df88	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000002	2026-03-01	0	active	\N	\N
b6c63412-dd7c-43ab-a71e-5561152a8289	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000004	2026-03-01	0	active	\N	\N
4d1ec479-fb40-46d8-bfc4-3068d621649c	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000006	2026-03-01	0	active	\N	\N
2749054e-b859-4043-a4c6-6368742876bd	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000008	2026-03-01	0	active	\N	\N
927a2d26-cc54-4573-9046-9bcb8ec5ade9	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000001	2026-03-02	0	active	\N	\N
f9f55e40-641e-4222-8b18-d5a2691b8db7	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000002	2026-03-02	0	active	\N	\N
bc7b27f6-23d0-49b2-abec-79115fde67e1	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000004	2026-03-02	0	active	\N	\N
5464d288-4ef2-441d-b1f2-bb3d19b17533	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000005	2026-03-02	0	active	\N	\N
5f7c23cf-60ad-45b2-a257-cf9c7682c274	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a0000001-0000-0000-0000-000000000008	2026-03-02	0	active	\N	\N
fc494804-2dc6-4772-ab2a-dfc62666ad2c	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000002	2026-03-02	0	active	\N	\N
c7e8b510-cb93-4c3c-b250-d596162dcc74	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000005	2026-03-02	0	active	\N	\N
0e2ac628-da40-4a36-85ef-ad12fa30edc6	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000006	2026-03-02	0	active	\N	\N
fe77d3db-2865-4876-98b5-424de235a362	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000008	2026-03-02	0	active	\N	\N
ab8301a2-0cd1-4090-b376-8791bbd829bf	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-03-03	0	active	\N	\N
372c1e8e-1fc5-40aa-9253-b4140ee2eefe	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-03-02	0	active	\N	\N
4504eaf6-afd1-46b7-b0f6-5a1f06e10167	e77bdc80-958a-4ea9-8167-18b653d265a1	a0000001-0000-0000-0000-000000000005	2026-03-02	2	active	\N	\N
fdd2843b-dc3b-48c1-b318-35e79e439dc7	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-03-02	0	active	\N	\N
77b42511-5f0b-43cf-81c9-3bb11fb64234	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-03-02	0	active	\N	\N
36a11fbf-fa7b-4834-91b2-3e032cb44c68	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-03-02	0	active	\N	\N
0c670796-6637-477f-89cf-76a8cd03480c	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000007	2026-03-02	0	active	\N	\N
3b6df828-ba04-40b0-ba0d-8800cb7f1899	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000003	2026-03-02	1	claimed	2026-03-02 02:07:01.319044	2026-03-02 13:49:08.014126
bb568cf1-519d-48dd-b383-b67fd0268f68	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-03-03	0	active	\N	\N
81200778-9842-4947-86ac-b87eba4a3dff	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-03-03	0	active	\N	\N
f1edecf7-c73f-4516-b8ca-56e5a87011d1	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-03-03	0	active	\N	\N
0610bda0-2503-4f21-bb44-d8a7077f0ef4	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000008	2026-03-03	0	active	\N	\N
2b744a5b-8b7d-4cd9-8557-6359e3529ebe	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000003	2026-03-04	0	active	\N	\N
972beb6f-9e73-4e55-9695-2732827758b9	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000001	2026-03-04	0	active	\N	\N
385d7616-b5ff-4ef2-895d-187410e50a00	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000005	2026-03-04	0	active	\N	\N
28794666-2a71-41b4-9621-8137452d741b	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000004	2026-03-04	0	active	\N	\N
bd098935-a058-4227-9888-eee6c2aa2366	2bfc8dfe-5c21-403a-bd72-079278cc0743	a0000001-0000-0000-0000-000000000008	2026-03-04	0	active	\N	\N
1e2072c5-e07a-4722-8f14-ca97804ccc37	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000002	2026-03-04	0	active	\N	\N
2051f1ab-3f90-4382-bf2e-dd8d2c7bf9b0	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000004	2026-03-04	0	active	\N	\N
9ac8ad60-ee80-4e22-97a5-e3e518e12a7b	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000006	2026-03-04	0	active	\N	\N
fa068964-5e5e-4a4d-bd45-f77c485f689b	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000008	2026-03-04	0	active	\N	\N
89139106-b530-472b-996e-e1864bcef581	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a0000001-0000-0000-0000-000000000003	2026-03-04	1	completed	2026-03-04 22:37:21.881531	\N
\.


--
-- TOC entry 3970 (class 0 OID 19026)
-- Dependencies: 282
-- Data for Name: user_officer; Type: TABLE DATA; Schema: public; Owner: spacedb_ow88_user
--

COPY public.user_officer (id, user_id, officer_template_id, level, experience, is_active, recruited_at) FROM stdin;
e98976d7-4540-41e2-92f9-c7625f073223	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	6d0d8474-de61-4c09-b178-00352daae57e	1	0	t	2026-01-22 02:58:14.252526
611c822c-f5f8-4e21-82d2-8eeb1f2706a1	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	7c73d9dc-5243-48ee-b8a5-1259931ffc19	1	0	t	2026-01-22 02:58:17.246879
e7adc773-e1a2-4044-b401-9b976eb2e642	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	f443de37-c77a-4e37-9300-4594565bb491	1	0	t	2026-01-22 02:58:19.990705
8e53852b-1d25-4113-880f-ab432b6eced6	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	417fd06a-2c63-4fe1-93a9-75b6b5271260	1	0	t	2026-01-22 02:58:22.432504
001d72cb-e707-4efc-b7b3-13a8c2f5ac8a	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a259e443-4dbe-41f1-8ed0-7a1461818871	1	0	t	2026-01-22 02:58:24.669009
ede8488c-47de-4f63-9ed9-d4d9056d5012	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	8521e189-1b79-4e23-abda-94b6bb6f4716	1	0	t	2026-01-22 02:58:27.131716
054c8cfb-2ffb-4a16-b9da-5fd8dff0602a	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	168c7b7e-bfb2-4184-a4d3-d4b68601b450	1	0	t	2026-01-22 02:58:29.627588
619a545c-7811-4135-92cc-d2e4d732dd79	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	1	0	t	2026-01-22 02:58:32.948979
bb59f5b4-27bf-4cc2-9170-56c20630b35d	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	78fb3df8-7668-46e4-8fac-8d0dede32211	1	0	t	2026-01-22 02:58:35.996667
2c9508fd-b324-4e46-9adb-416516bef293	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	1	0	t	2026-01-22 02:58:38.961275
af1a3d6e-71b4-40f4-b857-ea3037d1a797	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	8272f515-7fdf-4fc9-977c-46c35f62ff7e	1	0	t	2026-01-22 02:58:41.703106
1e55d895-0682-4817-9f05-f680e7b3b71b	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	fcbc7e69-d084-4fb9-9a58-44d474d5f341	1	0	t	2026-01-22 02:58:44.732576
f981dfab-448c-406d-a84d-5020836680ed	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	853eb44d-448a-444d-a5ae-b8fb33b8feb3	1	0	t	2026-01-22 02:58:47.241182
560236c1-d52d-41dc-9944-d584aa3b6185	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	3a4c8111-dc57-4572-a8a5-203db202eb98	1	0	t	2026-01-22 02:58:49.846444
da4ab3c3-f35f-47bf-9f36-1f62d0edd1f1	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	1	0	t	2026-01-22 02:58:52.685096
90be6052-ca1c-44af-a2f0-d557ac08c149	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	1	0	t	2026-01-22 02:58:55.514754
9c2835d9-8d5e-4f4b-8740-3ac10b073333	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	1	0	t	2026-01-22 02:58:58.403207
9e06c679-7984-4f43-b8bb-923e39ec6aa2	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	290695c5-2ac2-4a1b-8643-9dfd55023f3e	1	0	t	2026-01-22 02:59:01.035526
da623954-d74a-49a6-b23d-09b5b9b0bb76	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	daedb7c9-433c-4c07-b6f9-09b3e424450b	1	0	t	2026-01-22 02:59:03.235949
5f8bc171-a6fe-403a-957c-a82f324acb69	96f3d4fb-a9f9-406b-a924-5b7c19f0049c	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	1	0	t	2026-01-22 02:59:05.502388
76c4fae9-f2f2-4538-98e2-6d138bef4c8c	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	3a4c8111-dc57-4572-a8a5-203db202eb98	1	0	t	2026-01-22 13:18:05.281195
56b9f84e-bc61-443a-9595-7b9eb5eb139e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	168c7b7e-bfb2-4184-a4d3-d4b68601b450	1	0	t	2026-01-22 13:18:11.846515
8ddaa8a0-372d-45d5-a079-6261c6d41ded	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	1	0	t	2026-01-22 13:18:19.306923
9e70177e-0c68-45d0-9d7c-7a4c138fb74d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	daedb7c9-433c-4c07-b6f9-09b3e424450b	1	0	t	2026-01-22 13:18:23.623808
cb99e5cf-efe1-4786-bcf7-9825ede22acd	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	290695c5-2ac2-4a1b-8643-9dfd55023f3e	1	0	t	2026-01-22 13:18:33.327905
776c5a86-2768-4a04-be46-f93b7c9acd7f	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	8521e189-1b79-4e23-abda-94b6bb6f4716	1	0	t	2026-01-22 13:18:38.181721
fa3acac5-f59f-4e54-a9cd-952c51e2f867	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	6d0d8474-de61-4c09-b178-00352daae57e	1	0	t	2026-01-22 13:18:40.991349
18ae2e45-59d8-4360-8dc0-d8305c88f793	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	7c73d9dc-5243-48ee-b8a5-1259931ffc19	1	0	t	2026-01-22 13:18:43.527364
38c2d324-497f-49da-88e5-fe6c3578f9db	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	f443de37-c77a-4e37-9300-4594565bb491	1	0	t	2026-01-22 13:18:46.39599
baec9ee2-6826-4cf6-b179-62d76c2cb1dc	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	417fd06a-2c63-4fe1-93a9-75b6b5271260	1	0	t	2026-01-22 13:18:48.93996
aebfdaef-d9a8-4721-935a-6b0e3fd84cc9	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a259e443-4dbe-41f1-8ed0-7a1461818871	1	0	t	2026-01-22 13:18:52.427547
2030f03d-f63e-4c09-9a8c-c6ce55287b6d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	1	0	t	2026-01-22 13:18:55.164985
9eb57013-a139-4bb3-b9b7-082be7876d8f	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	78fb3df8-7668-46e4-8fac-8d0dede32211	1	0	t	2026-01-22 13:18:57.586687
0e36eb23-cfba-4ee9-bc04-e478145c181d	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	1	0	t	2026-01-22 13:18:59.868466
94f14114-71d0-4f7a-b290-88cd6cf60d39	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	8272f515-7fdf-4fc9-977c-46c35f62ff7e	1	0	t	2026-01-22 13:19:02.252187
1bd600df-af43-4530-ad30-667c7716b6f7	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	fcbc7e69-d084-4fb9-9a58-44d474d5f341	1	0	t	2026-01-22 13:19:04.558985
cc11cf2a-8b73-4906-b78f-d78933ed24d9	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	853eb44d-448a-444d-a5ae-b8fb33b8feb3	1	0	t	2026-01-22 13:19:07.282208
f9fb1c77-5328-4b6c-8a4c-b01cb992803e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	1	0	t	2026-01-22 13:19:10.137802
eda3ffd3-74e4-479c-95d3-7d03f8f6077b	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	1	0	t	2026-01-22 13:19:12.931209
97e3ab50-c318-4701-8ca6-e132baf0325e	6f9f0b38-07bb-475c-ab1e-2681496e1ea1	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	1	0	t	2026-01-22 13:19:15.447789
25af9d31-8265-43c5-8e4c-8d6f1dd71f7f	079f1020-0115-4e3d-b78c-5f9ec3e98003	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	1	0	t	2026-01-22 16:26:01.517602
bed0b336-95fe-40cb-8dba-d716a33cbab2	079f1020-0115-4e3d-b78c-5f9ec3e98003	3a4c8111-dc57-4572-a8a5-203db202eb98	1	0	t	2026-01-22 16:26:03.497937
58a9054e-87f0-4806-ae89-c9b657d28432	079f1020-0115-4e3d-b78c-5f9ec3e98003	168c7b7e-bfb2-4184-a4d3-d4b68601b450	1	0	t	2026-01-22 16:26:05.448305
deedd21c-fe3c-4805-884f-956cfe64219f	079f1020-0115-4e3d-b78c-5f9ec3e98003	daedb7c9-433c-4c07-b6f9-09b3e424450b	1	0	t	2026-01-22 16:26:10.470806
67cb39df-dddc-42df-9c33-3113967b2e32	079f1020-0115-4e3d-b78c-5f9ec3e98003	853eb44d-448a-444d-a5ae-b8fb33b8feb3	1	0	t	2026-01-22 16:26:12.629685
02db18a1-b259-491d-abe3-f024219ca465	079f1020-0115-4e3d-b78c-5f9ec3e98003	8521e189-1b79-4e23-abda-94b6bb6f4716	1	0	t	2026-01-22 16:26:14.678518
bbbb0a5c-1e34-4754-ad88-d037f1a5a872	079f1020-0115-4e3d-b78c-5f9ec3e98003	290695c5-2ac2-4a1b-8643-9dfd55023f3e	1	0	t	2026-01-22 16:26:20.438343
8b7f118f-26a6-492e-9323-f2102bc796ce	079f1020-0115-4e3d-b78c-5f9ec3e98003	fcbc7e69-d084-4fb9-9a58-44d474d5f341	1	0	t	2026-01-22 16:26:22.235864
326e85d4-4975-40da-b5d1-77c928dc21c5	079f1020-0115-4e3d-b78c-5f9ec3e98003	a259e443-4dbe-41f1-8ed0-7a1461818871	1	0	t	2026-01-22 16:26:24.131979
64780548-f4a6-456c-85f5-aa0918ea1d3f	6bfe5069-b203-4bd1-b92a-5648543065a3	f443de37-c77a-4e37-9300-4594565bb491	50	0	t	2026-01-22 23:47:20.756529
c295289a-c8cf-48dc-a165-4778fb3c3d49	6bfe5069-b203-4bd1-b92a-5648543065a3	6d0d8474-de61-4c09-b178-00352daae57e	50	0	t	2026-01-22 23:46:55.356167
f78fabbe-d393-40f4-90a3-75401aef8d54	5c07a266-2739-4999-80c4-bcbf67b81466	a259e443-4dbe-41f1-8ed0-7a1461818871	1	0	t	2026-01-23 17:37:35.263339
0ec38244-3d10-4706-b608-73dbaeefabfe	5c07a266-2739-4999-80c4-bcbf67b81466	8521e189-1b79-4e23-abda-94b6bb6f4716	1	0	t	2026-01-23 17:37:40.927352
f31f102c-9e69-4ba7-af91-a3c124e70981	5c07a266-2739-4999-80c4-bcbf67b81466	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	1	0	t	2026-01-23 17:37:43.933026
f80aa311-9fbe-473b-91d4-efbdd14f6c6e	5c07a266-2739-4999-80c4-bcbf67b81466	417fd06a-2c63-4fe1-93a9-75b6b5271260	2	0	t	2026-01-23 17:37:30.327735
2b766283-3c96-4fbd-bc66-7d81e5ee0be1	5c07a266-2739-4999-80c4-bcbf67b81466	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	2	0	t	2026-01-23 17:37:56.445526
377736e9-068c-4f4d-877c-77d6bd538b0f	e77bdc80-958a-4ea9-8167-18b653d265a1	168c7b7e-bfb2-4184-a4d3-d4b68601b450	50	0	t	2026-01-23 00:51:52.430165
f37fa615-57eb-4963-8d8a-0eec428b6819	5c07a266-2739-4999-80c4-bcbf67b81466	168c7b7e-bfb2-4184-a4d3-d4b68601b450	3	0	t	2026-01-23 17:37:52.97933
2a79b49b-736f-479a-86af-a7c1f068d839	6bfe5069-b203-4bd1-b92a-5648543065a3	417fd06a-2c63-4fe1-93a9-75b6b5271260	50	0	t	2026-01-22 23:47:47.21441
a2634ab0-4e01-435a-9c8d-8e288472d029	6bfe5069-b203-4bd1-b92a-5648543065a3	a259e443-4dbe-41f1-8ed0-7a1461818871	50	0	t	2026-01-22 23:47:55.935775
a133b662-169c-41fa-bb61-4bde51596a85	e77bdc80-958a-4ea9-8167-18b653d265a1	f443de37-c77a-4e37-9300-4594565bb491	50	0	t	2026-01-23 00:51:39.139485
20e93102-c781-4652-b44f-c72a604a7662	e77bdc80-958a-4ea9-8167-18b653d265a1	8521e189-1b79-4e23-abda-94b6bb6f4716	50	0	t	2026-01-23 00:51:49.216269
cf2c520b-f3dd-427a-898e-0afe6fd2e9c1	e77bdc80-958a-4ea9-8167-18b653d265a1	6d0d8474-de61-4c09-b178-00352daae57e	50	0	t	2026-01-23 00:51:33.329626
33e4b7bc-361c-4e7d-a723-b886c3230d00	e77bdc80-958a-4ea9-8167-18b653d265a1	7c73d9dc-5243-48ee-b8a5-1259931ffc19	50	0	t	2026-01-23 00:51:36.329398
ea508cc8-9ff1-4303-935e-71f405a0097c	e77bdc80-958a-4ea9-8167-18b653d265a1	417fd06a-2c63-4fe1-93a9-75b6b5271260	50	0	t	2026-01-23 00:51:42.33932
fb2184c1-5ff7-4840-a072-a5d873423cf1	6bfe5069-b203-4bd1-b92a-5648543065a3	3a4c8111-dc57-4572-a8a5-203db202eb98	50	0	t	2026-01-23 00:15:56.149738
12aea9e7-6600-45c3-816a-750da70b4efb	6bfe5069-b203-4bd1-b92a-5648543065a3	7c73d9dc-5243-48ee-b8a5-1259931ffc19	50	0	t	2026-01-22 23:49:58.732752
f6a2f9b8-57ff-4caa-a54e-9ba929411bd3	6bfe5069-b203-4bd1-b92a-5648543065a3	8521e189-1b79-4e23-abda-94b6bb6f4716	50	0	t	2026-01-22 23:52:12.2355
96905b61-4246-4db2-a102-b41e73207187	6bfe5069-b203-4bd1-b92a-5648543065a3	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	50	0	t	2026-01-22 23:50:27.62159
1de0b063-c0b0-4e10-b4c2-964078a559c1	6bfe5069-b203-4bd1-b92a-5648543065a3	853eb44d-448a-444d-a5ae-b8fb33b8feb3	50	0	t	2026-01-22 23:52:33.133298
d20962ec-c190-4acb-9e42-5c2ef9ab7fe7	6bfe5069-b203-4bd1-b92a-5648543065a3	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	50	0	t	2026-01-22 23:47:06.337413
4019726c-12ea-4f73-9512-5916900cd5b1	6bfe5069-b203-4bd1-b92a-5648543065a3	fcbc7e69-d084-4fb9-9a58-44d474d5f341	50	0	t	2026-01-22 23:50:13.336291
5845ba13-9374-4952-beb5-7a70a7d46972	e77bdc80-958a-4ea9-8167-18b653d265a1	a259e443-4dbe-41f1-8ed0-7a1461818871	50	0	t	2026-01-23 00:51:46.331084
8e68f56e-3502-43cf-9979-15fabf7d0e4b	6bfe5069-b203-4bd1-b92a-5648543065a3	daedb7c9-433c-4c07-b6f9-09b3e424450b	50	0	t	2026-01-22 23:50:48.353559
e6c85365-f3c5-4f53-99a4-a81fa8565c7f	6bfe5069-b203-4bd1-b92a-5648543065a3	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	50	0	t	2026-01-22 23:50:22.386369
480eef20-a1c9-42c1-ad30-440d7f6a4de4	6bfe5069-b203-4bd1-b92a-5648543065a3	290695c5-2ac2-4a1b-8643-9dfd55023f3e	50	0	t	2026-01-22 23:50:39.635253
1ea9edae-3a10-46e5-b941-2b256f3b8db4	6bfe5069-b203-4bd1-b92a-5648543065a3	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	50	0	t	2026-01-22 23:50:32.141449
b2fbf9a1-228d-47c4-af08-0e1ebd16146a	6bfe5069-b203-4bd1-b92a-5648543065a3	78fb3df8-7668-46e4-8fac-8d0dede32211	50	0	t	2026-01-22 23:50:02.603712
a90d2b24-6845-44fb-a831-e342e7b09405	6bfe5069-b203-4bd1-b92a-5648543065a3	8272f515-7fdf-4fc9-977c-46c35f62ff7e	50	0	t	2026-01-22 23:50:09.934203
2d0db02e-307d-47a3-ad2b-c07b76c01663	5c07a266-2739-4999-80c4-bcbf67b81466	8272f515-7fdf-4fc9-977c-46c35f62ff7e	1	0	t	2026-01-23 17:38:42.70741
6e18fb9c-390a-44d7-9477-f577814bcf24	5c07a266-2739-4999-80c4-bcbf67b81466	7c73d9dc-5243-48ee-b8a5-1259931ffc19	1	0	t	2026-01-23 17:39:03.015074
99ced020-edd5-4ec1-aa47-650c500538fc	5c07a266-2739-4999-80c4-bcbf67b81466	daedb7c9-433c-4c07-b6f9-09b3e424450b	2	0	t	2026-01-23 17:38:31.710454
559aaffc-82fc-4a92-b46b-72ecc498bba2	e0105e0b-ef87-4ef1-b511-29aa73b054e0	417fd06a-2c63-4fe1-93a9-75b6b5271260	16	0	t	2026-03-01 23:24:17.712819
0f4bf5ad-8dfe-4183-877f-6971c79ad235	e0105e0b-ef87-4ef1-b511-29aa73b054e0	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	14	0	t	2026-03-01 23:24:50.519276
e6430a77-6caa-4441-8af1-7a71dc66a69a	e0105e0b-ef87-4ef1-b511-29aa73b054e0	78fb3df8-7668-46e4-8fac-8d0dede32211	10	0	t	2026-03-02 00:50:39.314818
857022f2-1025-4bc6-99be-c0b367a241c6	e0105e0b-ef87-4ef1-b511-29aa73b054e0	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	8	0	t	2026-03-02 00:50:50.715725
917a1b5f-b061-438b-ae02-9e0fc0d9c5ef	e0105e0b-ef87-4ef1-b511-29aa73b054e0	3a4c8111-dc57-4572-a8a5-203db202eb98	3	0	t	2026-03-02 02:40:28.422683
9af36e36-2e3e-45a9-b34c-21e24fcd4085	e0105e0b-ef87-4ef1-b511-29aa73b054e0	8272f515-7fdf-4fc9-977c-46c35f62ff7e	10	0	t	2026-03-02 00:50:53.612969
92d88d3e-ea09-4e07-976e-cd60e2efdeb6	2bfc8dfe-5c21-403a-bd72-079278cc0743	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	50	0	t	2026-02-24 01:58:29.819293
62f76374-cb17-48fa-9e90-b2b467e7d3df	5c07a266-2739-4999-80c4-bcbf67b81466	3a4c8111-dc57-4572-a8a5-203db202eb98	26	0	t	2026-01-23 17:38:02.131612
f51f6a06-685c-44a8-94dd-aa1881e61289	2bfc8dfe-5c21-403a-bd72-079278cc0743	6d0d8474-de61-4c09-b178-00352daae57e	50	0	t	2026-02-24 01:57:23.417038
41e8de2e-65f9-47b6-b4fc-c53c5d26989c	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a259e443-4dbe-41f1-8ed0-7a1461818871	50	0	t	2026-02-24 01:30:21.849419
a2629f23-e4db-43ec-82a8-b037dbec79c3	2bfc8dfe-5c21-403a-bd72-079278cc0743	3a4c8111-dc57-4572-a8a5-203db202eb98	50	0	t	2026-02-24 01:58:20.717133
45e6c14e-f23e-4dc4-9497-99e2d4eb4a94	2bfc8dfe-5c21-403a-bd72-079278cc0743	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	50	0	t	2026-02-24 01:58:35.216546
fdd5c808-31b7-47d7-9289-6130d65132a2	2bfc8dfe-5c21-403a-bd72-079278cc0743	168c7b7e-bfb2-4184-a4d3-d4b68601b450	50	0	t	2026-02-24 01:57:44.715588
e3babfda-51a4-421c-a143-00fc19a4bb12	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	78fb3df8-7668-46e4-8fac-8d0dede32211	50	0	t	2026-02-24 01:32:01.618036
b46a91f6-008e-49ea-a4a0-84882860ecfe	5c07a266-2739-4999-80c4-bcbf67b81466	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	1	0	t	2026-01-23 17:38:34.031289
17c714d8-9f0c-4389-bbbb-c0edf5e6d8c8	5c07a266-2739-4999-80c4-bcbf67b81466	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	1	0	t	2026-01-23 17:38:39.39905
931e6136-43fb-4b2b-a7b4-afe612d7cb8f	5c07a266-2739-4999-80c4-bcbf67b81466	853eb44d-448a-444d-a5ae-b8fb33b8feb3	2	0	t	2026-01-23 17:38:06.909607
ea9234ee-8432-4454-b0aa-921a26412503	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	3a4c8111-dc57-4572-a8a5-203db202eb98	50	0	t	2026-02-24 01:32:13.517851
8ce5eb53-9633-4f19-bd7d-a33cf54b80ab	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	8	0	t	2026-03-01 23:25:15.519526
630990d1-429b-4c27-8edc-a9576ca00a4a	e0105e0b-ef87-4ef1-b511-29aa73b054e0	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	9	0	t	2026-03-01 23:24:38.312916
638c3573-6acc-4226-aff7-de8230095b53	e0105e0b-ef87-4ef1-b511-29aa73b054e0	a259e443-4dbe-41f1-8ed0-7a1461818871	5	0	t	2026-03-02 00:51:07.576603
7d6c3218-d59e-4cec-9a10-44ec30f72b90	e0105e0b-ef87-4ef1-b511-29aa73b054e0	daedb7c9-433c-4c07-b6f9-09b3e424450b	3	0	t	2026-03-02 02:42:49.317885
09b9d23b-b23e-4fe5-a51d-84b795955f73	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	fcbc7e69-d084-4fb9-9a58-44d474d5f341	50	0	t	2026-02-24 01:32:07.653417
7ce064c4-5de8-4868-b0a7-adf2979f4312	2bfc8dfe-5c21-403a-bd72-079278cc0743	fcbc7e69-d084-4fb9-9a58-44d474d5f341	50	0	t	2026-02-24 01:58:26.854269
aaa5e666-7a1c-4a70-b348-1dec85924342	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	50	0	t	2026-02-24 01:32:22.321145
bd0515f1-cd03-4805-9a76-15a96970d29e	2bfc8dfe-5c21-403a-bd72-079278cc0743	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	50	0	t	2026-02-24 01:58:18.216883
8ef94651-f742-438f-939a-cc72bc8c415d	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	8272f515-7fdf-4fc9-977c-46c35f62ff7e	50	0	t	2026-02-24 01:32:04.616067
9a92d562-deb8-4436-a1db-ff6549ae9e7c	2bfc8dfe-5c21-403a-bd72-079278cc0743	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	50	0	t	2026-02-24 01:57:54.968273
106c0f3e-c0ac-4922-96dd-d014f8f394aa	2bfc8dfe-5c21-403a-bd72-079278cc0743	853eb44d-448a-444d-a5ae-b8fb33b8feb3	50	0	t	2026-02-24 01:58:23.317333
a6e1061a-4a1b-4ff3-9d2f-53c72424dbfc	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	50	0	t	2026-02-24 01:30:37.668965
c8ffee7f-7252-48af-940d-846dd5a76fac	2bfc8dfe-5c21-403a-bd72-079278cc0743	7c73d9dc-5243-48ee-b8a5-1259931ffc19	50	0	t	2026-02-24 01:57:27.329862
9c67f367-c4ab-4010-98e8-4b9d304f9f92	2bfc8dfe-5c21-403a-bd72-079278cc0743	daedb7c9-433c-4c07-b6f9-09b3e424450b	50	0	t	2026-02-24 01:58:15.643127
b44b451c-c9bd-46c4-be4c-9b5baf4dd148	5c07a266-2739-4999-80c4-bcbf67b81466	f443de37-c77a-4e37-9300-4594565bb491	1	0	t	2026-01-23 17:38:48.924693
78016b4e-8291-4afd-97d8-160fcd08c240	5c07a266-2739-4999-80c4-bcbf67b81466	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	1	0	t	2026-01-23 17:38:58.278119
6f1c808b-5249-4254-bc86-0cab4bc44657	5c07a266-2739-4999-80c4-bcbf67b81466	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	1	0	t	2026-01-23 17:39:00.815145
5ce72958-38d9-4a66-aef8-a736acd0afc0	5c07a266-2739-4999-80c4-bcbf67b81466	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	3	0	t	2026-01-23 17:38:26.255977
d1644617-614d-4c6b-8726-10fec94ca2b3	5c07a266-2739-4999-80c4-bcbf67b81466	fcbc7e69-d084-4fb9-9a58-44d474d5f341	2	0	t	2026-01-23 17:38:12.152176
0ba5ecf4-722a-4637-b19c-7ffe03d50f59	e0105e0b-ef87-4ef1-b511-29aa73b054e0	6d0d8474-de61-4c09-b178-00352daae57e	11	0	t	2026-03-01 23:24:10.116261
125b1358-833e-4063-b5df-692ce6db498f	e0105e0b-ef87-4ef1-b511-29aa73b054e0	853eb44d-448a-444d-a5ae-b8fb33b8feb3	2	0	t	2026-03-02 01:30:06.714841
bfb12b49-8293-4861-bd11-5ccc0b161103	e0105e0b-ef87-4ef1-b511-29aa73b054e0	168c7b7e-bfb2-4184-a4d3-d4b68601b450	2	0	t	2026-03-02 02:40:24.913092
1827e3fb-3253-40ad-a50f-53e044a61fe0	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	50	0	t	2026-02-24 01:32:16.516073
8379422f-77d2-491a-a6a6-e92f9120cd9a	e0105e0b-ef87-4ef1-b511-29aa73b054e0	f443de37-c77a-4e37-9300-4594565bb491	5	0	t	2026-03-02 00:50:32.814632
ad56883b-a905-4f6a-8852-de62193f48c9	2bfc8dfe-5c21-403a-bd72-079278cc0743	78fb3df8-7668-46e4-8fac-8d0dede32211	50	0	t	2026-02-24 01:58:00.616826
12e42039-3927-44ac-997c-4d4176c53ba3	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	50	0	t	2026-02-24 01:32:19.16008
92840f06-9c2f-4464-b305-26512da679d6	2bfc8dfe-5c21-403a-bd72-079278cc0743	290695c5-2ac2-4a1b-8643-9dfd55023f3e	50	0	t	2026-02-24 01:58:32.617474
f5162bbb-a1db-410b-8f09-65d81f177c89	2bfc8dfe-5c21-403a-bd72-079278cc0743	8272f515-7fdf-4fc9-977c-46c35f62ff7e	50	0	t	2026-02-24 01:58:06.748195
1afe2eb8-5bd7-4d92-bed0-53f5d4e5e51f	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	50	0	t	2026-02-24 01:30:41.92193
31f05ee6-f99d-4039-8cfb-fe71ab1d85cb	2bfc8dfe-5c21-403a-bd72-079278cc0743	f443de37-c77a-4e37-9300-4594565bb491	50	0	t	2026-02-24 01:57:30.616431
6d8b4af9-dcee-47ef-8923-c05aa5e386ca	5c07a266-2739-4999-80c4-bcbf67b81466	78fb3df8-7668-46e4-8fac-8d0dede32211	1	0	t	2026-01-23 17:38:45.105188
fb54908c-bc20-4d4a-8d2e-7c56cdcb6829	e0105e0b-ef87-4ef1-b511-29aa73b054e0	8521e189-1b79-4e23-abda-94b6bb6f4716	2	0	t	2026-03-02 00:50:36.414275
44b0a779-5331-4d22-8e89-3f675b0eab42	e0105e0b-ef87-4ef1-b511-29aa73b054e0	7c73d9dc-5243-48ee-b8a5-1259931ffc19	5	0	t	2026-03-02 00:50:23.414953
8f2c55ed-274b-436d-be83-7413b181cbc3	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	50	0	t	2026-02-24 01:32:31.278941
9a0f8c05-2ef2-44e3-a18a-843e23176075	e0105e0b-ef87-4ef1-b511-29aa73b054e0	fcbc7e69-d084-4fb9-9a58-44d474d5f341	3	0	t	2026-03-02 00:50:43.614392
eabbf05a-4bd9-49de-a888-b9c5f3797430	e0105e0b-ef87-4ef1-b511-29aa73b054e0	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	1	0	t	2026-03-02 03:55:00.2845
3147a73c-1232-4203-b2bb-f4562567a798	e0105e0b-ef87-4ef1-b511-29aa73b054e0	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	5	0	t	2026-03-02 01:30:09.807724
8f032e68-d5ad-4ebd-b9ed-b8e531782312	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	290695c5-2ac2-4a1b-8643-9dfd55023f3e	50	0	t	2026-02-24 01:32:24.620996
eb3f6a1b-7b32-4997-86a0-2bb7cefbb2d8	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	8521e189-1b79-4e23-abda-94b6bb6f4716	50	0	t	2026-02-24 01:31:02.215267
d3eac8de-e572-45cf-ad23-7aa91b838864	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	daedb7c9-433c-4c07-b6f9-09b3e424450b	50	0	t	2026-02-24 01:32:26.769268
9ed6661e-1e58-4f7d-9ae8-4d1d659c057b	2bfc8dfe-5c21-403a-bd72-079278cc0743	417fd06a-2c63-4fe1-93a9-75b6b5271260	50	0	t	2026-02-24 01:57:36.954214
6905c18d-a119-40c9-bc2c-ff70c33227c1	5c07a266-2739-4999-80c4-bcbf67b81466	290695c5-2ac2-4a1b-8643-9dfd55023f3e	1	0	t	2026-01-23 17:38:51.443034
702e9c9e-5708-44a4-93d1-68e13ce9a65b	5c07a266-2739-4999-80c4-bcbf67b81466	6d0d8474-de61-4c09-b178-00352daae57e	2	0	t	2026-01-23 17:37:22.868196
315ea5b0-c168-4eaa-9832-7601ca65fcfd	e77bdc80-958a-4ea9-8167-18b653d265a1	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	50	0	t	2026-01-26 01:57:15.131825
a8c309c2-05d3-4116-a750-19bf1cc95cd2	e77bdc80-958a-4ea9-8167-18b653d265a1	daedb7c9-433c-4c07-b6f9-09b3e424450b	50	0	t	2026-01-26 01:57:42.731552
62d36474-90fb-4a72-b250-e1defff4dfe4	6bfe5069-b203-4bd1-b92a-5648543065a3	168c7b7e-bfb2-4184-a4d3-d4b68601b450	50	0	t	2026-01-23 22:09:47.383169
4d266cb7-ed76-4ef6-a7cf-6010c82af91e	e77bdc80-958a-4ea9-8167-18b653d265a1	fcbc7e69-d084-4fb9-9a58-44d474d5f341	50	0	t	2026-01-26 01:57:21.086492
3016f9df-5a83-4d8a-a65a-fa77757eaa4d	2bfc8dfe-5c21-403a-bd72-079278cc0743	8521e189-1b79-4e23-abda-94b6bb6f4716	50	0	t	2026-02-24 01:57:41.81595
6aaba389-7e05-4e09-951e-e63d76a12e27	e77bdc80-958a-4ea9-8167-18b653d265a1	78fb3df8-7668-46e4-8fac-8d0dede32211	50	0	t	2026-01-26 01:57:12.233262
599b7bdc-9c08-4dc4-bff0-84a4f720416d	e0105e0b-ef87-4ef1-b511-29aa73b054e0	7c73d9dc-5243-48ee-b8a5-1259931ffc19	4	0	t	2026-03-02 00:50:24.11293
d243d09c-bc31-4a18-8d00-8b460572159a	e77bdc80-958a-4ea9-8167-18b653d265a1	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	50	0	t	2026-01-26 01:57:08.530851
2ada9414-297e-4062-8802-bbe6d54413e1	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	6d0d8474-de61-4c09-b178-00352daae57e	50	0	t	2026-01-23 20:51:10.526087
378438af-76a8-4edd-b9f5-0c1a5cbb5084	2bfc8dfe-5c21-403a-bd72-079278cc0743	43dc7dbd-2960-48ce-94c7-b3e27a6d9e3e	50	0	t	2026-02-24 01:57:57.90492
bac9644d-ec29-406a-a19e-0c9468857195	e77bdc80-958a-4ea9-8167-18b653d265a1	290695c5-2ac2-4a1b-8643-9dfd55023f3e	50	0	t	2026-01-26 01:57:39.749551
1a02dede-840b-433f-a522-6b4f2aeafc10	e0105e0b-ef87-4ef1-b511-29aa73b054e0	290695c5-2ac2-4a1b-8643-9dfd55023f3e	5	0	t	2026-03-02 02:29:48.016087
f63ceb10-b399-4155-8ca3-820975673ec4	2bfc8dfe-5c21-403a-bd72-079278cc0743	a259e443-4dbe-41f1-8ed0-7a1461818871	50	0	t	2026-02-24 01:57:39.348593
7b10d876-dccc-45ab-b68a-3e0880cf149e	e77bdc80-958a-4ea9-8167-18b653d265a1	853eb44d-448a-444d-a5ae-b8fb33b8feb3	50	0	t	2026-01-26 01:57:23.830826
453adb48-af7c-48cf-9c52-0cb0bb8c91df	2bfc8dfe-5c21-403a-bd72-079278cc0743	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	50	0	t	2026-02-24 01:58:03.00006
e140923e-82bc-4206-b80a-2b326dbd6a2d	e77bdc80-958a-4ea9-8167-18b653d265a1	fb147dcf-6721-4c71-aa09-8f4d5c5510d3	50	0	t	2026-01-26 01:57:29.657429
3f905d38-1242-43d3-9078-528a81c5557d	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	168c7b7e-bfb2-4184-a4d3-d4b68601b450	50	0	t	2026-02-24 01:31:56.902246
d6d7d0b2-a56c-42fd-bf17-14081db4588a	e77bdc80-958a-4ea9-8167-18b653d265a1	8272f515-7fdf-4fc9-977c-46c35f62ff7e	50	0	t	2026-01-26 01:57:17.547409
5a99b5db-009c-4dbe-b833-c34bd44c4ef9	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	7c73d9dc-5243-48ee-b8a5-1259931ffc19	50	0	t	2026-01-23 20:51:19.464809
cbd3f89c-fcf8-465b-9eab-ad77851788b5	e77bdc80-958a-4ea9-8167-18b653d265a1	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	50	0	t	2026-01-26 01:57:45.131503
20776ded-8d88-47b0-a25a-53dc4d26e0b2	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	f443de37-c77a-4e37-9300-4594565bb491	50	0	t	2026-01-23 20:51:25.134098
122c83f9-c077-4eb5-b3a6-45b4069051e7	e77bdc80-958a-4ea9-8167-18b653d265a1	b15f00e4-8e4a-4a76-a41b-fdaa6f9f4744	50	0	t	2026-01-26 01:57:32.929537
c7d31756-6f8a-46d4-aa52-a243bf73118e	e77bdc80-958a-4ea9-8167-18b653d265a1	3a4c8111-dc57-4572-a8a5-203db202eb98	50	0	t	2026-01-26 01:57:26.901944
a826bb8a-df60-4570-b3e6-92f5854e7db3	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	417fd06a-2c63-4fe1-93a9-75b6b5271260	50	0	t	2026-02-24 01:30:08.014681
21b40fd4-5030-4efa-8308-151070b82229	e77bdc80-958a-4ea9-8167-18b653d265a1	5e5e45c6-24bb-4852-8cfd-fca37a6706e7	50	0	t	2026-01-26 01:57:36.397355
3f1660d0-922d-454a-ae0a-9e164af9d7bb	6bfe5069-b203-4bd1-b92a-5648543065a3	88ef4ec3-f586-42ca-a6e4-15567ff42c8b	50	0	t	2026-01-23 22:09:44.233538
93806d55-f995-4a5d-bd82-6eabd8697da0	6bfe5069-b203-4bd1-b92a-5648543065a3	a3d6a6a2-8380-4720-b4ac-b69ea5d750d1	50	0	t	2026-01-22 23:50:06.44495
746e01c4-c1c6-4f6f-9a2d-9b8cf7107e9b	0989fb04-fbc8-409b-b6a3-a76ad92bf8db	853eb44d-448a-444d-a5ae-b8fb33b8feb3	50	0	t	2026-02-24 01:32:10.515381
\.


--
-- TOC entry 3990 (class 0 OID 0)
-- Dependencies: 235
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);


--
-- TOC entry 3991 (class 0 OID 0)
-- Dependencies: 237
-- Name: building_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.building_requirements_id_seq', 6, true);


--
-- TOC entry 3992 (class 0 OID 0)
-- Dependencies: 239
-- Name: building_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.building_types_id_seq', 13, true);


--
-- TOC entry 3993 (class 0 OID 0)
-- Dependencies: 246
-- Name: defense_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.defense_requirements_id_seq', 17, true);


--
-- TOC entry 3994 (class 0 OID 0)
-- Dependencies: 248
-- Name: defense_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.defense_types_id_seq', 10, true);


--
-- TOC entry 3995 (class 0 OID 0)
-- Dependencies: 262
-- Name: rapid_fire_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.rapid_fire_rules_id_seq', 6, true);


--
-- TOC entry 3996 (class 0 OID 0)
-- Dependencies: 264
-- Name: resource_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.resource_slots_id_seq', 128, true);


--
-- TOC entry 3997 (class 0 OID 0)
-- Dependencies: 268
-- Name: server_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.server_config_id_seq', 169, true);


--
-- TOC entry 3998 (class 0 OID 0)
-- Dependencies: 271
-- Name: ship_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.ship_requirements_id_seq', 29, true);


--
-- TOC entry 3999 (class 0 OID 0)
-- Dependencies: 273
-- Name: ship_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.ship_types_id_seq', 11, true);


--
-- TOC entry 4000 (class 0 OID 0)
-- Dependencies: 275
-- Name: technologies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.technologies_id_seq', 15, true);


--
-- TOC entry 4001 (class 0 OID 0)
-- Dependencies: 277
-- Name: technology_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spacedb_ow88_user
--

SELECT pg_catalog.setval('public.technology_requirements_id_seq', 30, true);


--
-- TOC entry 3607 (class 2606 OID 19053)
-- Name: achievement achievement_achievement_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.achievement
    ADD CONSTRAINT achievement_achievement_key_key UNIQUE (achievement_key);


--
-- TOC entry 3609 (class 2606 OID 19055)
-- Name: achievement achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.achievement
    ADD CONSTRAINT achievement_pkey PRIMARY KEY (id);


--
-- TOC entry 3620 (class 2606 OID 19057)
-- Name: alliance_invitation alliance_invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.alliance_invitation
    ADD CONSTRAINT alliance_invitation_pkey PRIMARY KEY (id);


--
-- TOC entry 3625 (class 2606 OID 19059)
-- Name: alliance_member alliance_member_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.alliance_member
    ADD CONSTRAINT alliance_member_pkey PRIMARY KEY (id);


--
-- TOC entry 3612 (class 2606 OID 19061)
-- Name: alliance alliance_name_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.alliance
    ADD CONSTRAINT alliance_name_key UNIQUE (name);


--
-- TOC entry 3614 (class 2606 OID 19063)
-- Name: alliance alliance_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.alliance
    ADD CONSTRAINT alliance_pkey PRIMARY KEY (id);


--
-- TOC entry 3616 (class 2606 OID 19065)
-- Name: alliance alliance_tag_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.alliance
    ADD CONSTRAINT alliance_tag_key UNIQUE (tag);


--
-- TOC entry 3629 (class 2606 OID 19067)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 3632 (class 2606 OID 19069)
-- Name: building_requirements building_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_requirements
    ADD CONSTRAINT building_requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 3634 (class 2606 OID 19071)
-- Name: building_types building_types_building_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_types
    ADD CONSTRAINT building_types_building_key_key UNIQUE (building_key);


--
-- TOC entry 3636 (class 2606 OID 19073)
-- Name: building_types building_types_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_types
    ADD CONSTRAINT building_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3638 (class 2606 OID 19075)
-- Name: casus_belli casus_belli_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.casus_belli
    ADD CONSTRAINT casus_belli_pkey PRIMARY KEY (id);


--
-- TOC entry 3643 (class 2606 OID 19077)
-- Name: combat_log combat_log_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.combat_log
    ADD CONSTRAINT combat_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3645 (class 2606 OID 19079)
-- Name: construction_queue construction_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.construction_queue
    ADD CONSTRAINT construction_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 3647 (class 2606 OID 19081)
-- Name: conversation conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.conversation
    ADD CONSTRAINT conversation_pkey PRIMARY KEY (id);


--
-- TOC entry 3649 (class 2606 OID 19083)
-- Name: daily_mission daily_mission_mission_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.daily_mission
    ADD CONSTRAINT daily_mission_mission_key_key UNIQUE (mission_key);


--
-- TOC entry 3651 (class 2606 OID 19085)
-- Name: daily_mission daily_mission_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.daily_mission
    ADD CONSTRAINT daily_mission_pkey PRIMARY KEY (id);


--
-- TOC entry 3653 (class 2606 OID 19087)
-- Name: defense_requirements defense_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_requirements
    ADD CONSTRAINT defense_requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 3655 (class 2606 OID 19089)
-- Name: defense_types defense_types_defense_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_types
    ADD CONSTRAINT defense_types_defense_key_key UNIQUE (defense_key);


--
-- TOC entry 3657 (class 2606 OID 19091)
-- Name: defense_types defense_types_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_types
    ADD CONSTRAINT defense_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3659 (class 2606 OID 19093)
-- Name: fleet_mission fleet_mission_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.fleet_mission
    ADD CONSTRAINT fleet_mission_pkey PRIMARY KEY (id);


--
-- TOC entry 3745 (class 2606 OID 19365)
-- Name: global_chat_message global_chat_message_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.global_chat_message
    ADD CONSTRAINT global_chat_message_pkey PRIMARY KEY (id);


--
-- TOC entry 3661 (class 2606 OID 19095)
-- Name: login_streak login_streak_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.login_streak
    ADD CONSTRAINT login_streak_pkey PRIMARY KEY (id);


--
-- TOC entry 3663 (class 2606 OID 19097)
-- Name: login_streak login_streak_user_id_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.login_streak
    ADD CONSTRAINT login_streak_user_id_key UNIQUE (user_id);


--
-- TOC entry 3668 (class 2606 OID 19099)
-- Name: market_listing market_listing_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.market_listing
    ADD CONSTRAINT market_listing_pkey PRIMARY KEY (id);


--
-- TOC entry 3671 (class 2606 OID 19101)
-- Name: market_price_history market_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.market_price_history
    ADD CONSTRAINT market_price_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3676 (class 2606 OID 19103)
-- Name: market_transaction market_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.market_transaction
    ADD CONSTRAINT market_transaction_pkey PRIMARY KEY (id);


--
-- TOC entry 3678 (class 2606 OID 19105)
-- Name: message message_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);


--
-- TOC entry 3680 (class 2606 OID 19107)
-- Name: officer_template officer_template_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.officer_template
    ADD CONSTRAINT officer_template_pkey PRIMARY KEY (id);


--
-- TOC entry 3684 (class 2606 OID 19109)
-- Name: planet_buildings planet_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_buildings
    ADD CONSTRAINT planet_buildings_pkey PRIMARY KEY (planet_id, building_type_id);


--
-- TOC entry 3686 (class 2606 OID 19111)
-- Name: planet_defenses planet_defenses_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_defenses
    ADD CONSTRAINT planet_defenses_pkey PRIMARY KEY (planet_id, defense_type_id);


--
-- TOC entry 3682 (class 2606 OID 19113)
-- Name: planet planet_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet
    ADD CONSTRAINT planet_pkey PRIMARY KEY (id);


--
-- TOC entry 3689 (class 2606 OID 19115)
-- Name: planet_ships planet_ships_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_ships
    ADD CONSTRAINT planet_ships_pkey PRIMARY KEY (planet_id, ship_type_id);


--
-- TOC entry 3692 (class 2606 OID 19117)
-- Name: planet_technologies planet_technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_technologies
    ADD CONSTRAINT planet_technologies_pkey PRIMARY KEY (planet_id, tech_id);


--
-- TOC entry 3694 (class 2606 OID 19119)
-- Name: rapid_fire_rules rapid_fire_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.rapid_fire_rules
    ADD CONSTRAINT rapid_fire_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 3697 (class 2606 OID 19121)
-- Name: resource_slots resource_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.resource_slots
    ADD CONSTRAINT resource_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 3702 (class 2606 OID 19123)
-- Name: sabotage_effect sabotage_effect_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.sabotage_effect
    ADD CONSTRAINT sabotage_effect_pkey PRIMARY KEY (id);


--
-- TOC entry 3704 (class 2606 OID 19125)
-- Name: seaql_migrations seaql_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.seaql_migrations
    ADD CONSTRAINT seaql_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 3706 (class 2606 OID 19127)
-- Name: server_config server_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.server_config
    ADD CONSTRAINT server_config_config_key_key UNIQUE (config_key);


--
-- TOC entry 3708 (class 2606 OID 19129)
-- Name: server_config server_config_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.server_config
    ADD CONSTRAINT server_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3710 (class 2606 OID 19131)
-- Name: server_resource_stats server_resource_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.server_resource_stats
    ADD CONSTRAINT server_resource_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 3713 (class 2606 OID 19133)
-- Name: ship_requirements ship_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_requirements
    ADD CONSTRAINT ship_requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 3715 (class 2606 OID 19135)
-- Name: ship_types ship_types_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_types
    ADD CONSTRAINT ship_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3717 (class 2606 OID 19137)
-- Name: ship_types ship_types_ship_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_types
    ADD CONSTRAINT ship_types_ship_key_key UNIQUE (ship_key);


--
-- TOC entry 3719 (class 2606 OID 19139)
-- Name: technologies technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technologies
    ADD CONSTRAINT technologies_pkey PRIMARY KEY (id);


--
-- TOC entry 3721 (class 2606 OID 19141)
-- Name: technologies technologies_tech_key_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technologies
    ADD CONSTRAINT technologies_tech_key_key UNIQUE (tech_key);


--
-- TOC entry 3724 (class 2606 OID 19143)
-- Name: technology_requirements technology_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technology_requirements
    ADD CONSTRAINT technology_requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 3726 (class 2606 OID 19145)
-- Name: transport_log transport_log_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.transport_log
    ADD CONSTRAINT transport_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3736 (class 2606 OID 19147)
-- Name: user_achievement user_achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.user_achievement
    ADD CONSTRAINT user_achievement_pkey PRIMARY KEY (id);


--
-- TOC entry 3739 (class 2606 OID 19149)
-- Name: user_daily_mission user_daily_mission_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.user_daily_mission
    ADD CONSTRAINT user_daily_mission_pkey PRIMARY KEY (id);


--
-- TOC entry 3728 (class 2606 OID 19151)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- TOC entry 3743 (class 2606 OID 19153)
-- Name: user_officer user_officer_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.user_officer
    ADD CONSTRAINT user_officer_pkey PRIMARY KEY (id);


--
-- TOC entry 3730 (class 2606 OID 19155)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3732 (class 2606 OID 19157)
-- Name: user user_username_key; Type: CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_username_key UNIQUE (username);


--
-- TOC entry 3610 (class 1259 OID 19158)
-- Name: idx_achievement_category; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_achievement_category ON public.achievement USING btree (category);


--
-- TOC entry 3621 (class 1259 OID 19159)
-- Name: idx_alliance_invitation_alliance; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_invitation_alliance ON public.alliance_invitation USING btree (alliance_id);


--
-- TOC entry 3622 (class 1259 OID 19160)
-- Name: idx_alliance_invitation_status; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_invitation_status ON public.alliance_invitation USING btree (status);


--
-- TOC entry 3623 (class 1259 OID 19161)
-- Name: idx_alliance_invitation_user; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_invitation_user ON public.alliance_invitation USING btree (user_id);


--
-- TOC entry 3626 (class 1259 OID 19162)
-- Name: idx_alliance_member_alliance; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_member_alliance ON public.alliance_member USING btree (alliance_id);


--
-- TOC entry 3627 (class 1259 OID 19163)
-- Name: idx_alliance_member_user_unique; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE UNIQUE INDEX idx_alliance_member_user_unique ON public.alliance_member USING btree (user_id);


--
-- TOC entry 3617 (class 1259 OID 19164)
-- Name: idx_alliance_name; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_name ON public.alliance USING btree (name);


--
-- TOC entry 3618 (class 1259 OID 19165)
-- Name: idx_alliance_score; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_alliance_score ON public.alliance USING btree (total_score);


--
-- TOC entry 3630 (class 1259 OID 19166)
-- Name: idx_announcements_is_active; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_announcements_is_active ON public.announcements USING btree (is_active);


--
-- TOC entry 3639 (class 1259 OID 19167)
-- Name: idx_casus_belli_aggressor; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_casus_belli_aggressor ON public.casus_belli USING btree (aggressor_user_id);


--
-- TOC entry 3640 (class 1259 OID 19168)
-- Name: idx_casus_belli_expires; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_casus_belli_expires ON public.casus_belli USING btree (expires_at);


--
-- TOC entry 3641 (class 1259 OID 19169)
-- Name: idx_casus_belli_victim; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_casus_belli_victim ON public.casus_belli USING btree (victim_user_id);


--
-- TOC entry 3746 (class 1259 OID 19366)
-- Name: idx_global_chat_message_created_at; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_global_chat_message_created_at ON public.global_chat_message USING btree (created_at);


--
-- TOC entry 3664 (class 1259 OID 19170)
-- Name: idx_market_listing_expires; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_listing_expires ON public.market_listing USING btree (expires_at);


--
-- TOC entry 3665 (class 1259 OID 19171)
-- Name: idx_market_listing_resource_active; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_listing_resource_active ON public.market_listing USING btree (resource_type, is_active);


--
-- TOC entry 3666 (class 1259 OID 19172)
-- Name: idx_market_listing_seller_planet; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_listing_seller_planet ON public.market_listing USING btree (seller_planet_id);


--
-- TOC entry 3669 (class 1259 OID 19173)
-- Name: idx_market_price_history_resource_recorded; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_price_history_resource_recorded ON public.market_price_history USING btree (resource_type, recorded_at);


--
-- TOC entry 3672 (class 1259 OID 19174)
-- Name: idx_market_transaction_buyer; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_transaction_buyer ON public.market_transaction USING btree (buyer_user_id);


--
-- TOC entry 3673 (class 1259 OID 19175)
-- Name: idx_market_transaction_created; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_transaction_created ON public.market_transaction USING btree (created_at);


--
-- TOC entry 3674 (class 1259 OID 19176)
-- Name: idx_market_transaction_seller; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_market_transaction_seller ON public.market_transaction USING btree (seller_user_id);


--
-- TOC entry 3687 (class 1259 OID 19177)
-- Name: idx_planet_ships_planet_id; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_planet_ships_planet_id ON public.planet_ships USING btree (planet_id);


--
-- TOC entry 3690 (class 1259 OID 19178)
-- Name: idx_planet_technologies_planet_id; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_planet_technologies_planet_id ON public.planet_technologies USING btree (planet_id);


--
-- TOC entry 3695 (class 1259 OID 19179)
-- Name: idx_resource_slots_planet_slot; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE UNIQUE INDEX idx_resource_slots_planet_slot ON public.resource_slots USING btree (planet_id, slot_number);


--
-- TOC entry 3698 (class 1259 OID 19180)
-- Name: idx_sabotage_expires; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_sabotage_expires ON public.sabotage_effect USING btree (expires_at);


--
-- TOC entry 3699 (class 1259 OID 19181)
-- Name: idx_sabotage_target; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_sabotage_target ON public.sabotage_effect USING btree (target_planet_id);


--
-- TOC entry 3700 (class 1259 OID 19182)
-- Name: idx_sabotage_type; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_sabotage_type ON public.sabotage_effect USING btree (effect_type);


--
-- TOC entry 3711 (class 1259 OID 19183)
-- Name: idx_ship_requirements_ship_type_id; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_ship_requirements_ship_type_id ON public.ship_requirements USING btree (ship_type_id);


--
-- TOC entry 3722 (class 1259 OID 19184)
-- Name: idx_tech_requirements_tech_id; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_tech_requirements_tech_id ON public.technology_requirements USING btree (tech_id);


--
-- TOC entry 3733 (class 1259 OID 19185)
-- Name: idx_user_achievement_unique; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE UNIQUE INDEX idx_user_achievement_unique ON public.user_achievement USING btree (user_id, achievement_id);


--
-- TOC entry 3734 (class 1259 OID 19186)
-- Name: idx_user_achievement_user; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_user_achievement_user ON public.user_achievement USING btree (user_id);


--
-- TOC entry 3737 (class 1259 OID 19187)
-- Name: idx_user_daily_mission_user_date; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_user_daily_mission_user_date ON public.user_daily_mission USING btree (user_id, assigned_date);


--
-- TOC entry 3740 (class 1259 OID 19188)
-- Name: idx_user_officer_active; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_user_officer_active ON public.user_officer USING btree (user_id, is_active);


--
-- TOC entry 3741 (class 1259 OID 19189)
-- Name: idx_user_officer_user_id; Type: INDEX; Schema: public; Owner: spacedb_ow88_user
--

CREATE INDEX idx_user_officer_user_id ON public.user_officer USING btree (user_id);


--
-- TOC entry 3747 (class 2606 OID 19190)
-- Name: building_requirements building_requirements_building_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_requirements
    ADD CONSTRAINT building_requirements_building_type_id_fkey FOREIGN KEY (building_type_id) REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3748 (class 2606 OID 19195)
-- Name: building_requirements building_requirements_required_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_requirements
    ADD CONSTRAINT building_requirements_required_building_id_fkey FOREIGN KEY (required_building_id) REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3749 (class 2606 OID 19200)
-- Name: building_requirements building_requirements_required_tech_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.building_requirements
    ADD CONSTRAINT building_requirements_required_tech_id_fkey FOREIGN KEY (required_tech_id) REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3752 (class 2606 OID 19205)
-- Name: defense_requirements defense_requirements_defense_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_requirements
    ADD CONSTRAINT defense_requirements_defense_type_id_fkey FOREIGN KEY (defense_type_id) REFERENCES public.defense_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3753 (class 2606 OID 19210)
-- Name: defense_requirements defense_requirements_required_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_requirements
    ADD CONSTRAINT defense_requirements_required_building_id_fkey FOREIGN KEY (required_building_id) REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3754 (class 2606 OID 19215)
-- Name: defense_requirements defense_requirements_required_tech_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.defense_requirements
    ADD CONSTRAINT defense_requirements_required_tech_id_fkey FOREIGN KEY (required_tech_id) REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3750 (class 2606 OID 19220)
-- Name: casus_belli fk_casus_belli_aggressor; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.casus_belli
    ADD CONSTRAINT fk_casus_belli_aggressor FOREIGN KEY (aggressor_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 3751 (class 2606 OID 19225)
-- Name: casus_belli fk_casus_belli_victim; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.casus_belli
    ADD CONSTRAINT fk_casus_belli_victim FOREIGN KEY (victim_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 3757 (class 2606 OID 19230)
-- Name: planet_ships fk_planet_ships_planet_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_ships
    ADD CONSTRAINT fk_planet_ships_planet_id FOREIGN KEY (planet_id) REFERENCES public.planet(id) ON DELETE CASCADE;


--
-- TOC entry 3758 (class 2606 OID 19235)
-- Name: planet_ships fk_planet_ships_ship_type_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_ships
    ADD CONSTRAINT fk_planet_ships_ship_type_id FOREIGN KEY (ship_type_id) REFERENCES public.ship_types(id) ON DELETE CASCADE;


--
-- TOC entry 3759 (class 2606 OID 19240)
-- Name: planet_technologies fk_planet_technologies_planet_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_technologies
    ADD CONSTRAINT fk_planet_technologies_planet_id FOREIGN KEY (planet_id) REFERENCES public.planet(id) ON DELETE CASCADE;


--
-- TOC entry 3760 (class 2606 OID 19245)
-- Name: planet_technologies fk_planet_technologies_tech_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_technologies
    ADD CONSTRAINT fk_planet_technologies_tech_id FOREIGN KEY (tech_id) REFERENCES public.technologies(id) ON DELETE CASCADE;


--
-- TOC entry 3761 (class 2606 OID 19250)
-- Name: rapid_fire_rules fk_rapid_fire_attacker; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.rapid_fire_rules
    ADD CONSTRAINT fk_rapid_fire_attacker FOREIGN KEY (attacker_ship_type_id) REFERENCES public.ship_types(id) ON DELETE CASCADE;


--
-- TOC entry 3762 (class 2606 OID 19255)
-- Name: rapid_fire_rules fk_rapid_fire_target; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.rapid_fire_rules
    ADD CONSTRAINT fk_rapid_fire_target FOREIGN KEY (target_ship_type_id) REFERENCES public.ship_types(id) ON DELETE CASCADE;


--
-- TOC entry 3763 (class 2606 OID 19260)
-- Name: resource_slots fk_resource_slots_planet; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.resource_slots
    ADD CONSTRAINT fk_resource_slots_planet FOREIGN KEY (planet_id) REFERENCES public.planet(id) ON DELETE CASCADE;


--
-- TOC entry 3764 (class 2606 OID 19265)
-- Name: sabotage_effect fk_sabotage_planet; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.sabotage_effect
    ADD CONSTRAINT fk_sabotage_planet FOREIGN KEY (target_planet_id) REFERENCES public.planet(id) ON DELETE CASCADE;


--
-- TOC entry 3765 (class 2606 OID 19270)
-- Name: ship_requirements fk_ship_requirements_ship_type_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_requirements
    ADD CONSTRAINT fk_ship_requirements_ship_type_id FOREIGN KEY (ship_type_id) REFERENCES public.ship_types(id) ON DELETE CASCADE;


--
-- TOC entry 3766 (class 2606 OID 19275)
-- Name: ship_requirements fk_ship_requirements_tech_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.ship_requirements
    ADD CONSTRAINT fk_ship_requirements_tech_id FOREIGN KEY (required_tech_id) REFERENCES public.technologies(id) ON DELETE CASCADE;


--
-- TOC entry 3767 (class 2606 OID 19280)
-- Name: technology_requirements fk_tech_requirements_required_tech_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technology_requirements
    ADD CONSTRAINT fk_tech_requirements_required_tech_id FOREIGN KEY (required_tech_id) REFERENCES public.technologies(id) ON DELETE CASCADE;


--
-- TOC entry 3768 (class 2606 OID 19285)
-- Name: technology_requirements fk_tech_requirements_tech_id; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.technology_requirements
    ADD CONSTRAINT fk_tech_requirements_tech_id FOREIGN KEY (tech_id) REFERENCES public.technologies(id) ON DELETE CASCADE;


--
-- TOC entry 3769 (class 2606 OID 19290)
-- Name: user_officer fk_user_officer_template; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.user_officer
    ADD CONSTRAINT fk_user_officer_template FOREIGN KEY (officer_template_id) REFERENCES public.officer_template(id) ON DELETE CASCADE;


--
-- TOC entry 3770 (class 2606 OID 19295)
-- Name: user_officer fk_user_officer_user; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.user_officer
    ADD CONSTRAINT fk_user_officer_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 3755 (class 2606 OID 19300)
-- Name: planet_buildings planet_buildings_building_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_buildings
    ADD CONSTRAINT planet_buildings_building_type_id_fkey FOREIGN KEY (building_type_id) REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3756 (class 2606 OID 19305)
-- Name: planet_defenses planet_defenses_defense_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spacedb_ow88_user
--

ALTER TABLE ONLY public.planet_defenses
    ADD CONSTRAINT planet_defenses_defense_type_id_fkey FOREIGN KEY (defense_type_id) REFERENCES public.defense_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-03-04 23:38:51 UTC

--
-- PostgreSQL database dump complete
--

\unrestrict LUrarjw5x5eFd2ek0WERTZMDAzREjCiaigZ2LzvienrY1xaqOOB3DTtjiSKrPt9

