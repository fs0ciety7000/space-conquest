-- Migration: Ajout du champ created_at aux planètes pour déterminer la planète mère

-- Ajouter la colonne created_at
ALTER TABLE planet
ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Pour les planètes existantes, utiliser la date actuelle comme fallback
UPDATE planet
SET created_at = NOW()
WHERE created_at IS NULL;

-- Rendre le champ NOT NULL après avoir rempli les valeurs
ALTER TABLE planet
ALTER COLUMN created_at SET NOT NULL;
