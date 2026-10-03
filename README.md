# Réservations — gestion des occasions / إدارة الحجوزات

Application locale de gestion des réservations (mariages, dîners, fiançailles…),
bilingue français / arabe, thème clair / sombre. Elle tourne sur **un seul
ordinateur**, sans hébergement en ligne.

**État actuel : phases 1 à 5 terminées** (clients, occasions, services,
réservations, paiements, calendrier, dates bloquées, tableau de bord).
Reste la phase 6 (PDF, emails de confirmation, sauvegardes depuis
l'interface). Voir `docs/ROADMAP.md`.

---

## 1. Installer Docker Desktop (Windows, une seule fois)

1. Téléchargez Docker Desktop : https://www.docker.com/products/docker-desktop/
2. Lancez l'installateur et gardez l'option **« Use WSL 2 »** cochée.
3. Redémarrez l'ordinateur si on vous le demande.
4. Ouvrez Docker Desktop et attendez que l'icône de la baleine indique
   **« Engine running »**.
5. (Recommandé) Dans Docker Desktop → *Settings* → *General*, cochez
   **« Start Docker Desktop when you sign in »** : l'application démarrera
   automatiquement avec Windows.

> La première installation télécharge les images (internet nécessaire une
> fois). Ensuite, l'application fonctionne **hors ligne**.

## 2. Première configuration

Ouvrez **PowerShell** dans le dossier du projet, puis :

```powershell
copy .env.example .env
notepad .env
```

Changez au minimum `DJANGO_SECRET_KEY` (une longue phrase au hasard) et
`ADMIN_PASSWORD`. Enregistrez.

## 3. Démarrer

```powershell
docker compose up -d --build
```

Attendez environ une minute, puis ouvrez **http://localhost:3000**.
Connectez-vous avec `ADMIN_USERNAME` / `ADMIN_PASSWORD` du fichier `.env`.

## 4. Arrêter / redémarrer

| Action | Commande |
|---|---|
| Arrêter | `docker compose down` |
| Redémarrer | `docker compose restart` |
| Démarrer après un arrêt | `docker compose up -d` |
| Voir l'état | `docker compose ps` |
| Voir les journaux (emails de test, erreurs) | `docker compose logs -f backend worker` |

> ⚠️ **N'utilisez jamais `docker compose down -v`** : l'option `-v` supprime
> la base de données.

Les données sont dans un volume Docker (`db_data`) et survivent aux arrêts,
redémarrages et mises à jour.

## 5. Sauvegarder la base de données

L'export/restauration depuis l'interface arrive à la phase 6. En attendant,
copie manuelle (application démarrée) :

```powershell
docker compose exec backend python -c "import sqlite3; s=sqlite3.connect('/app/data/db.sqlite3'); d=sqlite3.connect('/app/backups/manuel.sqlite3'); s.backup(d)"
```

Le fichier apparaît dans le dossier `backups/` du projet. Copiez-le sur une
clé USB ou un disque externe.

## 6. Créer d'autres comptes

```powershell
docker compose exec backend python manage.py createsuperuser
```

Ou via l'administration Django : http://localhost:3000/django-admin/
(un compte sans « statut équipe » peut créer des clients, des réservations et
des paiements, mais ne peut pas modifier les paramètres, les occasions, les
services, les dates bloquées, ni supprimer un paiement).

## 7. Première utilisation

1. **Administration → Occasions** : ajoutez vos types d'événements
   (mariage, fiançailles…) avec leur prix par défaut.
2. **Administration → Services** : ajoutez les options (DJ, décoration…).
3. **Paramètres** : vérifiez le paiement minimum pour confirmer.
4. **Calendrier** : cliquez sur un jour → « Réserver ce jour ».

---

## Développement (VS Code, sans Docker)

Prérequis : Python 3.12, Node.js 20.

```powershell
# Terminal 1 — backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
$env:DJANGO_DEBUG="1"; python manage.py runserver

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Ouvrez http://localhost:5173. Sans Redis, les tâches de fond (emails)
s'exécutent directement : aucune installation supplémentaire.

Tests backend : `cd backend && python manage.py test`

Documentation : `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROADMAP.md`.
