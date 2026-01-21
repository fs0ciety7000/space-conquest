-- Script pour corriger la planète mère (homeworld)
-- Remplace "Kepler Alpha" par le nom de la planète que vous voulez comme homeworld

BEGIN;

-- 1. Retirer le statut homeworld de toutes les planètes de l'utilisateur 'phantomhex'
UPDATE planet
SET is_homeworld = false
WHERE owner_id = (SELECT id FROM "user" WHERE username = 'phantomhex');

-- 2. Mettre Kepler Alpha comme homeworld
UPDATE planet
SET is_homeworld = true
WHERE owner_id = (SELECT id FROM "user" WHERE username = 'phantomhex')
  AND name LIKE '%Kepler Alpha%';

-- Vérifier le résultat
SELECT
    u.username,
    p.name,
    p.is_homeworld,
    p.created_at
FROM planet p
JOIN "user" u ON p.owner_id = u.id
WHERE u.username = 'phantomhex'
ORDER BY p.is_homeworld DESC, p.created_at ASC;

COMMIT;
