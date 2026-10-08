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

**Double-cliquez sur `Ouvrir Réservations.bat`** (dans le dossier du projet).

Il démarre Docker Desktop si besoin, lance l'application puis ouvre
**http://localhost:3000** dans le navigateur. La toute première fois,
il prépare l'application : comptez quelques minutes (internet nécessaire
une seule fois).

Connectez-vous avec `ADMIN_USERNAME` / `ADMIN_PASSWORD` du fichier `.env`.

> Astuce : clic droit sur le fichier → *Envoyer vers* → *Bureau (créer un
> raccourci)*, pour l'avoir sur le bureau.

Équivalent en ligne de commande : `docker compose up -d --build`.

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

## 5. Sauvegarder

**Double-cliquez sur `Sauvegarde.bat`.** Il crée dans le dossier `backups/` :

| Fichier | Contenu |
|---|---|
| `sauvegarde_AAAA-MM-JJ_HH-MM.sqlite3` | toute la base : réservations, clients, paiements, employés, paramètres |
| `fichiers_AAAA-MM-JJ_HH-MM.tar.gz` | les fichiers importés : photos et pièces d'identité (s'il y en a) |

Copiez **les deux** sur une clé USB ou un disque externe, au moins une fois
par semaine. La sauvegarde peut se faire pendant que l'application est
utilisée.

> Pour restaurer une sauvegarde, demandez de l'aide : la restauration depuis
> l'interface arrive avec la phase 6.

## Mettre l'application sur l'ordinateur de la salle

**Copiez le dossier du projet sur l'ordinateur (clé USB…), puis
double-cliquez sur `install.bat`.** Il fait tout :

1. installe WSL 2 et Docker Desktop s'ils manquent (Windows demande
   l'autorisation administrateur ; si un redémarrage est demandé,
   relancez ensuite `install.bat`) ;
2. copie l'application dans `C:\reservations-app` ;
3. crée le fichier `.env` : clé secrète aléatoire, et vous demande le nom et
   le mot de passe de l'administrateur ;
4. vous demande si d'autres ordinateurs ou téléphones du réseau doivent
   accéder à l'application (il ouvre alors le pare-feu et affiche l'adresse
   à utiliser, par exemple `http://192.168.1.20:3000`) ;
5. fait démarrer Docker Desktop avec Windows, construit et lance l'application ;
6. crée deux raccourcis sur le bureau : **Reservations** et
   **Sauvegarde Reservations**.

`install.bat` peut être relancé sans risque, par exemple pour une mise à
jour : les données et le fichier `.env` existants sont conservés.

Installation manuelle (sans `install.bat`) : installez Docker Desktop
(étape 1), créez `.env` (étape 2), puis double-cliquez sur
`Ouvrir Réservations.bat`.

### Données de départ (services, prix…)

Au **tout premier lancement**, l'application charge automatiquement la
configuration préparée : paramètres de l'entreprise, types d'occasion,
formules avec leurs grilles de prix, services avec leurs options. Ni clients,
ni réservations, ni employés.

Ce chargement n'a lieu **qu'une seule fois** : ensuite, le client peut tout
modifier ou supprimer, rien ne revient au redémarrage ni lors d'une mise à
jour.

Pour mettre à jour cette configuration avant une installation, sur
l'ordinateur de développement (dans `backend`, environnement activé) :

```powershell
python manage.py export_initial_data
```

Cela réécrit `backend/apps/core/fixtures/initial_data.json` avec la
configuration actuelle. Enregistrez-le dans git avec le reste.

Pour une **mise à jour** de l'application : remplacez les dossiers
`backend/` et `frontend/` par la nouvelle version, puis lancez dans le dossier
du projet `docker compose up -d --build`. Les données sont conservées.

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
