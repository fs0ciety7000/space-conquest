-- ============================================================================
-- SPACE CONQUEST - COMPENSATION PATCH
-- ============================================================================
-- Ce patch compense la perte de données lors de la migration
-- Applique des bonus à tous les joueurs
-- ============================================================================

BEGIN;

-- 1. Ajouter des ressources à toutes les planètes homeworld
UPDATE planet
SET
    metal_amount = metal_amount + 250000,
    crystal_amount = crystal_amount + 125000,
    deuterium_amount = deuterium_amount + 75000
WHERE is_homeworld = true;

-- 2. Augmenter les niveaux de mines (+2 niveaux à toutes les mines)
UPDATE planet_buildings pb
SET level = level + 2
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine')
  AND pb.planet_id IN (SELECT id FROM planet WHERE is_homeworld = true);

-- 3. Augmenter la centrale solaire (+5 niveaux)
UPDATE planet_buildings pb
SET level = level + 5
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key = 'solar_plant'
  AND pb.planet_id IN (SELECT id FROM planet WHERE is_homeworld = true);

-- 4. Ajuster la vitesse de construction à 300
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('construction_speed_multiplier', '300.0', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '300.0', updated_at = NOW();

-- Vérification
SELECT
    u.username,
    p.name,
    p.metal_amount,
    p.crystal_amount,
    p.deuterium_amount,
    (SELECT level FROM planet_buildings pb
     JOIN building_types bt ON pb.building_type_id = bt.id
     WHERE pb.planet_id = p.id AND bt.building_key = 'metal_mine' LIMIT 1) as metal_mine,
    (SELECT level FROM planet_buildings pb
     JOIN building_types bt ON pb.building_type_id = bt.id
     WHERE pb.planet_id = p.id AND bt.building_key = 'solar_plant' LIMIT 1) as solar_plant
FROM planet p
JOIN "user" u ON p.owner_id = u.id
WHERE p.is_homeworld = true
ORDER BY u.username;

COMMIT;

-- Message de fin
SELECT
    '✓ Patch appliqué avec succès!' as message,
    COUNT(DISTINCT p.owner_id) as joueurs_affectés
FROM planet p
WHERE p.is_homeworld = true;
