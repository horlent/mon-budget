# Mon Budget — Application de gestion de budget personnel

## Description

Application web de gestion de budget personnel permettant de suivre dépenses et revenus. Interface entièrement en français, design moderne et épuré. Aucun backend ni dépendance externe — fonctionne entièrement dans le navigateur.

## Fichiers

```
mon-budget/
├── index.html   — structure HTML complète (layout, formulaire, dashboard, historique)
├── style.css    — tous les styles (variables CSS, layout grille, responsive)
└── app.js       — logique applicative complète (données, rendu, chart, filtres)
```

Dépendance externe : **Chart.js 4.4.0** chargé via CDN (`cdn.jsdelivr.net`), tag `<script defer>`.

## Architecture (app.js)

Le fichier suit un ordre strict, de bas en haut :

1. **Constantes** — `CLE_STORAGE`, `CATEGORIES`, `COULEURS_CHART`
2. **État global** — objet `etat` (`transactions`, `filtres`) + `instanceChart`
3. **Fonctions pures de données** — aucun accès au DOM
4. **Helpers** — `formaterMontant`, `formaterDate`, `aujourdhuiISO`
5. **Initialiseurs** — appelés une seule fois dans `DOMContentLoaded`
6. **Fonctions de rendu** — mettent à jour le DOM
7. **`rafraichirUI()`** — orchestre les 3 rendus (bilan, chart, liste)
8. **`DOMContentLoaded`** — point d'entrée, appelle les initialiseurs puis `rafraichirUI()`

### Fonctions de données (pures, sans DOM)

| Fonction | Rôle |
|---|---|
| `chargerTransactions()` | Lecture localStorage, retourne `[]` si vide ou invalide |
| `sauvegarderTransactions(arr)` | Écriture localStorage |
| `ajouterTransaction(donnees)` | Construit l'objet, pousse, sauvegarde, retourne le nouveau tableau |
| `supprimerTransaction(id)` | Filtre par id, sauvegarde, retourne le nouveau tableau |
| `calculerBilan(arr)` | Reduce → `{ solde, totalRevenus, totalDepenses }` |
| `appliquerFiltres(arr)` | 3 filtres chaînés selon `etat.filtres` |

### Principe de rendu

`rafraichirUI()` est le seul point d'entrée pour mettre à jour l'UI. Elle est appelée après chaque mutation d'état.

- **Bilan et chart** utilisent toujours `etat.transactions` complet (non filtré)
- **Liste** applique `appliquerFiltres()` en interne

La suppression utilise un **listener délégué unique** sur `#liste-transactions` (pas un listener par item).

## Structure des données (localStorage)

Clé : `budget_transactions`

```json
[
  {
    "id": "1716460800000",
    "type": "depense",
    "montant": 42.50,
    "categorie": "alimentation",
    "date": "2026-05-23",
    "description": "Courses supermarché"
  }
]
```

`id` = `Date.now().toString()` au moment de l'ajout.

## Catégories et couleurs

| Catégorie | Couleur chart |
|---|---|
| alimentation | `#e67e22` (orange) |
| logement | `#3498db` (bleu ciel) |
| transport | `#1565c0` (bleu foncé) |
| loisirs | `#1abc9c` (turquoise) |
| santé | `#e74c3c` (rouge) |
| autres | `#95a5a6` (gris) |

## Fonctionnalités implémentées

- **Formulaire** : ajout dépense/revenu avec montant, catégorie, date (défaut = aujourd'hui), description optionnelle ; validation inline (montant > 0, catégorie obligatoire) avec messages d'erreur sans `alert()`
- **Tableau de bord** : solde (vert si positif, rouge si négatif), total revenus, total dépenses ; badge solde dans le header synchronisé
- **Graphique donut** (Chart.js) : répartition des dépenses par catégorie, mise à jour temps réel, état neutre si aucune dépense
- **Historique** : liste triée par date décroissante (à égalité de date : tri par id décroissant), bordure gauche colorée par type
- **Filtres** : par type (tous/dépense/revenu), par catégorie, par mois (`<input type="month">`) ; bouton réinitialiser
- **Suppression** : confirmation native, mise à jour immédiate de l'UI et du chart
- **Persistance** : toutes les mutations passent par `sauvegarderTransactions()`, les données survivent au rechargement

## Conventions

- Langue : **français** partout (labels, messages, placeholders)
- Montants : `Intl` via `toLocaleString('fr-FR', { style:'currency', currency:'EUR' })`
- Dates : stockage `YYYY-MM-DD`, affichage `JJ/MM/AAAA`
- Dépenses en rouge (`#e74c3c`), revenus en vert (`#2ecc71`)
- Variables CSS dans `:root`, aucune couleur ou taille codée en dur dans les règles
- IDs HTML comme seuls hooks JS (jamais de sélection par classe)
- Layout 3 colonnes sur desktop, 1 colonne sous 900px

## Dépôt & déploiement

- **GitHub** : https://github.com/horlent/mon-budget
- **GitHub Pages** : https://horlent.github.io/mon-budget/
- Branche principale : `main`
- Git configuré localement avec l'identité `horlent` / `horlent@users.noreply.github.com`

> Note : le `localStorage` est propre à chaque origine. Les données saisies en local (`file://`) ne sont pas partagées avec la version GitHub Pages.
