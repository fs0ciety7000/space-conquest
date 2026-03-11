import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';
import { Search, Edit, Save, X, AlertTriangle, Database, Users, Zap, BarChart3, Settings, Rocket, Shield, TrendingUp, Crosshair, Target, Award, Package, Box, Map, Warehouse, Battery, Radio, Skull, Plus, Trash2, RefreshCw, Swords, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import AdminContentManager from './AdminContentManager';

interface PlanetInfo {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
}

interface Player {
  id: string;
  username: string;
  email: string;
  role: string;
  planets: PlanetInfo[];
  total_points: number;
  syndicate_credits: number;
}

interface PlanetData {
  id: string;
  owner_id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;

  // Ressources
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  last_update: string;

  // Mines
  metal_mine_level: number;
  crystal_mine_level: number;
  deuterium_mine_level: number;
  solar_plant_level: number;

  // Installations
  shipyard_level: number;
  research_lab_level: number;
  hangar_level: number;
  resource_storage_level: number;
  fusion_plant_level: number;

  // Technologies
  energy_tech_level: number;
  laser_battery_level: number;
  armour_tech_level: number;
  espionage_tech_level: number;
  weapons_tech_level: number;
  shield_tech_level: number;
  computer_tech_level: number;
  hyperspace_tech_level: number;
  plasma_tech_level: number;
  astrophysics_level: number;
  graviton_tech_level: number;

  // Flotte
  light_hunter_count: number;
  heavy_hunter_count: number;
  cruiser_count: number;
  battleship_count: number;
  bomber_count: number;
  destroyer_count: number;
  recycler_count: number;
  spy_probe_count: number;
  colony_ship_count: number;
  transporter_count: number;
  deathstar_count: number;
  grand_cargo_count: number;

  // Défenses
  rocket_launcher_count: number;
  light_laser_count: number;
  heavy_laser_count: number;
  gauss_cannon_count: number;
  ion_cannon_count: number;
  plasma_turret_count: number;
  small_shield_count: number;
  large_shield_count: number;
  anti_missile_count: number;
  interplanetary_missile_count: number;
}

interface ServerStats {
  total_users: number;
  total_planets: number;
  total_metal: number;
  total_crystal: number;
  total_deuterium: number;
  total_ships: number;
  total_defenses: number;
  speed_factor: number;
}

interface ServerConfig {
  speed_factor: string;
  construction_speed_multiplier: string;
  mining_speed_multiplier: string;
  // Les autres configs seront chargées dynamiquement
  [key: string]: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type AdminTab = 'players' | 'stats' | 'users' | 'config' | 'announcements' | 'content' | 'black_market' | 'pve_events' | 'governance';

interface ConfigCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  configs: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
}

const CONFIG_CATEGORIES: ConfigCategory[] = [
  {
    id: 'speed',
    title: 'Multiplicateurs de Vitesse',
    icon: Zap,
    color: 'indigo',
    configs: [
      { key: 'speed_factor', label: 'Speed Factor Global', description: 'Multiplicateur général (x5 = 500)', defaultValue: '500.0' },
      { key: 'flight_speed_multiplier', label: 'Vitesse de Vol', description: 'Multiplie la vitesse des flottes (5 = 5x, 10 = 10x, etc.)', defaultValue: '5.0' },
      { key: 'construction_speed_multiplier', label: 'Vitesse Construction', description: 'Multiplie les temps de construction', defaultValue: '1.0' },
      { key: 'mining_speed_multiplier', label: 'Vitesse Minage', description: 'Multiplie la production de ressources', defaultValue: '1.0' },
    ]
  },
  {
    id: 'combat_stats',
    title: 'Statistiques de Combat',
    icon: Target,
    color: 'orange',
    configs: [
      { key: 'combat_light_hunter_attack', label: 'Chasseur Léger - ATK', description: 'Puissance attaque chasseur léger', defaultValue: '50.0' },
      { key: 'combat_light_hunter_shield', label: 'Chasseur Léger - BOU', description: 'Puissance bouclier chasseur léger', defaultValue: '10.0' },
      { key: 'combat_light_hunter_hull', label: 'Chasseur Léger - COQ', description: 'Points de structure chasseur léger', defaultValue: '400.0' },
      { key: 'combat_heavy_hunter_attack', label: 'Chasseur Lourd - ATK', description: 'Puissance attaque chasseur lourd', defaultValue: '150.0' },
      { key: 'combat_heavy_hunter_shield', label: 'Chasseur Lourd - BOU', description: 'Puissance bouclier chasseur lourd', defaultValue: '25.0' },
      { key: 'combat_heavy_hunter_hull', label: 'Chasseur Lourd - COQ', description: 'Points de structure chasseur lourd', defaultValue: '1000.0' },
      { key: 'combat_cruiser_attack', label: 'Croiseur - ATK', description: 'Puissance attaque croiseur', defaultValue: '400.0' },
      { key: 'combat_cruiser_shield', label: 'Croiseur - BOU', description: 'Puissance bouclier croiseur', defaultValue: '50.0' },
      { key: 'combat_cruiser_hull', label: 'Croiseur - COQ', description: 'Points de structure croiseur', defaultValue: '2700.0' },
      { key: 'combat_battleship_attack', label: 'Cuirassé - ATK', description: 'Puissance attaque cuirassé', defaultValue: '1000.0' },
      { key: 'combat_battleship_shield', label: 'Cuirassé - BOU', description: 'Puissance bouclier cuirassé', defaultValue: '200.0' },
      { key: 'combat_battleship_hull', label: 'Cuirassé - COQ', description: 'Points de structure cuirassé', defaultValue: '6000.0' },
      { key: 'combat_bomber_attack', label: 'Bombardier - ATK', description: 'Puissance attaque bombardier', defaultValue: '1000.0' },
      { key: 'combat_bomber_shield', label: 'Bombardier - BOU', description: 'Puissance bouclier bombardier', defaultValue: '500.0' },
      { key: 'combat_bomber_hull', label: 'Bombardier - COQ', description: 'Points de structure bombardier', defaultValue: '7500.0' },
      { key: 'combat_destroyer_attack', label: 'Destroyer - ATK', description: 'Puissance attaque destroyer', defaultValue: '2000.0' },
      { key: 'combat_destroyer_shield', label: 'Destroyer - BOU', description: 'Puissance bouclier destroyer', defaultValue: '500.0' },
      { key: 'combat_destroyer_hull', label: 'Destroyer - COQ', description: 'Points de structure destroyer', defaultValue: '11000.0' },
      { key: 'combat_missile_launcher_attack', label: 'Lance-Missiles - ATK', description: 'Puissance attaque lanceur missiles', defaultValue: '80.0' },
      { key: 'combat_missile_launcher_shield', label: 'Lance-Missiles - BOU', description: 'Puissance bouclier lanceur missiles', defaultValue: '20.0' },
      { key: 'combat_missile_launcher_hull', label: 'Lance-Missiles - COQ', description: 'Points de structure lanceur missiles', defaultValue: '200.0' },
      { key: 'combat_plasma_turret_attack', label: 'Tourelle Plasma - ATK', description: 'Puissance attaque tourelle plasma', defaultValue: '3000.0' },
      { key: 'combat_plasma_turret_shield', label: 'Tourelle Plasma - BOU', description: 'Puissance bouclier tourelle plasma', defaultValue: '300.0' },
      { key: 'combat_plasma_turret_hull', label: 'Tourelle Plasma - COQ', description: 'Points de structure tourelle plasma', defaultValue: '10000.0' },
    ]
  },
  {
    id: 'combat_rf',
    title: 'Tirs Rapides (Rapid Fire)',
    icon: Crosshair,
    color: 'purple',
    configs: [
      { key: 'combat_rf_cruiser_vs_light_hunter', label: 'Croiseur vs Chasseur Léger', description: 'Rapid fire croiseur contre chasseur léger', defaultValue: '6.0' },
      { key: 'combat_rf_cruiser_vs_missile_launcher', label: 'Croiseur vs Lance-Missiles', description: 'Rapid fire croiseur contre lance-missiles', defaultValue: '10.0' },
      { key: 'combat_rf_heavy_hunter_vs_spy_probe', label: 'Chasseur Lourd vs Sonde', description: 'Rapid fire chasseur lourd contre sonde', defaultValue: '5.0' },
      { key: 'combat_rf_battleship_vs_light_hunter', label: 'Cuirassé vs Chasseur Léger', description: 'Rapid fire cuirassé contre chasseur léger', defaultValue: '4.0' },
      { key: 'combat_rf_battleship_vs_heavy_hunter', label: 'Cuirassé vs Chasseur Lourd', description: 'Rapid fire cuirassé contre chasseur lourd', defaultValue: '3.0' },
      { key: 'combat_rf_bomber_vs_missile_launcher', label: 'Bombardier vs Lance-Missiles', description: 'Rapid fire bombardier contre lance-missiles', defaultValue: '20.0' },
      { key: 'combat_rf_bomber_vs_plasma_turret', label: 'Bombardier vs Plasma', description: 'Rapid fire bombardier contre tourelle plasma', defaultValue: '10.0' },
      { key: 'combat_rf_destroyer_vs_battleship', label: 'Destroyer vs Cuirassé', description: 'Rapid fire destroyer contre cuirassé', defaultValue: '2.0' },
      { key: 'combat_rf_destroyer_vs_bomber', label: 'Destroyer vs Bombardier', description: 'Rapid fire destroyer contre bombardier', defaultValue: '5.0' },
      { key: 'combat_rf_plasma_vs_light_hunter', label: 'Plasma vs Chasseur Léger', description: 'Rapid fire tourelle plasma contre chasseur léger', defaultValue: '5.0' },
      { key: 'combat_rf_plasma_vs_cruiser', label: 'Plasma vs Croiseur', description: 'Rapid fire tourelle plasma contre croiseur', defaultValue: '3.0' },
    ]
  },
  {
    id: 'combat_tech',
    title: 'Bonus Technologiques Combat',
    icon: Award,
    color: 'pink',
    configs: [
      { key: 'combat_tech_laser_bonus', label: 'Bonus Tech Laser', description: 'Bonus attaque par niveau tech laser (+10%)', defaultValue: '0.1' },
      { key: 'combat_tech_energy_bonus', label: 'Bonus Tech Énergie', description: 'Bonus bouclier par niveau tech énergie (+10%)', defaultValue: '0.1' },
      { key: 'combat_tech_armour_bonus', label: 'Bonus Tech Protection', description: 'Bonus coque par niveau tech armure (+10%)', defaultValue: '0.1' },
    ]
  },
  {
    id: 'loot',
    title: 'Pillage & Débris',
    icon: Package,
    color: 'amber',
    configs: [
      { key: 'loot_percentage', label: 'Pourcentage Pillage', description: 'Pourcentage ressources pillables (50%)', defaultValue: '0.5' },
      { key: 'loot_max_per_resource', label: 'Max par Ressource', description: 'Maximum pillable par type ressource', defaultValue: '50000.0' },
      { key: 'debris_percentage', label: 'Pourcentage Débris', description: 'Pourcentage débris générés (30%)', defaultValue: '0.3' },
    ]
  },
  {
    id: 'cooldowns',
    title: 'Cooldowns & Anti-flood',
    icon: Package,
    color: 'orange',
    configs: [
      { key: 'attack_cooldown_hours', label: 'Cooldown Attaque (h)', description: 'Délai minimum entre deux attaques sur le même joueur (heures)', defaultValue: '2.0' },
      { key: 'sabotage_cooldown_hours', label: 'Cooldown Sabotage (h)', description: 'Délai minimum entre deux sabotages sur la même planète (heures)', defaultValue: '2.0' },
    ]
  },
  {
    id: 'cargo',
    title: 'Capacités de Chargement',
    icon: Box,
    color: 'teal',
    configs: [
      { key: 'cargo_light_hunter', label: 'Chasseur Léger - Cargo', description: 'Capacité cargo chasseur léger', defaultValue: '50.0' },
      { key: 'cargo_heavy_hunter', label: 'Chasseur Lourd - Cargo', description: 'Capacité cargo chasseur lourd', defaultValue: '100.0' },
      { key: 'cargo_cruiser', label: 'Croiseur - Cargo', description: 'Capacité cargo croiseur', defaultValue: '800.0' },
      { key: 'cargo_battleship', label: 'Cuirassé - Cargo', description: 'Capacité cargo cuirassé', defaultValue: '1500.0' },
      { key: 'cargo_bomber', label: 'Bombardier - Cargo', description: 'Capacité cargo bombardier', defaultValue: '500.0' },
      { key: 'cargo_destroyer', label: 'Destroyer - Cargo', description: 'Capacité cargo destroyer', defaultValue: '2000.0' },
      { key: 'cargo_transporter_base', label: 'Transporteur - Base', description: 'Capacité base transporteur', defaultValue: '10000.0' },
      { key: 'cargo_transporter_bonus_per_hangar', label: 'Transporteur - Bonus Hangar', description: 'Bonus par niveau hangar (+5%)', defaultValue: '0.05' },
      { key: 'cargo_transporter_bonus_per_computer_tech', label: 'Transporteur - Bonus Informatique', description: 'Bonus cargo par niveau tech informatique', defaultValue: '0.1' },
    ]
  },
  {
    id: 'expedition',
    title: 'Expéditions - Général',
    icon: Map,
    color: 'lime',
    configs: [
      { key: 'expedition_combat_chance', label: 'Chance de Combat', description: 'Probabilité rencontre pirates (30%)', defaultValue: '0.3' },
      { key: 'expedition_deuterium_chance', label: 'Chance Deutérium', description: 'Probabilité découverte deutérium (50%)', defaultValue: '0.5' },
      { key: 'expedition_recycler_bonus_multiplier', label: 'Bonus Recycleur', description: 'Multiplicateur bonus recycleur (x2)', defaultValue: '2.0' },
      { key: 'expedition_calm_sector_bonus', label: 'Bonus Secteur Calme', description: 'Multiplicateur secteur calme (+20%)', defaultValue: '1.2' },
      { key: 'expedition_base_duration', label: 'Durée Base', description: 'Durée base expédition (secondes)', defaultValue: '600.0' },
      { key: 'expedition_defense_bonus_multiplier', label: 'Bonus Défense Pirates', description: 'Multiplicateur puissance défense pirates', defaultValue: '5.0' },
    ]
  },
  {
    id: 'expedition_rewards',
    title: 'Expéditions - Récompenses',
    icon: Award,
    color: 'emerald',
    configs: [
      { key: 'expedition_hunter_metal_min', label: 'Chasseur - Métal Min', description: 'Métal min par chasseur', defaultValue: '50.0' },
      { key: 'expedition_hunter_metal_range', label: 'Chasseur - Métal Range', description: 'Variation métal chasseur', defaultValue: '50.0' },
      { key: 'expedition_hunter_crystal_min', label: 'Chasseur - Cristal Min', description: 'Cristal min par chasseur', defaultValue: '20.0' },
      { key: 'expedition_hunter_crystal_range', label: 'Chasseur - Cristal Range', description: 'Variation cristal chasseur', defaultValue: '30.0' },
      { key: 'expedition_hunter_deut_min', label: 'Chasseur - Deut Min', description: 'Deutérium min par chasseur', defaultValue: '10.0' },
      { key: 'expedition_hunter_deut_range', label: 'Chasseur - Deut Range', description: 'Variation deutérium chasseur', defaultValue: '15.0' },
      { key: 'expedition_cruiser_metal_min', label: 'Croiseur - Métal Min', description: 'Métal min par croiseur', defaultValue: '150.0' },
      { key: 'expedition_cruiser_metal_range', label: 'Croiseur - Métal Range', description: 'Variation métal croiseur', defaultValue: '100.0' },
      { key: 'expedition_cruiser_crystal_min', label: 'Croiseur - Cristal Min', description: 'Cristal min par croiseur', defaultValue: '60.0' },
      { key: 'expedition_cruiser_crystal_range', label: 'Croiseur - Cristal Range', description: 'Variation cristal croiseur', defaultValue: '40.0' },
      { key: 'expedition_cruiser_deut_min', label: 'Croiseur - Deut Min', description: 'Deutérium min par croiseur', defaultValue: '30.0' },
      { key: 'expedition_cruiser_deut_range', label: 'Croiseur - Deut Range', description: 'Variation deutérium croiseur', defaultValue: '30.0' },
      { key: 'expedition_syndicate_credit_chance', label: 'SC - Chance Découverte', description: 'Probabilité de trouver des SC en expédition (10%)', defaultValue: '0.10' },
      { key: 'expedition_syndicate_credit_min', label: 'SC - Min', description: 'SC minimum trouvables', defaultValue: '1.0' },
      { key: 'expedition_syndicate_credit_max', label: 'SC - Max', description: 'SC maximum trouvables', defaultValue: '2.0' },
    ]
  },
  {
    id: 'expedition_combat',
    title: 'Expéditions - Combat',
    icon: Crosshair,
    color: 'rose',
    configs: [
      { key: 'expedition_pirate_scaling_min', label: 'Scaling Pirates Min', description: 'Échelle min flotte pirates (game_logic)', defaultValue: '10.0' },
      { key: 'expedition_pirate_scaling_max', label: 'Scaling Pirates Max', description: 'Échelle max flotte pirates (game_logic)', defaultValue: '100.0' },
      { key: 'expedition_victory_loss_min', label: 'Perte Victoire Min', description: 'Perte min en victoire (3%)', defaultValue: '0.03' },
      { key: 'expedition_victory_loss_max', label: 'Perte Victoire Max', description: 'Perte max en victoire (15%)', defaultValue: '0.15' },
      { key: 'expedition_victory_loss_variation', label: 'Variation Perte Victoire', description: 'Variation perte victoire (±10%)', defaultValue: '0.1' },
      { key: 'expedition_defeat_loss_min', label: 'Perte Défaite Min', description: 'Perte min en défaite (30%)', defaultValue: '0.30' },
      { key: 'expedition_defeat_loss_max', label: 'Perte Défaite Max', description: 'Perte max en défaite (60%)', defaultValue: '0.60' },
      { key: 'expedition_defeat_loss_variation', label: 'Variation Perte Défaite', description: 'Variation perte défaite (±15%)', defaultValue: '0.15' },
      { key: 'expedition_hunter_vulnerability', label: 'Vulnérabilité Chasseur', description: 'Multiplicateur vulnérabilité chasseur', defaultValue: '1.0' },
      { key: 'expedition_cruiser_vulnerability', label: 'Vulnérabilité Croiseur', description: 'Multiplicateur vulnérabilité croiseur', defaultValue: '0.5' },
    ]
  },
  {
    id: 'buildings',
    title: 'Bâtiments & Stockage',
    icon: Warehouse,
    color: 'slate',
    configs: [
      { key: 'hangar_capacity_base', label: 'Hangar - Capacité Base', description: 'Capacité base hangar niveau 1', defaultValue: '500.0' },
      { key: 'hangar_capacity_per_level', label: 'Hangar - Par Niveau', description: 'Capacité ajoutée par niveau', defaultValue: '500.0' },
      { key: 'storage_capacity_base', label: 'Stockage - Capacité Base', description: 'Capacité base stockage niveau 1', defaultValue: '600000.0' },
      { key: 'storage_capacity_growth', label: 'Stockage - Croissance', description: 'Facteur croissance stockage', defaultValue: '1.6' },
      { key: 'slot_bonus_per_slot', label: 'Bonus par Slot', description: 'Bonus production par slot actif (+50%)', defaultValue: '0.5' },
    ]
  },
  {
    id: 'trade_routes',
    title: 'Routes Commerciales',
    icon: Map,
    color: 'amber',
    configs: [
      { key: 'trade_route_interval_hours', label: 'Intervalle (heures)', description: 'Fréquence d\'exécution des routes (défaut: 24h)', defaultValue: '24.0' },
      { key: 'trade_route_piracy_chance', label: 'Chance de Piraterie', description: 'Probabilité d\'interception par une flotte ennemie (10%)', defaultValue: '0.1' },
      { key: 'grand_cargo_capacity', label: 'Grand Cargo - Capacité', description: 'Capacité cargo par Grand Cargo (unités)', defaultValue: '1000000' },
      { key: 'grand_cargo_attack', label: 'Grand Cargo - Attaque', description: 'Valeur d\'attaque du Grand Cargo', defaultValue: '50' },
      { key: 'grand_cargo_shield', label: 'Grand Cargo - Bouclier', description: 'Valeur de bouclier du Grand Cargo', defaultValue: '100' },
      { key: 'grand_cargo_hull', label: 'Grand Cargo - Coque', description: 'Valeur de coque (PV) du Grand Cargo', defaultValue: '15000' },
      { key: 'grand_cargo_speed', label: 'Grand Cargo - Vitesse', description: 'Vitesse du Grand Cargo', defaultValue: '5000' },
    ]
  },
  {
    id: 'ships',
    title: 'Coûts des Vaisseaux',
    icon: Rocket,
    color: 'cyan',
    configs: [
      { key: 'ship_light_hunter_metal', label: 'Chasseur Léger - Métal', description: 'Coût métal chasseur léger', defaultValue: '3000.0' },
      { key: 'ship_light_hunter_crystal', label: 'Chasseur Léger - Cristal', description: 'Coût cristal chasseur léger', defaultValue: '1000.0' },
      { key: 'ship_heavy_hunter_metal', label: 'Chasseur Lourd - Métal', description: 'Coût métal chasseur lourd', defaultValue: '6000.0' },
      { key: 'ship_heavy_hunter_crystal', label: 'Chasseur Lourd - Cristal', description: 'Coût cristal chasseur lourd', defaultValue: '4000.0' },
      { key: 'ship_heavy_hunter_deuterium', label: 'Chasseur Lourd - Deutérium', description: 'Coût deutérium chasseur lourd', defaultValue: '1000.0' },
      { key: 'ship_cruiser_metal', label: 'Croiseur - Métal', description: 'Coût métal croiseur', defaultValue: '20000.0' },
      { key: 'ship_cruiser_crystal', label: 'Croiseur - Cristal', description: 'Coût cristal croiseur', defaultValue: '7000.0' },
      { key: 'ship_battleship_metal', label: 'Cuirassé - Métal', description: 'Coût métal cuirassé', defaultValue: '45000.0' },
      { key: 'ship_battleship_crystal', label: 'Cuirassé - Cristal', description: 'Coût cristal cuirassé', defaultValue: '15000.0' },
      { key: 'ship_battleship_deuterium', label: 'Cuirassé - Deutérium', description: 'Coût deutérium cuirassé', defaultValue: '5000.0' },
      { key: 'ship_bomber_metal', label: 'Bombardier - Métal', description: 'Coût métal bombardier', defaultValue: '50000.0' },
      { key: 'ship_bomber_crystal', label: 'Bombardier - Cristal', description: 'Coût cristal bombardier', defaultValue: '25000.0' },
      { key: 'ship_bomber_deuterium', label: 'Bombardier - Deutérium', description: 'Coût deutérium bombardier', defaultValue: '15000.0' },
      { key: 'ship_destroyer_metal', label: 'Destroyer - Métal', description: 'Coût métal destroyer', defaultValue: '60000.0' },
      { key: 'ship_destroyer_crystal', label: 'Destroyer - Cristal', description: 'Coût cristal destroyer', defaultValue: '50000.0' },
      { key: 'ship_destroyer_deuterium', label: 'Destroyer - Deutérium', description: 'Coût deutérium destroyer', defaultValue: '15000.0' },
      { key: 'ship_transporter_metal', label: 'Transporteur - Métal', description: 'Coût métal transporteur', defaultValue: '4000.0' },
      { key: 'ship_transporter_crystal', label: 'Transporteur - Cristal', description: 'Coût cristal transporteur', defaultValue: '4000.0' },
      { key: 'ship_recycler_metal', label: 'Recycleur - Métal', description: 'Coût métal recycleur', defaultValue: '10000.0' },
      { key: 'ship_recycler_crystal', label: 'Recycleur - Cristal', description: 'Coût cristal recycleur', defaultValue: '6000.0' },
      { key: 'ship_spy_probe_metal', label: 'Sonde - Métal', description: 'Coût métal sonde espionnage', defaultValue: '1000.0' },
      { key: 'ship_spy_probe_crystal', label: 'Sonde - Cristal', description: 'Coût cristal sonde espionnage', defaultValue: '0.0' },
      { key: 'ship_colony_ship_metal', label: 'Colon - Métal', description: 'Coût métal vaisseau colonisation', defaultValue: '10000.0' },
      { key: 'ship_colony_ship_crystal', label: 'Colon - Cristal', description: 'Coût cristal vaisseau colonisation', defaultValue: '20000.0' },
      { key: 'ship_deathstar_metal', label: 'Étoile Mort - Métal', description: 'Coût métal étoile de la mort', defaultValue: '5000000.0' },
      { key: 'ship_deathstar_crystal', label: 'Étoile Mort - Cristal', description: 'Coût cristal étoile de la mort', defaultValue: '4000000.0' },
      { key: 'ship_deathstar_deuterium', label: 'Étoile Mort - Deutérium', description: 'Coût deutérium étoile de la mort', defaultValue: '1000000.0' },
      { key: 'ship_build_rate', label: 'Vitesse de construction vaisseaux (taux de base)', description: 'Taux de base pour le temps de construction des vaisseaux — plus élevé = plus rapide', defaultValue: '100000' },
      { key: 'ship_build_rate_shipyard_bonus', label: 'Bonus chantier naval par niveau (vaisseaux)', description: 'Multiplié par le niveau du chantier naval pour réduire le temps de construction', defaultValue: '0.15' },
    ]
  },
  {
    id: 'defenses',
    title: 'Coûts des Défenses',
    icon: Shield,
    color: 'red',
    configs: [
      { key: 'defense_missile_launcher_metal', label: 'Missile - Métal', description: 'Coût métal lanceur de missiles', defaultValue: '10000.0' },
      { key: 'defense_missile_launcher_crystal', label: 'Missile - Cristal', description: 'Coût cristal lanceur de missiles', defaultValue: '2500.0' },
      { key: 'defense_plasma_turret_metal', label: 'Plasma - Métal', description: 'Coût métal tourelle plasma', defaultValue: '50000.0' },
      { key: 'defense_plasma_turret_crystal', label: 'Plasma - Cristal', description: 'Coût cristal tourelle plasma', defaultValue: '50000.0' },
      { key: 'defense_build_rate', label: 'Vitesse de construction défenses (taux de base)', description: 'Taux de base pour le temps de construction des défenses — plus élevé = plus rapide', defaultValue: '2500' },
      { key: 'defense_build_rate_shipyard_bonus', label: 'Bonus chantier naval par niveau (défenses)', description: 'Multiplié par le niveau du chantier naval pour réduire le temps de construction des défenses', defaultValue: '0.5' },
    ]
  },
  {
    id: 'production',
    title: 'Facteurs de Production',
    icon: TrendingUp,
    color: 'green',
    configs: [
      { key: 'production_metal_base', label: 'Métal - Base', description: 'Production base métal (ratio 3:2:1)', defaultValue: '30.0' },
      { key: 'production_metal_growth', label: 'Métal - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'production_crystal_base', label: 'Cristal - Base', description: 'Production base cristal (ratio 3:2:1)', defaultValue: '20.0' },
      { key: 'production_crystal_growth', label: 'Cristal - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'production_deuterium_base', label: 'Production deutérium (base par niveau)', description: 'Production base deutérium — valeur de base par niveau de mine (ratio 3:2:1)', defaultValue: '15' },
      { key: 'production_deuterium_growth', label: 'Deutérium - Croissance', description: 'Facteur croissance exponentielle (plus rare)', defaultValue: '1.05' },
      { key: 'production_speed_multiplier', label: 'Multiplicateur vitesse production globale', description: 'Multiplicateur appliqué à toute la production (x1 = normal)', defaultValue: '1.0' },
      { key: 'building_speed_multiplier', label: 'Multiplicateur vitesse construction', description: 'Accélère la construction des bâtiments', defaultValue: '1.0' },
      { key: 'research_speed_multiplier', label: 'Multiplicateur vitesse recherche', description: 'Accélère les recherches technologiques', defaultValue: '1.0' },
      { key: 'ship_build_speed_multiplier', label: 'Multiplicateur vitesse production vaisseaux', description: 'Accélère la construction de vaisseaux', defaultValue: '1.0' },
    ]
  },
  {
    id: 'governance',
    title: 'Gouvernance & Syndicat',
    icon: Scale,
    color: 'yellow',
    configs: [
      { key: 'expedition_syndicate_credit_chance', label: 'Chance crédits Syndicat (expéditions)', description: 'Probabilité de trouver des crédits Syndicat en expédition (0.35 = 35%)', defaultValue: '0.35' },
      { key: 'expedition_syndicate_credit_min', label: 'Crédits Syndicat min', description: 'Nombre minimum de crédits Syndicat trouvables', defaultValue: '1' },
      { key: 'expedition_syndicate_credit_max', label: 'Crédits Syndicat max', description: 'Nombre maximum de crédits Syndicat trouvables', defaultValue: '2' },
    ]
  },
  {
    id: 'energy',
    title: 'Facteurs Énergétiques',
    icon: Battery,
    color: 'yellow',
    configs: [
      { key: 'energy_solar_base', label: 'Solaire - Base', description: 'Production base centrale solaire', defaultValue: '60.0' },
      { key: 'energy_solar_growth', label: 'Solaire - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'energy_tech_bonus', label: 'Bonus Tech Énergie', description: 'Bonus par niveau tech énergie (+10%)', defaultValue: '0.10' },
      { key: 'energy_mine_consumption_base', label: 'Consommation Mine - Base', description: 'Consommation base des mines', defaultValue: '10.0' },
      { key: 'energy_mine_consumption_growth', label: 'Consommation Mine - Croissance', description: 'Facteur croissance consommation mines', defaultValue: '1.1' },
      { key: 'energy_deuterium_extra_consumption', label: 'Consommation énergie deutérium (facteur extra)', description: 'Consommation supplémentaire mine deutérium — facteur extra appliqué au-dessus de la base', defaultValue: '12' },
    ]
  },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [planetData, setPlanetData] = useState<PlanetData | null>(null);
  const [editedData, setEditedData] = useState<Partial<PlanetData>>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<ServerConfig>>({});
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info', is_active: true });

  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string; variant: 'danger' | 'default'; onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  // Broadcast & maintenance state
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', notif_type: 'system' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Black market CRUD state
  const [bmItems, setBmItems] = useState<any[]>([]);
  const [bmLoading, setBmLoading] = useState(false);
  const [bmEditingItem, setBmEditingItem] = useState<any | null>(null);
  const [bmNewItem, setBmNewItem] = useState({
    name: '', description: '', image_key: 'placeholder',
    effect_type: 'orbital_strike', effect_params: '{"flight_hours": 12}',
    base_price: 100, is_active: true,
  });

  const token = localStorage.getItem('token');
  const currentUserRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('user_id');

  // Vérification sécurité
  if (currentUserRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-red-950/20 border-red-500/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-black text-red-400 mb-2">ACCÈS REFUSÉ</h2>
            <p className="text-slate-400 text-sm">Zone réservée aux administrateurs système.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Charger la liste des joueurs
  useEffect(() => {
    fetchPlayers();
  }, []);

  // Charger les stats quand on passe sur l'onglet stats ou config
  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'config') {
      fetchStats();
      fetchConfig();
      fetchMaintenanceStatus();
    }
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
    if (activeTab === 'black_market') {
      fetchBmItems();
    }
  }, [activeTab]);

  const fetchMaintenanceStatus = async () => {
    try {
      const res = await fetch(apiUrl('/maintenance/status'));
      if (res.ok) {
        const data = await res.json();
        setMaintenanceEnabled(data.enabled ?? false);
      }
    } catch { /* ignore */ }
  };

  const toggleMaintenance = async (enabled: boolean) => {
    setMaintenanceLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance_enabled: String(enabled) }),
      });
      if (res.ok) {
        setMaintenanceEnabled(enabled);
        toast.success(enabled ? 'Maintenance activée' : 'Maintenance désactivée');
      } else {
        toast.error('Erreur lors de la modification');
      }
    } catch { toast.error('Erreur réseau'); } finally {
      setMaintenanceLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error('Titre et message requis');
      return;
    }
    setBroadcastLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/broadcast?user_id=${userId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastForm),
      });
      if (res.ok) {
        toast.success('Broadcast envoyé à tous les joueurs');
        setBroadcastForm({ title: '', message: '', notif_type: 'system' });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur');
      }
    } catch { toast.error('Erreur réseau'); } finally {
      setBroadcastLoading(false);
    }
  };

  // ── Black Market admin functions ──────────────────────────────────────────
  const fetchBmItems = async () => {
    setBmLoading(true);
    try {
      const res = await fetch(apiUrl('/admin/black-market/items'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBmItems(data.items || []);
      }
    } catch { /* ignore */ } finally {
      setBmLoading(false);
    }
  };

  const createBmItem = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(bmNewItem.effect_params); } catch {
      toast.error('effect_params invalide (doit être du JSON)'); return;
    }
    const res = await fetch(apiUrl('/admin/black-market/items'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bmNewItem, effect_params: parsed }),
    });
    if (res.ok) {
      toast.success('Objet créé');
      fetchBmItems();
      setBmNewItem({ name: '', description: '', image_key: 'placeholder', effect_type: 'orbital_strike', effect_params: '{"flight_hours": 12}', base_price: 100, is_active: true });
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const updateBmItem = async () => {
    if (!bmEditingItem) return;
    let parsed: unknown;
    try { parsed = JSON.parse(typeof bmEditingItem.effect_params === 'string' ? bmEditingItem.effect_params : JSON.stringify(bmEditingItem.effect_params)); } catch {
      toast.error('effect_params invalide (doit être du JSON)'); return;
    }
    const res = await fetch(apiUrl(`/admin/black-market/items/${bmEditingItem.id}`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bmEditingItem, effect_params: parsed }),
    });
    if (res.ok) {
      toast.success('Objet mis à jour');
      fetchBmItems();
      setBmEditingItem(null);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteBmItem = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Supprimer l\'objet',
      message: 'Supprimer cet objet du marché underground ?',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch(apiUrl(`/admin/black-market/items/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { toast.success('Objet supprimé'); fetchBmItems(); }
        else toast.error('Erreur lors de la suppression');
      },
    });
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch(apiUrl(`/admin/players?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      } else {
        console.error('Erreur chargement joueurs:', res.status);
      }
    } catch (e) {
      console.error('Erreur chargement joueurs', e);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(apiUrl(`/admin/stats?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Impossible de charger les statistiques');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditedConfig(data);
      } else {
        toast.error('Impossible de charger la configuration');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingConfig(false);
    }
  };

  const updateConfig = async () => {
    setLoadingConfig(true);
    try {
      // Le backend utilise #[serde(flatten)] donc on envoie directement editedConfig
      console.log('🚀 [ADMIN] Sending config update');
      console.log('🚀 [ADMIN] editedConfig keys:', Object.keys(editedConfig));
      console.log('🚀 [ADMIN] editedConfig values:', editedConfig);

      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedConfig)
      });

      console.log('🚀 [ADMIN] Response status:', res.status);
      const responseData = await res.json();
      console.log('🚀 [ADMIN] Response data:', responseData);

      if (res.ok) {
        toast.success('✅ Configuration mise à jour', {
          description: 'Les paramètres ont été modifiés avec succès'
        });
        fetchConfig();
        fetchStats();
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (e) {
      console.error('🚀 [ADMIN] Error:', e);
      toast.error('Erreur réseau');
    } finally {
      setLoadingConfig(false);
    }
  };

  // Announcement functions
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(apiUrl(`/admin/announcements?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      toast.error('Erreur lors du chargement des annonces');
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('Le titre et le contenu sont requis');
      return;
    }

    try {
      const res = await fetch(apiUrl(`/admin/announcements?user_id=${userId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAnnouncement)
      });

      if (res.ok) {
        toast.success('Annonce créée avec succès');
        setNewAnnouncement({ title: '', content: '', type: 'info', is_active: true });
        fetchAnnouncements();
      } else {
        toast.error('Erreur lors de la création');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const updateAnnouncement = async (id: number, updates: Partial<Announcement>) => {
    try {
      const res = await fetch(apiUrl(`/admin/announcements/${id}?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        toast.success('Annonce mise à jour');
        setEditingAnnouncement(null);
        fetchAnnouncements();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const deleteAnnouncement = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Supprimer l\'annonce',
      message: 'Êtes-vous sûr de vouloir supprimer cette annonce ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/admin/announcements/${id}?user_id=${userId}`), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            toast.success('Annonce supprimée');
            fetchAnnouncements();
          } else {
            toast.error('Erreur lors de la suppression');
          }
        } catch (e) {
          toast.error('Erreur réseau');
        }
      },
    });
  };

  const fetchPlanetData = async (planetId: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/planet/${planetId}?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlanetData(data);
        setEditedData(data);
      } else {
        toast.error('Impossible de charger les données');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (player: Player, planetId: string) => {
    setSelectedPlayer(player);
    fetchPlanetData(planetId);
  };

  const handleSaveChanges = async () => {
    if (!planetData) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/planet/${planetData.id}?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedData)
      });

      if (res.ok) {
        toast.success('✅ Modifications enregistrées', {
          description: 'last_update mis à jour automatiquement'
        });
        fetchPlanetData(planetData.id);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la sauvegarde');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="p-5 bg-[#0a0520] border border-cyan-500/12 rounded-lg">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-cyan-400" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-cyan-400">PANNEAU D'ADMINISTRATION</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Accès restreint — zone système</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 flex-wrap border-b border-white/5">
        {([
          { id: 'stats', label: 'Statistiques', icon: BarChart3 },
          { id: 'config', label: 'Configuration', icon: Settings },
          { id: 'players', label: 'Planètes', icon: Users },
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'announcements', label: 'Annonces', icon: Radio },
          { id: 'content', label: 'Contenu', icon: Package },
          { id: 'black_market', label: 'Underground', icon: Skull },
          { id: 'pve_events', label: 'PVE', icon: Swords },
          { id: 'governance', label: 'Gouvernance', icon: Scale },
        ] as { id: AdminTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === id
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                : 'text-slate-400 hover:text-cyan-300 border-b-2 border-transparent'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* TAB STATS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStats ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              Chargement des statistiques...
            </div>
          ) : stats ? (
            <>
              <div className="p-5 bg-[#0a0520] border border-cyan-500/12 rounded-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1">Joueurs</p>
                    <p className="text-3xl font-black text-slate-200 font-mono tabular-nums">{stats.total_users}</p>
                  </div>
                  <Users size={32} className="text-cyan-500/20" />
                </div>
              </div>

              <div className="p-5 bg-[#0a0520] border border-cyan-500/12 rounded-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1">Planètes</p>
                    <p className="text-3xl font-black text-slate-200 font-mono tabular-nums">{stats.total_planets}</p>
                  </div>
                  <Database size={32} className="text-cyan-500/20" />
                </div>
              </div>

              <div className="p-5 bg-[#0a0520] border border-cyan-500/12 rounded-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1">Vaisseaux</p>
                    <p className="text-3xl font-black text-slate-200 font-mono tabular-nums">{stats.total_ships.toLocaleString()}</p>
                  </div>
                  <Zap size={32} className="text-cyan-500/20" />
                </div>
              </div>

              <div className="p-5 bg-[#0a0520] border border-cyan-500/12 rounded-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Défenses</p>
                    <p className="text-3xl font-black text-slate-200 font-mono tabular-nums">{stats.total_defenses.toLocaleString()}</p>
                  </div>
                  <AlertTriangle size={32} className="text-red-500/20" />
                </div>
              </div>

              <div className="col-span-full bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-4">Ressources Totales</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg">
                    <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">Métal</p>
                    <p className="text-2xl font-mono font-black text-slate-200 tabular-nums">{Math.floor(stats.total_metal).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg">
                    <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-1">Cristal</p>
                    <p className="text-2xl font-mono font-black text-slate-200 tabular-nums">{Math.floor(stats.total_crystal).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg">
                    <p className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1">Deutérium</p>
                    <p className="text-2xl font-mono font-black text-slate-200 tabular-nums">{Math.floor(stats.total_deuterium).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Maintenance & Broadcast */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Maintenance toggle */}
                <div className="bg-[#0a0520] border border-yellow-500/20 rounded-lg p-5">
                  <div className="flex items-center gap-2 border-b border-yellow-500/20 pb-2 mb-4">
                    <AlertTriangle size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">Mode Maintenance</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Activer la maintenance bloque l'accès à l'interface pour tous les joueurs non-admins.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${maintenanceEnabled ? 'text-red-400' : 'text-green-400'}`}>
                      {maintenanceEnabled ? 'MAINTENANCE ACTIVE' : 'Serveur opérationnel'}
                    </span>
                    <button
                      onClick={() => toggleMaintenance(!maintenanceEnabled)}
                      disabled={maintenanceLoading}
                      className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                        maintenanceEnabled
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                      } disabled:opacity-50`}
                    >
                      {maintenanceLoading ? '...' : maintenanceEnabled ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>

                {/* Broadcast panel */}
                <div className="bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
                  <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
                    <Radio size={14} className="text-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Broadcast Global</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Titre du message..."
                      value={broadcastForm.title}
                      onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-[#160b3a]/60 border border-cyan-500/20 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                    <textarea
                      placeholder="Message à envoyer à tous les joueurs..."
                      value={broadcastForm.message}
                      onChange={e => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
                      rows={2}
                      className="w-full bg-[#160b3a]/60 border border-cyan-500/20 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                    />
                    <select
                      value={broadcastForm.notif_type}
                      onChange={e => setBroadcastForm(f => ({ ...f, notif_type: e.target.value }))}
                      className="w-full bg-[#160b3a]/60 border border-cyan-500/20 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="system">Système</option>
                      <option value="info">Info</option>
                      <option value="warning">Avertissement</option>
                      <option value="governance">Sénat</option>
                    </select>
                  </div>
                  <button
                    onClick={sendBroadcast}
                    disabled={broadcastLoading}
                    className="w-full px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wider rounded transition-all disabled:opacity-50"
                  >
                    {broadcastLoading ? 'Envoi...' : 'Envoyer à tous les joueurs'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-full text-center py-12 text-slate-600">
              <Database size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Aucune statistique disponible</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONFIG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {loadingConfig || !config ? (
            <div className="text-center py-12 text-slate-500">
              <Database size={48} className="mx-auto mb-4 opacity-20 animate-pulse" />
              <p>Chargement de la configuration...</p>
            </div>
          ) : (
            <>
              {/* Avertissement */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400 flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1 uppercase tracking-wide">Modifications en Temps Réel</p>
                  <p className="text-yellow-200/80">Les changements prennent effet immédiatement pour toutes les nouvelles opérations. Les opérations en cours conservent leur configuration initiale.</p>
                </div>
              </div>

              {/* Categories */}
              {CONFIG_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    className="bg-[#0a0520] border border-cyan-500/12 rounded-lg overflow-hidden"
                  >
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
                        <Icon size={14} className="text-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">{category.title}</span>
                        <span className="ml-auto text-xs text-slate-500">{category.configs.length} paramètres</span>
                      </div>
                      <div className="space-y-0">
                        {category.configs.map((item) => {
                          const currentValue = config[item.key] || item.defaultValue;
                          const editedValue = editedConfig[item.key] ?? currentValue;
                          const hasChanged = editedValue !== currentValue;

                          return (
                            <div
                              key={item.key}
                              className={`flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 ${hasChanged ? 'bg-cyan-500/3' : ''}`}
                            >
                              <div className="flex-1 pr-4">
                                <p className={`text-sm ${hasChanged ? 'text-cyan-300' : 'text-slate-200'}`}>{item.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                {hasChanged && (
                                  <p className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                                    <Edit size={9} />
                                    {currentValue} → {editedValue}
                                  </p>
                                )}
                              </div>
                              <input
                                type="number"
                                step="0.1"
                                value={editedValue}
                                onChange={(e) => setEditedConfig({...editedConfig, [item.key]: e.target.value})}
                                className={`w-32 px-2 py-1 bg-[#160b3a] border rounded text-cyan-300 text-sm font-mono text-right focus:outline-none transition-colors ${
                                  hasChanged
                                    ? 'border-cyan-500/60'
                                    : 'border-cyan-500/20 focus:border-cyan-500/60'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* SECTION 6: STATISTIQUES DE COMBAT */}
                      <Card className="bg-slate-900/40 border-red-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                            <Crosshair size={14} />
                            Statistiques de Combat
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[
                              { unit: 'light_hunter', label: 'Chasseur Léger' },
                              { unit: 'cruiser', label: 'Croiseur' },
                              { unit: 'missile_launcher', label: 'Lanceur de Missiles' },
                              { unit: 'plasma_turret', label: 'Tourelle Plasma' }
                            ].map(({ unit, label }) => (
                              <div key={unit} className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-red-300 mb-3">{label}</h4>
                                <div className="grid grid-cols-3 gap-3">
                                  <ConfigInput
                                    label="Attaque"
                                    configKey={`combat_${unit}_attack`}
                                    value={editedConfig[`combat_${unit}_attack`] ?? config[`combat_${unit}_attack`] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_attack`]: v})}
                                    color="red"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Bouclier"
                                    configKey={`combat_${unit}_shield`}
                                    value={editedConfig[`combat_${unit}_shield`] ?? config[`combat_${unit}_shield`] ?? '10.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_shield`]: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Coque"
                                    configKey={`combat_${unit}_hull`}
                                    value={editedConfig[`combat_${unit}_hull`] ?? config[`combat_${unit}_hull`] ?? '400.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_hull`]: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 7: TIR RAPIDE */}
                      <Card className="bg-slate-900/40 border-purple-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                            <Target size={14} />
                            Tir Rapide (Rapid Fire)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <ConfigInput
                              label="Croiseur vs Chasseur"
                              configKey="combat_rf_cruiser_vs_light_hunter"
                              value={editedConfig['combat_rf_cruiser_vs_light_hunter'] ?? config['combat_rf_cruiser_vs_light_hunter'] ?? '6.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_cruiser_vs_light_hunter: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Croiseur vs Lanceur"
                              configKey="combat_rf_cruiser_vs_missile_launcher"
                              value={editedConfig['combat_rf_cruiser_vs_missile_launcher'] ?? config['combat_rf_cruiser_vs_missile_launcher'] ?? '10.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_cruiser_vs_missile_launcher: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Plasma vs Chasseur"
                              configKey="combat_rf_plasma_vs_light_hunter"
                              value={editedConfig['combat_rf_plasma_vs_light_hunter'] ?? config['combat_rf_plasma_vs_light_hunter'] ?? '6.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_plasma_vs_light_hunter: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Plasma vs Croiseur"
                              configKey="combat_rf_plasma_vs_cruiser"
                              value={editedConfig['combat_rf_plasma_vs_cruiser'] ?? config['combat_rf_plasma_vs_cruiser'] ?? '3.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_plasma_vs_cruiser: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 8: BONUS TECHNOLOGIQUES */}
                      <Card className="bg-slate-900/40 border-yellow-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                            <Award size={14} />
                            Bonus Technologiques
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <ConfigInput
                              label="Bonus Laser"
                              configKey="combat_laser_tech_bonus"
                              value={editedConfig['combat_laser_tech_bonus'] ?? config['combat_laser_tech_bonus'] ?? '0.1'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_laser_tech_bonus: v})}
                              color="red"
                              description="Bonus par niveau (0.1 = 10%)"
                              step="0.01"
                            />
                            <ConfigInput
                              label="Bonus Blindage"
                              configKey="combat_armour_tech_bonus"
                              value={editedConfig['combat_armour_tech_bonus'] ?? config['combat_armour_tech_bonus'] ?? '0.1'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_armour_tech_bonus: v})}
                              color="orange"
                              description="Bonus par niveau (0.1 = 10%)"
                              step="0.01"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 9: PILLAGE & DÉBRIS */}
                      <Card className="bg-slate-900/40 border-green-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                            <Package size={14} />
                            Pillage & Débris
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <ConfigInput
                              label="% Pillage"
                              configKey="combat_loot_percentage"
                              value={editedConfig['combat_loot_percentage'] ?? config['combat_loot_percentage'] ?? '0.5'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_loot_percentage: v})}
                              color="green"
                              description="Pourcentage pillable (0.5 = 50%)"
                              step="0.01"
                            />
                            <ConfigInput
                              label="Max par ressource"
                              configKey="combat_loot_cap_per_resource"
                              value={editedConfig['combat_loot_cap_per_resource'] ?? config['combat_loot_cap_per_resource'] ?? '50000.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_loot_cap_per_resource: v})}
                              color="orange"
                              description="Maximum pillable par ressource"
                            />
                            <ConfigInput
                              label="% Débris"
                              configKey="combat_debris_percentage"
                              value={editedConfig['combat_debris_percentage'] ?? config['combat_debris_percentage'] ?? '0.3'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_debris_percentage: v})}
                              color="red"
                              description="Pourcentage en débris (0.3 = 30%)"
                              step="0.01"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 10: CAPACITÉS DE CARGO */}
                      <Card className="bg-slate-900/40 border-cyan-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                            <Box size={14} />
                            Capacités de Cargo
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <ConfigInput
                              label="Capacité Chasseur"
                              configKey="cargo_light_hunter"
                              value={editedConfig['cargo_light_hunter'] ?? config['cargo_light_hunter'] ?? '50.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_light_hunter: v})}
                              color="cyan"
                              description="Cargo du chasseur léger"
                            />
                            <ConfigInput
                              label="Capacité Croiseur"
                              configKey="cargo_cruiser"
                              value={editedConfig['cargo_cruiser'] ?? config['cargo_cruiser'] ?? '800.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_cruiser: v})}
                              color="cyan"
                              description="Cargo du croiseur"
                            />
                            <ConfigInput
                              label="Base Transporteur"
                              configKey="cargo_transporter_base"
                              value={editedConfig['cargo_transporter_base'] ?? config['cargo_transporter_base'] ?? '5000.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_transporter_base: v})}
                              color="purple"
                              description="Capacité de base"
                            />
                            <ConfigInput
                              label="Bonus Hangar"
                              configKey="cargo_transporter_bonus_per_hangar"
                              value={editedConfig['cargo_transporter_bonus_per_hangar'] ?? config['cargo_transporter_bonus_per_hangar'] ?? '2500.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_transporter_bonus_per_hangar: v})}
                              color="purple"
                              description="Bonus par niveau de hangar"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 11: EXPÉDITIONS */}
                      <Card className="bg-slate-900/40 border-indigo-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <Map size={14} />
                            Mécaniques d'Expédition
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Paramètres Généraux */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Paramètres Généraux</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <ConfigInput
                                  label="% Combat"
                                  configKey="expedition_combat_chance"
                                  value={editedConfig['expedition_combat_chance'] ?? config['expedition_combat_chance'] ?? '0.3'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_combat_chance: v})}
                                  color="red"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Rounds Max"
                                  configKey="expedition_max_rounds"
                                  value={editedConfig['expedition_max_rounds'] ?? config['expedition_max_rounds'] ?? '6'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_max_rounds: v})}
                                  color="purple"
                                  compact
                                />
                              </div>
                            </div>

                            {/* Récompenses Chasseurs */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Récompenses Chasseurs</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-orange-400 font-bold">MÉTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_metal_min"
                                    value={editedConfig['expedition_hunter_metal_min'] ?? config['expedition_hunter_metal_min'] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_metal_min: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_hunter_metal_max"
                                    value={editedConfig['expedition_hunter_metal_max'] ?? config['expedition_hunter_metal_max'] ?? '200.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_metal_max: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-cyan-400 font-bold">CRISTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_crystal_min"
                                    value={editedConfig['expedition_hunter_crystal_min'] ?? config['expedition_hunter_crystal_min'] ?? '25.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_crystal_min: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_hunter_crystal_max"
                                    value={editedConfig['expedition_hunter_crystal_max'] ?? config['expedition_hunter_crystal_max'] ?? '100.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_crystal_max: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-green-400 font-bold">DEUTÉRIUM</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_deuterium_min"
                                    value={editedConfig['expedition_hunter_deuterium_min'] ?? config['expedition_hunter_deuterium_min'] ?? '0.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_deuterium_min: v})}
                                    color="green"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_hunter_deuterium_max"
                                    value={editedConfig['expedition_hunter_deuterium_max'] ?? config['expedition_hunter_deuterium_max'] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_deuterium_max: v})}
                                    color="green"
                                    compact
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Récompenses Croiseurs */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Récompenses Croiseurs</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-orange-400 font-bold">MÉTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_metal_min"
                                    value={editedConfig['expedition_cruiser_metal_min'] ?? config['expedition_cruiser_metal_min'] ?? '200.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_metal_min: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_cruiser_metal_max"
                                    value={editedConfig['expedition_cruiser_metal_max'] ?? config['expedition_cruiser_metal_max'] ?? '600.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_metal_max: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-cyan-400 font-bold">CRISTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_crystal_min"
                                    value={editedConfig['expedition_cruiser_crystal_min'] ?? config['expedition_cruiser_crystal_min'] ?? '100.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_crystal_min: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_cruiser_crystal_max"
                                    value={editedConfig['expedition_cruiser_crystal_max'] ?? config['expedition_cruiser_crystal_max'] ?? '400.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_crystal_max: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-green-400 font-bold">DEUTÉRIUM</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_deuterium_min"
                                    value={editedConfig['expedition_cruiser_deuterium_min'] ?? config['expedition_cruiser_deuterium_min'] ?? '0.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_deuterium_min: v})}
                                    color="green"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Max"
                                    configKey="expedition_cruiser_deuterium_max"
                                    value={editedConfig['expedition_cruiser_deuterium_max'] ?? config['expedition_cruiser_deuterium_max'] ?? '150.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_deuterium_max: v})}
                                    color="green"
                                    compact
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Combat Pirates */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Pirates & Pillage</h4>
                              <div className="grid grid-cols-4 gap-3">
                                <ConfigInput
                                  label="Scaling Min"
                                  configKey="expedition_pirate_scaling_min"
                                  value={editedConfig['expedition_pirate_scaling_min'] ?? config['expedition_pirate_scaling_min'] ?? '10.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_scaling_min: v})}
                                  color="red"
                                  compact
                                />
                                <ConfigInput
                                  label="Scaling Max"
                                  configKey="expedition_pirate_scaling_max"
                                  value={editedConfig['expedition_pirate_scaling_max'] ?? config['expedition_pirate_scaling_max'] ?? '100.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_scaling_max: v})}
                                  color="red"
                                  compact
                                />
                                <ConfigInput
                                  label="Loot Base"
                                  configKey="expedition_pirate_loot_base"
                                  value={editedConfig['expedition_pirate_loot_base'] ?? config['expedition_pirate_loot_base'] ?? '50'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_loot_base: v})}
                                  color="yellow"
                                  compact
                                />
                                <ConfigInput
                                  label="Loot Mult."
                                  configKey="expedition_pirate_loot_multiplier"
                                  value={editedConfig['expedition_pirate_loot_multiplier'] ?? config['expedition_pirate_loot_multiplier'] ?? '1.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_loot_multiplier: v})}
                                  color="yellow"
                                  compact
                                  step="0.1"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-4 z-10">
                <button
                  onClick={updateConfig}
                  disabled={loadingConfig}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Save size={14} />
                  Enregistrer toutes les modifications
                </button>
                <button
                  onClick={() => setEditedConfig(config)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                >
                  <X size={14} />
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB PLAYERS */}
      {activeTab === 'players' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des joueurs */}
        <div className="lg:col-span-1 bg-[#0a0520] border border-cyan-500/12 rounded-lg p-4">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
            <Users size={14} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Joueurs ({players.length})</span>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#160b3a] border border-cyan-500/20 rounded text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {filteredPlayers.map(player => (
                <div key={player.id} className="bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg overflow-hidden hover:border-cyan-500/25 transition-colors">
                  <div className="p-3 border-b border-white/5">
                    <div className="font-bold text-slate-200 text-sm">{player.username}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{player.total_points.toLocaleString()} pts • {player.planets.length} planète(s)</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {player.planets.length > 0 ? player.planets.map(planet => (
                      <button
                        key={planet.id}
                        onClick={() => handleSelectPlayer(player, planet.id)}
                        className={`w-full text-left p-2 px-4 transition-all hover:bg-cyan-500/5 ${
                          selectedPlayer?.id === player.id && planetData?.id === planet.id
                            ? 'bg-cyan-500/10'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-slate-200 font-medium">{planet.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">[{planet.galaxy}:{planet.system}:{planet.position}]</div>
                          </div>
                          <Edit size={12} className="text-slate-500" />
                        </div>
                      </button>
                    )) : (
                      <div className="p-2 px-4 text-xs text-slate-600 italic">Aucune planète</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau d'édition */}
        <div className="lg:col-span-2 bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <Edit size={14} className="text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                {selectedPlayer ? `Édition : ${selectedPlayer.username}` : 'Sélectionner un joueur'}
              </span>
            </div>
            {selectedPlayer && (
              <button
                onClick={() => {
                  setSelectedPlayer(null);
                  setPlanetData(null);
                }}
                className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div>
            {loading ? (
              <div className="text-center py-12 text-slate-500">Chargement...</div>
            ) : !planetData ? (
              <div className="text-center py-12 text-slate-600">
                <Database size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Sélectionnez un joueur pour modifier ses données</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* RESSOURCES */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Ressources</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Métal</label>
                      <Input
                        type="number"
                        value={editedData.metal_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, metal_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-orange-500/30 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Cristal</label>
                      <Input
                        type="number"
                        value={editedData.crystal_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, crystal_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-cyan-500/30 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Deutérium</label>
                      <Input
                        type="number"
                        value={editedData.deuterium_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, deuterium_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-green-500/30 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>La modification des ressources mettra automatiquement <code className="bg-black/40 px-1 rounded">last_update</code> à <code className="bg-black/40 px-1 rounded">NOW()</code> pour éviter les bugs de génération.</span>
                  </div>
                </div>

                {/* MINES */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Mines</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mine Métal</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.metal_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, metal_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mine Cristal</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.crystal_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, crystal_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Synth. Deut.</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.deuterium_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, deuterium_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Centrale</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.solar_plant_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, solar_plant_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* INSTALLATIONS */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Installations</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Chantier</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.shipyard_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, shipyard_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Labo</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.research_lab_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, research_lab_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Hangar</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.hangar_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, hangar_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Stockage</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.resource_storage_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, resource_storage_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Fusion</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.fusion_plant_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, fusion_plant_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* TECHNOLOGIES */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Technologies</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'energy_tech_level', label: 'Énergie' },
                      { key: 'laser_battery_level', label: 'Laser' },
                      { key: 'armour_tech_level', label: 'Blindage' },
                      { key: 'weapons_tech_level', label: 'Armes' },
                      { key: 'shield_tech_level', label: 'Bouclier' },
                      { key: 'espionage_tech_level', label: 'Espionnage' },
                      { key: 'computer_tech_level', label: 'Informatique' },
                      { key: 'hyperspace_tech_level', label: 'Hyperespace' },
                      { key: 'plasma_tech_level', label: 'Plasma' },
                      { key: 'astrophysics_level', label: 'Astrophysique' },
                      { key: 'graviton_tech_level', label: 'Graviton' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-xs text-slate-500 mb-1 block">{item.label}</label>
                        <Input
                          type="number"
                          min="0"
                          value={(editedData as any)[item.key] ?? 0}
                          onChange={(e) => setEditedData({...editedData, [item.key]: parseInt(e.target.value) || 0})}
                          className="bg-black/40 border-white/10 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FLOTTE */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Flotte</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'light_hunter_count', label: 'Chasseurs Légers' },
                      { key: 'heavy_hunter_count', label: 'Chasseurs Lourds' },
                      { key: 'cruiser_count', label: 'Croiseurs' },
                      { key: 'battleship_count', label: 'Cuirassés' },
                      { key: 'bomber_count', label: 'Bombardiers' },
                      { key: 'destroyer_count', label: 'Destroyers' },
                      { key: 'recycler_count', label: 'Recycleurs' },
                      { key: 'spy_probe_count', label: 'Sondes' },
                      { key: 'colony_ship_count', label: 'Colons' },
                      { key: 'transporter_count', label: 'Transporteurs' },
                      { key: 'deathstar_count', label: 'Étoile de la Mort' },
                      { key: 'grand_cargo_count', label: 'Grands Cargos' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-xs text-slate-500 mb-1 block">{item.label}</label>
                        <Input
                          type="number"
                          min="0"
                          value={(editedData as any)[item.key] ?? 0}
                          onChange={(e) => setEditedData({...editedData, [item.key]: parseInt(e.target.value) || 0})}
                          className="bg-black/40 border-white/10 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* DÉFENSES */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2 mb-3">Défenses</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'rocket_launcher_count', label: 'Lance-Roquettes' },
                      { key: 'light_laser_count', label: 'Laser Léger' },
                      { key: 'heavy_laser_count', label: 'Laser Lourd' },
                      { key: 'gauss_cannon_count', label: 'Canon Gauss' },
                      { key: 'ion_cannon_count', label: 'Canon Ions' },
                      { key: 'plasma_turret_count', label: 'Tourelle Plasma' },
                      { key: 'small_shield_count', label: 'Petit Bouclier' },
                      { key: 'large_shield_count', label: 'Grand Bouclier' },
                      { key: 'anti_missile_count', label: 'Anti-Missile' },
                      { key: 'interplanetary_missile_count', label: 'Missile IP' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-xs text-slate-500 mb-1 block">{item.label}</label>
                        <Input
                          type="number"
                          min="0"
                          value={(editedData as any)[item.key] ?? 0}
                          onChange={(e) => setEditedData({...editedData, [item.key]: parseInt(e.target.value) || 0})}
                          className="bg-black/40 border-white/10 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOUTONS */}
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={handleSaveChanges}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all disabled:opacity-50"
                  >
                    <Save size={13} />
                    Enregistrer les modifications
                  </button>
                  <button
                    onClick={() => setEditedData(planetData)}
                    className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ONGLET GESTION UTILISATEURS (unchanged) */}
      {activeTab === 'users' && (
        <div className="bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
            <Settings size={14} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Gestion des Utilisateurs</span>
          </div>
          <div className="space-y-2">
            {/* Liste des utilisateurs */}
            {players.map((player) => (
              <div
                key={player.id}
                className="p-3 bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/25 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-200 text-sm">{player.username}</span>
                      <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[9px] font-mono border border-cyan-500/20">
                        {player.id.substring(0, 8)}...
                      </span>
                      {player.role === 'admin' && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded text-[9px] font-bold border border-yellow-500/30 uppercase tracking-wide">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="font-mono">{player.email}</span>
                      <span className="text-cyan-400">{player.planets.length} planète(s)</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button
                      className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                      onClick={async () => {
                        const newPassword = prompt('Nouveau mot de passe (min. 6 caractères):');
                        if (!newPassword || newPassword.length < 6) { toast.error('Mot de passe invalide'); return; }
                        try {
                          const res = await fetch(apiUrl(`/admin/user/${player.id}/reset-password?user_id=${userId}`), {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ new_password: newPassword })
                          });
                          if (res.ok) toast.success('Mot de passe réinitialisé');
                          else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                        } catch { toast.error('Erreur réseau'); }
                      }}
                    >
                      MDP
                    </button>
                    <button
                      className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                      onClick={async () => {
                        const newUsername = prompt('Nouveau nom d\'utilisateur:', player.username);
                        if (!newUsername || newUsername.trim() === '') { toast.error('Nom invalide'); return; }
                        try {
                          const res = await fetch(apiUrl(`/admin/user/${player.id}/username?user_id=${userId}`), {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: newUsername })
                          });
                          if (res.ok) { toast.success('Nom modifié'); fetchPlayers(); }
                          else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                        } catch { toast.error('Erreur réseau'); }
                      }}
                    >
                      Nom
                    </button>
                    <button
                      className="px-2.5 py-1 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                      onClick={async () => {
                        const newEmail = prompt('Nouvel email:', player.email);
                        if (!newEmail || !newEmail.includes('@')) { toast.error('Email invalide'); return; }
                        try {
                          const res = await fetch(apiUrl(`/admin/user/${player.id}/email?user_id=${userId}`), {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: newEmail })
                          });
                          if (res.ok) { toast.success('Email modifié'); fetchPlayers(); }
                          else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                        } catch { toast.error('Erreur réseau'); }
                      }}
                    >
                      Email
                    </button>
                    <button
                      className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                      onClick={async () => {
                        const current = player.syndicate_credits ?? 0;
                        const newVal = prompt(`SC pour ${player.username} (actuel: ${current}):`, String(current));
                        if (newVal === null) return;
                        const parsed = parseFloat(newVal);
                        if (isNaN(parsed) || parsed < 0) { toast.error('Valeur invalide'); return; }
                        try {
                          const res = await fetch(apiUrl(`/admin/user/${player.id}/syndicate-credits?user_id=${userId}`), {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ syndicate_credits: parsed })
                          });
                          if (res.ok) { toast.success(`SC: ${parsed}`); fetchPlayers(); }
                          else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                        } catch { toast.error('Erreur réseau'); }
                      }}
                    >
                      SC: {player.syndicate_credits?.toFixed(0) ?? 0}
                    </button>
                    <button
                      className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded transition-all ${
                        player.role === 'admin'
                          ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                          : 'bg-slate-500/10 border border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
                      }`}
                      onClick={() => {
                        const newRole = player.role === 'admin' ? 'user' : 'admin';
                        setConfirmState({
                          open: true,
                          title: newRole === 'admin' ? 'Promouvoir Admin' : 'Rétrograder en User',
                          message: `Voulez-vous ${newRole === 'admin' ? 'promouvoir' : 'rétrograder'} ${player.username} en ${newRole} ?`,
                          variant: newRole === 'admin' ? 'default' : 'danger',
                          onConfirm: async () => {
                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}/role?user_id=${userId}`), {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: newRole }),
                              });
                              if (res.ok) { toast.success(`Rôle mis à jour: ${newRole}`); fetchPlayers(); }
                              else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                            } catch { toast.error('Erreur réseau'); }
                          },
                        });
                      }}
                    >
                      {player.role === 'admin' ? 'Admin' : 'User'}
                    </button>
                    <button
                      className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
                      onClick={() => {
                        setConfirmState({
                          open: true,
                          title: 'Supprimer l\'utilisateur',
                          message: `Voulez-vous vraiment supprimer l'utilisateur ${player.username} ? Cette action est IRRÉVERSIBLE.`,
                          variant: 'danger',
                          onConfirm: async () => {
                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}?user_id=${userId}`), {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (res.ok) { toast.success('Utilisateur supprimé'); fetchPlayers(); }
                              else { const err = await res.json(); toast.error(err.error || 'Erreur'); }
                            } catch { toast.error('Erreur réseau'); }
                          },
                        });
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Create New Announcement */}
          <div className="bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
              <Radio size={14} className="text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Créer une Nouvelle Annonce</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">
                  Titre
                </label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="bg-black/40 border-emerald-500/30 text-white font-mono"
                  placeholder="Titre de l'annonce..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">
                  Contenu
                </label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  className="w-full bg-black/40 border border-emerald-500/30 text-white font-mono p-2 rounded-md min-h-[100px]"
                  placeholder="Contenu de l'annonce..."
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    className="w-full bg-black/40 border border-emerald-500/30 text-white font-mono p-2 rounded-md"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Avertissement</option>
                    <option value="danger">Danger</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAnnouncement.is_active}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </label>
                </div>
              </div>
              <button
                onClick={createAnnouncement}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase tracking-wide rounded transition-all"
              >
                <Save size={13} />
                Créer l'Annonce
              </button>
            </div>
          </div>

          {/* List of Announcements */}
          <div className="bg-[#0a0520] border border-cyan-500/12 rounded-lg p-5">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-4">
              <Radio size={14} className="text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Annonces Existantes ({announcements.length})</span>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Aucune annonce pour le moment
                </div>
              ) : (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-[#160b3a]/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/25 transition-colors"
                  >
                    {editingAnnouncement?.id === announcement.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <Input
                          value={editingAnnouncement.title}
                          onChange={(e) =>
                            setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                          }
                          className="bg-black/40 text-white font-mono"
                        />
                        <textarea
                          value={editingAnnouncement.content}
                          onChange={(e) =>
                            setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 text-white font-mono p-2 rounded-md min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editingAnnouncement.announcement_type}
                            onChange={(e) =>
                              setEditingAnnouncement({ ...editingAnnouncement, announcement_type: e.target.value })
                            }
                            className="bg-black/40 border border-white/10 text-white font-mono p-2 rounded-md"
                          >
                            <option value="info">Info</option>
                            <option value="warning">Avertissement</option>
                            <option value="danger">Danger</option>
                          </select>
                          <label className="flex items-center gap-2 text-sm text-slate-400">
                            <input
                              type="checkbox"
                              checked={editingAnnouncement.is_active}
                              onChange={(e) =>
                                setEditingAnnouncement({ ...editingAnnouncement, is_active: e.target.checked })
                              }
                              className="w-4 h-4"
                            />
                            Active
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateAnnouncement(announcement.id, editingAnnouncement)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/60 transition-all"
                          >
                            <Save size={14} />
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditingAnnouncement(null)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300 transition-all"
                          >
                            <X size={14} />
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">
                              {announcement.title}
                            </h3>
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                announcement.is_active
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}
                            >
                              {announcement.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 font-mono">
                              {announcement.announcement_type}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">{announcement.content}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            Créée le {new Date(announcement.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAnnouncement(announcement)}
                            className="p-1.5 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() =>
                              updateAnnouncement(announcement.id, { is_active: !announcement.is_active })
                            }
                            className={`p-1.5 rounded border transition-all ${
                              announcement.is_active
                                ? 'border-orange-500/30 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400/50'
                                : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400/50'
                            }`}
                          >
                            {announcement.is_active ? <AlertTriangle size={14} /> : <Zap size={14} />}
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(announcement.id)}
                            className="p-1.5 rounded border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-400/50 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      {activeTab === 'content' && (
        <AdminContentManager />
      )}

      {/* TAB BLACK MARKET */}
      {activeTab === 'black_market' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-950/40 border border-red-700/40">
                <Skull size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Marché Underground</h2>
                <p className="text-xs text-slate-500">Gestion des objets du marché noir</p>
              </div>
            </div>
            <button
              onClick={fetchBmItems}
              disabled={bmLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={bmLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          {/* Create new item form */}
          <Card className="bg-slate-950/60 border-red-700/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Plus size={14} />
                Nouvel objet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Nom</label>
                  <Input
                    value={bmNewItem.name}
                    onChange={(e) => setBmNewItem({ ...bmNewItem, name: e.target.value })}
                    placeholder="Frappe Orbitale Anonyme"
                    className="bg-black/40 border-red-700/20 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Clé image</label>
                  <Input
                    value={bmNewItem.image_key}
                    onChange={(e) => setBmNewItem({ ...bmNewItem, image_key: e.target.value })}
                    placeholder="orbital_strike"
                    className="bg-black/40 border-red-700/20 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Description</label>
                <Input
                  value={bmNewItem.description}
                  onChange={(e) => setBmNewItem({ ...bmNewItem, description: e.target.value })}
                  placeholder="Envoie une flotte de pirates anonyme..."
                  className="bg-black/40 border-red-700/20 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Type d'effet</label>
                  <select
                    value={bmNewItem.effect_type}
                    onChange={(e) => setBmNewItem({ ...bmNewItem, effect_type: e.target.value })}
                    className="w-full bg-black/40 border border-red-700/20 text-white text-sm rounded-md px-3 py-2"
                  >
                    <option value="orbital_strike">orbital_strike</option>
                    <option value="resource_boost">resource_boost</option>
                    <option value="stealth">stealth</option>
                    <option value="coordinate_jam">coordinate_jam</option>
                    <option value="eco_virus">eco_virus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Prix de base (SC)</label>
                  <Input
                    type="number"
                    value={bmNewItem.base_price}
                    onChange={(e) => setBmNewItem({ ...bmNewItem, base_price: Number(e.target.value) })}
                    className="bg-black/40 border-red-700/20 text-white text-sm"
                  />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bmNewItem.is_active}
                      onChange={(e) => setBmNewItem({ ...bmNewItem, is_active: e.target.checked })}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span className="text-sm text-slate-300">Actif</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Paramètres d'effet (JSON)</label>
                <textarea
                  value={bmNewItem.effect_params}
                  onChange={(e) => setBmNewItem({ ...bmNewItem, effect_params: e.target.value })}
                  rows={2}
                  className="w-full bg-black/40 border border-red-700/20 text-white font-mono text-xs p-2 rounded-md resize-none"
                  placeholder='{"flight_hours": 12}'
                />
              </div>
              <button
                onClick={createBmItem}
                disabled={!bmNewItem.name || bmLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                <Plus size={14} />
                Créer l'objet
              </button>
            </CardContent>
          </Card>

          {/* Items list */}
          <div className="space-y-3">
            {bmLoading && (
              <div className="text-center py-8 text-slate-500 text-sm">
                <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                Chargement...
              </div>
            )}
            {!bmLoading && bmItems.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-sm border border-slate-800 rounded-xl">
                Aucun objet trouvé
              </div>
            )}
            {bmItems.map((item) => (
              <Card key={item.id} className={`bg-slate-950/60 ${item.is_active ? 'border-red-700/20' : 'border-slate-800/40'}`}>
                <CardContent className="p-4">
                  {bmEditingItem?.id === item.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Nom</label>
                          <Input
                            value={bmEditingItem.name}
                            onChange={(e) => setBmEditingItem({ ...bmEditingItem, name: e.target.value })}
                            className="bg-black/40 border-red-700/20 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Clé image</label>
                          <Input
                            value={bmEditingItem.image_key}
                            onChange={(e) => setBmEditingItem({ ...bmEditingItem, image_key: e.target.value })}
                            className="bg-black/40 border-red-700/20 text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Description</label>
                        <Input
                          value={bmEditingItem.description}
                          onChange={(e) => setBmEditingItem({ ...bmEditingItem, description: e.target.value })}
                          className="bg-black/40 border-red-700/20 text-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Type d'effet</label>
                          <select
                            value={bmEditingItem.effect_type}
                            onChange={(e) => setBmEditingItem({ ...bmEditingItem, effect_type: e.target.value })}
                            className="w-full bg-black/40 border border-red-700/20 text-white text-sm rounded-md px-3 py-2"
                          >
                            <option value="orbital_strike">orbital_strike</option>
                            <option value="resource_boost">resource_boost</option>
                            <option value="stealth">stealth</option>
                            <option value="coordinate_jam">coordinate_jam</option>
                            <option value="eco_virus">eco_virus</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Prix de base (SC)</label>
                          <Input
                            type="number"
                            value={bmEditingItem.base_price}
                            onChange={(e) => setBmEditingItem({ ...bmEditingItem, base_price: Number(e.target.value) })}
                            className="bg-black/40 border-red-700/20 text-white text-sm"
                          />
                        </div>
                        <div className="flex items-end gap-2 pb-0.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bmEditingItem.is_active}
                              onChange={(e) => setBmEditingItem({ ...bmEditingItem, is_active: e.target.checked })}
                              className="w-4 h-4 accent-red-600"
                            />
                            <span className="text-sm text-slate-300">Actif</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Paramètres d'effet (JSON)</label>
                        <textarea
                          value={typeof bmEditingItem.effect_params === 'string' ? bmEditingItem.effect_params : JSON.stringify(bmEditingItem.effect_params, null, 2)}
                          onChange={(e) => setBmEditingItem({ ...bmEditingItem, effect_params: e.target.value })}
                          rows={2}
                          className="w-full bg-black/40 border border-red-700/20 text-white font-mono text-xs p-2 rounded-md resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={updateBmItem}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-bold transition-all"
                        >
                          <Save size={12} />
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setBmEditingItem(null)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 text-xs transition-all"
                        >
                          <X size={12} />
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${item.is_active ? 'text-white' : 'text-slate-500'}`}>{item.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-red-950/40 text-red-400 border border-red-800/30">{item.effect_type}</span>
                          {!item.is_active && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 border border-slate-700/30">inactif</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-2 truncate">{item.description}</p>
                        <div className="flex items-center gap-4 text-[10px] text-slate-600">
                          <span>Base: <span className="text-yellow-600 font-mono font-bold">{item.base_price} SC</span></span>
                          <span>Actuel: <span className="text-yellow-500 font-mono font-bold">{Number(item.current_price).toFixed(0)} SC</span></span>
                          <span className="font-mono text-slate-700 truncate max-w-[180px]">{JSON.stringify(item.effect_params)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setBmEditingItem({ ...item, effect_params: JSON.stringify(item.effect_params) })}
                          className="p-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-white transition-all"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => deleteBmItem(item.id)}
                          className="p-1.5 rounded-lg border border-red-900/30 bg-red-950/20 hover:bg-red-900/30 text-red-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* TAB PVE EVENTS */}
      {activeTab === 'pve_events' && (
        <AdminPvePanel />
      )}

      {/* TAB GOVERNANCE */}
      {activeTab === 'governance' && (
        <AdminGovernancePanel />
      )}

      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({ ...s, open: false })); }}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />
    </div>
  );
}

// ─── Admin PVE Panel ──────────────────────────────────────────────────────────

function AdminPvePanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    event_type_key: '',
    affected_galaxy: '',
    affected_system: '',
    radius: '0',
    starts_in_minutes: '60',
    duration_hours: '24',
    narrative: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evRes, tyRes] = await Promise.all([
        fetch(apiUrl('/admin/server-events?limit=20')),
        fetch(apiUrl('/admin/server-event-types')),
      ]);
      if (evRes.ok) setEvents((await evRes.json()).events ?? []);
      if (tyRes.ok) setTypes((await tyRes.json()).types ?? []);
    } catch (e) {
      toast.error('Erreur chargement PVE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!createForm.event_type_key) { toast.error('Sélectionnez un type'); return; }
    try {
      const res = await fetch(apiUrl('/admin/server-events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type_key: createForm.event_type_key,
          affected_galaxy: createForm.affected_galaxy ? parseInt(createForm.affected_galaxy) : null,
          affected_system: createForm.affected_system ? parseInt(createForm.affected_system) : null,
          radius: parseInt(createForm.radius) || 0,
          starts_in_minutes: parseInt(createForm.starts_in_minutes) || 60,
          duration_hours: parseInt(createForm.duration_hours) || 24,
          narrative: createForm.narrative || null,
        }),
      });
      if (res.ok) {
        toast.success('Événement créé !');
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Erreur création');
      }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleCancel = async (id: string) => {
    const res = await fetch(apiUrl(`/admin/server-events/${id}/cancel`), { method: 'PATCH' });
    if (res.ok) { toast.success('Événement annulé'); fetchAll(); }
    else toast.error('Erreur annulation');
  };

  const handleResolve = async (id: string) => {
    const res = await fetch(apiUrl(`/admin/server-events/${id}/resolve`), { method: 'PATCH' });
    if (res.ok) { toast.success('Événement résolu'); fetchAll(); }
    else toast.error('Erreur résolution');
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'text-green-400 bg-green-400/10';
    if (s === 'incoming') return 'text-amber-400 bg-amber-400/10';
    if (s === 'resolved') return 'text-blue-400 bg-blue-400/10';
    return 'text-slate-400 bg-slate-400/10';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-950/40 border border-orange-700/40">
            <Swords size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Événements Serveur PVE</h2>
            <p className="text-xs text-slate-500">Déclenchez des événements collectifs affectant la galaxie</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}
          className="bg-slate-900/50 border-white/10 hover:bg-slate-800">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Formulaire création */}
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Plus size={14} /> Créer un événement
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type *</label>
            <select
              value={createForm.event_type_key}
              onChange={e => setCreateForm(f => ({ ...f, event_type_key: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">— sélectionner —</option>
              {types.filter(t => t.is_active).map((t: any) => (
                <option key={t.type_key} value={t.type_key}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Galaxie (vide = serveur entier)</label>
            <Input type="number" placeholder="ex: 3" value={createForm.affected_galaxy}
              onChange={e => setCreateForm(f => ({ ...f, affected_galaxy: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white text-sm h-8" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Système</label>
            <Input type="number" placeholder="ex: 42" value={createForm.affected_system}
              onChange={e => setCreateForm(f => ({ ...f, affected_system: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white text-sm h-8" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Rayon (systèmes)</label>
            <Input type="number" value={createForm.radius}
              onChange={e => setCreateForm(f => ({ ...f, radius: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white text-sm h-8" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Démarrage dans (min)</label>
            <Input type="number" value={createForm.starts_in_minutes}
              onChange={e => setCreateForm(f => ({ ...f, starts_in_minutes: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white text-sm h-8" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Durée (heures)</label>
            <Input type="number" value={createForm.duration_hours}
              onChange={e => setCreateForm(f => ({ ...f, duration_hours: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white text-sm h-8" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Narrative (optionnel)</label>
          <Input placeholder="Message narratif affiché aux joueurs..." value={createForm.narrative}
            onChange={e => setCreateForm(f => ({ ...f, narrative: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white text-sm" />
        </div>
        <Button onClick={handleCreate} className="bg-orange-700 hover:bg-orange-600 text-white">
          <Swords size={14} className="mr-2" /> Déclencher l'événement
        </Button>
      </div>

      {/* Liste événements récents */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-300">Événements récents</h3>
        {events.length === 0 && !loading && (
          <p className="text-xs text-slate-500 py-4 text-center">Aucun événement</p>
        )}
        {events.map((ev: any) => (
          <div key={ev.id} className="flex items-center gap-3 bg-slate-900/50 border border-white/5 rounded-lg px-4 py-3">
            <span className="text-xl">{ev.icon ?? '🌌'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">{ev.name ?? ev.event_type_key}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor(ev.status)}`}>
                  {ev.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Zone : {ev.zone ?? 'N/A'} — HP : {ev.hp_current?.toLocaleString() ?? 0} / {ev.hp_max?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {(ev.status === 'active' || ev.status === 'incoming') && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleResolve(ev.id)}
                    className="h-7 text-xs bg-blue-950/40 border-blue-700/40 text-blue-300 hover:bg-blue-900/40">
                    Résoudre
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCancel(ev.id)}
                    className="h-7 text-xs bg-red-950/40 border-red-700/40 text-red-300 hover:bg-red-900/40">
                    Annuler
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Types d'événements */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-300">Types configurés</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {types.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${t.is_active ? 'bg-slate-900/50 border-white/5' : 'bg-slate-950/50 border-white/5 opacity-50'}`}>
              <span className="text-lg">{t.icon ?? '🌌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-slate-500 truncate">{t.description ?? t.type_key}</p>
              </div>
              <span className="text-xs text-slate-500">{t.default_duration_hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant helper pour les inputs de configuration
interface ConfigInputProps {
  label: string;
  configKey: string;
  value: string;
  onChange: (value: string) => void;
  color: 'indigo' | 'purple' | 'green' | 'cyan' | 'orange' | 'red' | 'yellow';
  description?: string;
  compact?: boolean;
  step?: string;
}

function ConfigInput({ label, value, onChange, color, description, compact, step = "0.1" }: ConfigInputProps) {
  const colorClasses = {
    indigo: 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400',
    purple: 'bg-purple-950/20 border-purple-500/30 text-purple-400',
    green: 'bg-green-950/20 border-green-500/30 text-green-400',
    cyan: 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400',
    orange: 'bg-orange-950/20 border-orange-500/30 text-orange-400',
    red: 'bg-red-950/20 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-950/20 border-yellow-500/30 text-yellow-400',
  };

  const inputColorClasses = {
    indigo: 'border-indigo-500/30 focus:border-indigo-500',
    purple: 'border-purple-500/30 focus:border-purple-500',
    green: 'border-green-500/30 focus:border-green-500',
    cyan: 'border-cyan-500/30 focus:border-cyan-500',
    orange: 'border-orange-500/30 focus:border-orange-500',
    red: 'border-red-500/30 focus:border-red-500',
    yellow: 'border-yellow-500/30 focus:border-yellow-500',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-${compact ? '3' : '4'}`}>
      <label className={`text-${compact ? '[10px]' : 'xs'} ${colorClasses[color].split(' ')[2]} font-bold mb-2 block uppercase tracking-wider`}>
        {label}
      </label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-black/40 ${inputColorClasses[color]} text-white font-mono ${compact ? 'text-sm' : 'text-lg'} transition-all`}
      />
      {description && !compact && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

// ─── Admin Governance Panel ────────────────────────────────────────────────────

const GOVERNANCE_EFFECT_KEYS = [
  { value: 'production_speed_multiplier', label: 'Production' },
  { value: 'building_speed_multiplier', label: 'Construction' },
  { value: 'research_speed_multiplier', label: 'Recherche' },
  { value: 'ship_build_speed_multiplier', label: 'Vaisseaux' },
  { value: 'expedition_syndicate_credit_chance', label: 'Crédits Syndicat' },
] as const;

interface AdminLaw {
  id: string;
  title: string;
  status: string;
  yes_count: number;
  no_count: number;
  vote_end: string;
}

interface AdminSurvey {
  id: string;
  title: string;
  status: string;
  ends_at: string;
}

interface LawEffectForm {
  config_key: string;
  operation: 'multiply' | 'add';
  delta: number;
  duration_hours: number | '';
}

function AdminGovernancePanel() {
  const token = localStorage.getItem('token') || '';
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // --- Laws state ---
  const [laws, setLaws] = useState<AdminLaw[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(false);
  const [lawForm, setLawForm] = useState({
    title: '',
    description: '',
    vote_end: '',
    effects: [{ config_key: 'production_speed_multiplier', operation: 'multiply' as const, delta: 1.5, duration_hours: 48 as number | '' }] as LawEffectForm[],
  });

  // --- Surveys state ---
  const [surveys, setSurveys] = useState<AdminSurvey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [surveyForm, setSurveyForm] = useState({
    title: '',
    description: '',
    survey_type: 'yes_no' as 'yes_no' | 'multiple_choice' | 'rating',
    options: '',
    ends_at: '',
  });

  // --- Confirm ---
  const [govConfirm, setGovConfirm] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setGovConfirm({ open: true, title, message, onConfirm });
  };

  const fetchLaws = async () => {
    setLoadingLaws(true);
    try {
      const res = await fetch(apiUrl('/admin/laws'), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLaws(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger les lois');
    } finally {
      setLoadingLaws(false);
    }
  };

  const fetchSurveys = async () => {
    setLoadingSurveys(true);
    try {
      const res = await fetch(apiUrl('/admin/surveys'), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSurveys(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger les sondages');
    } finally {
      setLoadingSurveys(false);
    }
  };

  useEffect(() => {
    fetchLaws();
    fetchSurveys();
  }, []);

  // --- Law form handlers ---
  const addEffect = () => {
    setLawForm((f) => ({
      ...f,
      effects: [...f.effects, { config_key: 'production_speed_multiplier', operation: 'multiply', delta: 1.0, duration_hours: '' }],
    }));
  };

  const removeEffect = (i: number) => {
    setLawForm((f) => ({ ...f, effects: f.effects.filter((_, idx) => idx !== i) }));
  };

  const updateEffect = (i: number, patch: Partial<LawEffectForm>) => {
    setLawForm((f) => ({
      ...f,
      effects: f.effects.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  };

  const handleCreateLaw = async () => {
    if (!lawForm.title || !lawForm.vote_end) {
      toast.error('Titre et date de fin de vote requis');
      return;
    }
    try {
      const payload = {
        ...lawForm,
        effects: lawForm.effects.map((e) => ({
          ...e,
          duration_hours: e.duration_hours === '' ? null : e.duration_hours,
        })),
      };
      const res = await fetch(apiUrl('/admin/laws'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur création loi');
      toast.success('Loi créée');
      setLawForm({ title: '', description: '', vote_end: '', effects: [{ config_key: 'production_speed_multiplier', operation: 'multiply', delta: 1.5, duration_hours: 48 }] });
      fetchLaws();
    } catch {
      toast.error('Impossible de créer la loi');
    }
  };

  const patchLaw = async (id: string, status: string) => {
    try {
      const res = await fetch(apiUrl(`/admin/laws/${id}`), {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Loi mise à jour: ${status}`);
      fetchLaws();
    } catch {
      toast.error('Impossible de mettre à jour la loi');
    }
  };

  const deleteLaw = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/admin/laws/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Loi supprimée');
      fetchLaws();
    } catch {
      toast.error('Impossible de supprimer la loi');
    }
  };

  // --- Survey form handlers ---
  const handleCreateSurvey = async () => {
    if (!surveyForm.title || !surveyForm.ends_at) {
      toast.error('Titre et date de fin requis');
      return;
    }
    try {
      const payload = {
        ...surveyForm,
        options: surveyForm.survey_type === 'multiple_choice'
          ? surveyForm.options.split(',').map((o) => o.trim()).filter(Boolean)
          : [],
      };
      const res = await fetch(apiUrl('/admin/surveys'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success('Sondage créé');
      setSurveyForm({ title: '', description: '', survey_type: 'yes_no', options: '', ends_at: '' });
      fetchSurveys();
    } catch {
      toast.error('Impossible de créer le sondage');
    }
  };

  const patchSurvey = async (id: string, status: string) => {
    try {
      const res = await fetch(apiUrl(`/admin/surveys/${id}`), {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Sondage: ${status}`);
      fetchSurveys();
    } catch {
      toast.error('Impossible de mettre à jour le sondage');
    }
  };

  const deleteSurvey = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/admin/surveys/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Sondage supprimé');
      fetchSurveys();
    } catch {
      toast.error('Impossible de supprimer le sondage');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    voting: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    passed: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-red-400 bg-red-500/10 border-red-500/30',
    expired: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    cancelled: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    active: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    closed: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    archived: 'text-slate-500 bg-slate-700/10 border-slate-600/30',
  };

  return (
    <div className="space-y-8">
      {/* ── LOIS ── */}
      <Card className="bg-gradient-to-br from-slate-950 to-yellow-950/10 border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-300">
            <Scale size={18} />
            Lois &amp; Propositions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create law form */}
          <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Nouvelle proposition de loi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Titre</label>
                <Input
                  value={lawForm.title}
                  onChange={(e) => setLawForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Titre de la loi"
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Fin du vote (datetime-local)</label>
                <Input
                  type="datetime-local"
                  value={lawForm.vote_end}
                  onChange={(e) => setLawForm((f) => ({ ...f, vote_end: e.target.value }))}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <textarea
                value={lawForm.description}
                onChange={(e) => setLawForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description détaillée..."
                rows={2}
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            {/* Effects builder */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Effets</label>
              {lawForm.effects.map((effect, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <select
                    value={effect.config_key}
                    onChange={(e) => updateEffect(i, { config_key: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {GOVERNANCE_EFFECT_KEYS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                  <select
                    value={effect.operation}
                    onChange={(e) => updateEffect(i, { operation: e.target.value as 'multiply' | 'add' })}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="multiply">×</option>
                    <option value="add">+</option>
                  </select>
                  <input
                    type="number"
                    value={effect.delta}
                    onChange={(e) => updateEffect(i, { delta: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    min="0"
                    className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Durée (h, vide=permanent)"
                    value={effect.duration_hours}
                    onChange={(e) => updateEffect(i, { duration_hours: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    className="w-40 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeEffect(i)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1.5 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addEffect}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                Ajouter effet
              </button>
            </div>

            <Button onClick={handleCreateLaw} className="bg-yellow-700 hover:bg-yellow-600 text-white">
              <Plus size={14} className="mr-1" />
              Créer la loi
            </Button>
          </div>

          {/* Laws list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Toutes les lois ({laws.length})</h3>
            {loadingLaws ? (
              <p className="text-xs text-slate-500">Chargement...</p>
            ) : laws.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucune loi</p>
            ) : (
              laws.map((law) => (
                <div key={law.id} className="flex flex-wrap items-center gap-2 bg-slate-900/40 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-white flex-1 min-w-0 truncate">{law.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold ${STATUS_COLORS[law.status] || 'text-slate-400 border-slate-600'}`}>
                    {law.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {law.yes_count}✓ / {law.no_count}✗
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchLaw(law.id, 'passed')}
                    className="text-xs h-7 bg-emerald-900/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40"
                  >
                    Forcer passage
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchLaw(law.id, 'cancelled')}
                    className="text-xs h-7 bg-orange-900/20 border-orange-500/30 text-orange-300 hover:bg-orange-900/40"
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfirm('Supprimer la loi', `Supprimer "${law.title}" ?`, () => deleteLaw(law.id))}
                    className="text-xs h-7 bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/40"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SONDAGES ── */}
      <Card className="bg-gradient-to-br from-slate-950 to-blue-950/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <BarChart3 size={18} />
            Sondages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create survey form */}
          <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Nouveau sondage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Titre</label>
                <Input
                  value={surveyForm.title}
                  onChange={(e) => setSurveyForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Titre du sondage"
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Type</label>
                <select
                  value={surveyForm.survey_type}
                  onChange={(e) => setSurveyForm((f) => ({ ...f, survey_type: e.target.value as 'yes_no' | 'multiple_choice' | 'rating' }))}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="yes_no">Oui / Non</option>
                  <option value="multiple_choice">Choix multiple</option>
                  <option value="rating">Note (1-5)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <textarea
                value={surveyForm.description}
                onChange={(e) => setSurveyForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description..."
                rows={2}
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            {surveyForm.survey_type === 'multiple_choice' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Options (séparées par des virgules)</label>
                <Input
                  value={surveyForm.options}
                  onChange={(e) => setSurveyForm((f) => ({ ...f, options: e.target.value }))}
                  placeholder="Option A, Option B, Option C"
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fin du sondage</label>
              <Input
                type="datetime-local"
                value={surveyForm.ends_at}
                onChange={(e) => setSurveyForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <Button onClick={handleCreateSurvey} className="bg-blue-700 hover:bg-blue-600 text-white">
              <Plus size={14} className="mr-1" />
              Créer le sondage
            </Button>
          </div>

          {/* Surveys list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Tous les sondages ({surveys.length})</h3>
            {loadingSurveys ? (
              <p className="text-xs text-slate-500">Chargement...</p>
            ) : surveys.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucun sondage</p>
            ) : (
              surveys.map((survey) => (
                <div key={survey.id} className="flex flex-wrap items-center gap-2 bg-slate-900/40 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-white flex-1 min-w-0 truncate">{survey.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold ${STATUS_COLORS[survey.status] || 'text-slate-400 border-slate-600'}`}>
                    {survey.status.toUpperCase()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchSurvey(survey.id, 'closed')}
                    className="text-xs h-7 bg-slate-900/20 border-slate-500/30 text-slate-300 hover:bg-slate-800/40"
                  >
                    Fermer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchSurvey(survey.id, 'archived')}
                    className="text-xs h-7 bg-slate-900/20 border-slate-500/30 text-slate-400 hover:bg-slate-800/40"
                  >
                    Archiver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfirm('Supprimer le sondage', `Supprimer "${survey.title}" ?`, () => deleteSurvey(survey.id))}
                    className="text-xs h-7 bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/40"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Local confirm modal */}
      <ConfirmModal
        isOpen={govConfirm.open}
        title={govConfirm.title}
        message={govConfirm.message}
        variant="danger"
        onConfirm={() => { govConfirm.onConfirm(); setGovConfirm((s) => ({ ...s, open: false })); }}
        onCancel={() => setGovConfirm((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
