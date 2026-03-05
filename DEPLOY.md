# Deployment — Coolify + Cloudflare Tunnel

## Architecture

| Service   | Container port | Host port | Domaine                    |
|-----------|---------------|-----------|----------------------------|
| frontend  | 80            | 7001      | conquest.fs0ciety.org      |
| backend   | 8080          | 7002      | backend.fs0ciety.org       |
| postgres  | 5432          | 5433      | db2.fs0ciety.org (TCP)     |
| pgadmin   | 80            | 5050      | manage.fs0ciety.org        |

---

## 1. Préparer le serveur

```bash
git clone <repo> space-conquest
cd space-conquest

cp .env.production .env
# Editer .env : changer les mots de passe et JWT_SECRET
nano .env
```

Générer un JWT_SECRET fort :
```bash
openssl rand -hex 32
```

---

## 2. Importer le dump DB

Placer le dump dans `docker/init/` **avant** le premier démarrage :

```bash
cp /chemin/vers/migration_dump_back.sql docker/init/01_dump.sql
```

> Postgres execute automatiquement tous les `.sql` de `/docker-entrypoint-initdb.d/` au premier
> demarrage (data dir vide).
>
> **Important :** Si le dump inclut la table `seaql_migrations`, le backend ne re-appliquera pas
> les migrations. Sinon les migrations Sea-ORM s'executeront sur un schema deja existant —
> dans ce cas, supprimer le fichier et laisser le backend creer le schema depuis zero.

---

## 3. Deployer avec Coolify

### Option A — Docker Compose via Coolify UI (recommande)

1. Dans Coolify, creer une nouvelle **Resource** → **Docker Compose**
2. Pointer sur le repo Git (branche `main`)
3. Dans **Environment Variables**, ajouter les variables de `.env.production` avec les vraies valeurs
4. Coolify passera automatiquement les build args depuis les env vars (`VITE_API_URL`)
5. Lancer le deploy

### Option B — Commande directe sur le serveur

```bash
docker compose --env-file .env up -d --build
```

---

## 4. Configurer Cloudflare Tunnel (HBD-tunnel)

Dans le dashboard Zero Trust → Networks → Tunnels → HBD-tunnel → **Configure** → **Public Hostnames** :

| Subdomain | Domain       | Type | URL                  |
|-----------|--------------|------|----------------------|
| conquest  | fs0ciety.org | HTTP | http://10.0.4.1:7001 |
| backend   | fs0ciety.org | HTTP | http://10.0.4.1:7002 |
| manage    | fs0ciety.org | HTTP | http://10.0.4.1:5050 |
| db2       | fs0ciety.org | TCP  | tcp://10.0.4.1:5433  |

> Pour `db2.fs0ciety.org` en TCP, activer Cloudflare Access avec une policy d'acces restreint.
> L'acces a postgres via tunnel client-side necessite `cloudflared access tcp` cote client.
> Pour la gestion quotidienne, utiliser pgAdmin (manage.fs0ciety.org) a la place.

---

## 5. Verification post-deploy

```bash
# Logs en temps reel
docker compose logs -f

# Sante des services
docker compose ps

# Test backend
curl https://backend.fs0ciety.org/health

# Test frontend
curl -I https://conquest.fs0ciety.org
```

---

## 6. Mise a jour

```bash
git pull
docker compose --env-file .env up -d --build
```

---

## Variables d'environnement requises

| Variable          | Description                       | Exemple                       |
|-------------------|-----------------------------------|-------------------------------|
| POSTGRES_USER     | User PostgreSQL                   | spaceuser                     |
| POSTGRES_PASSWORD | Mot de passe PostgreSQL           | (fort)                        |
| POSTGRES_DB       | Nom de la base                    | space_db                      |
| JWT_SECRET        | Secret JWT (32+ chars aleatoires) | `openssl rand -hex 32`        |
| FRONTEND_URL      | URL publique du frontend          | https://conquest.fs0ciety.org |
| VITE_API_URL      | URL publique du backend (build)   | https://backend.fs0ciety.org  |
| PGADMIN_EMAIL     | Email admin pgAdmin               | admin@fs0ciety.org            |
| PGADMIN_PASSWORD  | Mot de passe pgAdmin              | (fort)                        |
| RUST_LOG          | Niveau de log backend             | info                          |

---

## Developpement local

```bash
# Backend
cp .env.production .env
# Ajuster DATABASE_URL pour localhost si besoin
docker compose up db redis -d
cd backend && cargo run

# Frontend
cd frontend
VITE_API_URL=http://localhost:8080 npm run dev
```
