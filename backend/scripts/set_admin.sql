-- Script pour définir phantomhex comme admin
-- Exécuter avec: psql -d space_conquest -f scripts/set_admin.sql

UPDATE users SET role = 'admin' WHERE id = '5c07a266-2739-4999-80c4-bcbf67b81466';

-- Vérification
SELECT id, username, role FROM users WHERE username = 'phantomhex';
