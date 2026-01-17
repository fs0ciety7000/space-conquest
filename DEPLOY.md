# 🚀 Guide de Déploiement Space Conquest

## 💻 **Développement Local**

### 1. Backend (Rust + PostgreSQL)
```bash
cd backend

# PostgreSQL local (Docker)
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=spaceconquest \
  postgres:16-alpine

# Variables d'environnement
cp ../.env.development .env
# Éditer DATABASE_URL si nécessaire

# Démarrage
cargo run
# API disponible sur http://localhost:8080
```

### 2. Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
# App disponible sur http://localhost:5173
```

---

## ☁️ **Production - Option 1: Render (Recommandé)**

### 📦 **Backend sur Render**
1. **render.com** → New → **Web Service**
2. Connect GitHub repo `space-conquest`
3. Configuration:
   ```
   Name: space-conquest-backend
   Environment: Docker
   Dockerfile path: Dockerfile
   Plan: Free (512MB RAM)
   
   Environment Variables:
   DATABASE_URL = postgres://user:pass@render-db/spaceconquest
   BIND_ADDRESS = 0.0.0.0:$PORT
   RUST_LOG = info
   ```
4. **Deploy** → Attendre 5-10min
5. URL finale: `https://space-conquest-backend.onrender.com`

### 📦 **Base de données PostgreSQL**
1. Render → New → **PostgreSQL**
2. Plan: **Free** (90 jours) ou **Starter** ($7/mois)
3. Copier l'URL `postgres://user:pass@region.render.com/dbname`
4. Coller dans Backend → Environment Variables → `DATABASE_URL`

### 🌐 **Frontend sur Netlify**
1. **app.netlify.com** → **Add new site**
2. Import from GitHub `space-conquest`
3. Build settings:
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/dist
   
   Environment Variables:
   VITE_API_URL = https://space-conquest-backend.onrender.com
   ```
4. **Deploy** → 2min
5. Custom domain (optionnel): Settings → Domain management

---

## 🚂 **Production - Option 2: Railway (Tout-en-un)**

### Backend + DB sur Railway
```bash
# CLI (optionnel)
npm install -g @railway/cli
railway login

# Web UI (plus simple)
1. railway.app → New Project → Deploy from GitHub
2. Sélectionner space-conquest
3. Ajouter PostgreSQL: New → Database → Add PostgreSQL
4. Variables auto-injectées (DATABASE_URL)
5. Déploiement automatique sur chaque push
```

### Frontend sur Netlify (idem Option 1)
- Changer `VITE_API_URL` vers Railway:
  ```
  VITE_API_URL = https://space-conquest-production.up.railway.app
  ```

---

## 🔄 **Workflow Git**

### Développement
```bash
git checkout -b feature/ma-feature
# Code...
git add .
git commit -m "✨ Ajout feature X"
git push origin feature/ma-feature
# Pull Request sur GitHub
```

### Déploiement automatique
```bash
# Merge PR → main
git checkout main
git pull

# Render/Railway/Netlify déploient automatiquement ! 🎉
```

---

## 🛠️ **Variables d'environnement**

### Backend (.env)
```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname
BIND_ADDRESS=0.0.0.0:8080
RUST_LOG=info
```

### Frontend (.env)
```bash
# Dev local
VITE_API_URL=http://localhost:8080

# Prod (Netlify)
VITE_API_URL=https://space-conquest-backend.onrender.com
```

---

## ✅ **Checklist Déploiement**

- [ ] PostgreSQL créé (Render/Railway/Local)
- [ ] Backend déployé (Render/Railway)
- [ ] `DATABASE_URL` configurée
- [ ] Migrations exécutées automatiquement
- [ ] API accessible (test `/config`)
- [ ] Frontend déployé (Netlify)
- [ ] `VITE_API_URL` pointe vers backend prod
- [ ] CORS configuré (`.permissive()` dans Rust)
- [ ] Login/Register fonctionnels

---

## 🐛 **Débogage**

### Backend ne démarre pas
```bash
# Logs Render
Dashboard → Logs → Chercher "error" ou "panic"

# Logs Railway
railway logs

# Tester DATABASE_URL
psql $DATABASE_URL
```

### Frontend ne connect pas
```bash
# Console navigateur (F12)
# Chercher erreurs CORS ou 404

# Vérifier VITE_API_URL
Netlify → Site settings → Environment variables

# Rebuild
Netlify → Deploys → Trigger deploy
```

---

## 📊 **Coûts Mensuels**

### Option Render + Netlify
- Backend: **Gratuit** (sleep après inactivité) ou **$7/mois**
- PostgreSQL: **$7/mois** (après 90j gratuits)
- Frontend: **Gratuit** (100GB bande passante)
**Total: $0-$14/mois**

### Option Railway
- Backend + DB: **$5/mois** (500h CPU incluses)
- Frontend (Netlify): **Gratuit**
**Total: $5/mois**

---

## 🔗 **Liens Utiles**

- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Netlify Docs](https://docs.netlify.com)
- [Rust Dockerfile Best Practices](https://docs.docker.com/language/rust/)
