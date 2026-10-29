# Maquette — Espaces, le bouton flottant, le menu des pages

> Écrite **avant** le code, comme pour chaque mise en page bureau.
> 28 octobre 2026.

## 1. Ce que la maquette doit régler

Trois défauts de structure, pas de finition :

1. le « + » vivait **dans** la barre de navigation, entre deux onglets, et
   proposait toujours la même chose — une note — même sur une page où l'on ne
   peut pas en créer ;
2. `Projets`, `Vaults` et `Espaces` étaient trois pages pour une seule
   hiérarchie, donc trois endroits où chercher le même objet ;
3. au-delà de cinq entrées, le surplus partait dans une feuille qui montait du
   bas de l'écran, alors qu'un menu ancré au bouton suffit et ne recouvre rien.

## 2. Téléphone (390 × 844)

```
┌──────────────────────────────────────────┐
│  Espaces                            ⚙   │  en-tête
│  Un projet contient des vaults.          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ▤ Thèse                  3 vaults  │  │  carte projet
│  │   Recherche, lectures, fiches      │  │  → /spaces/p-these
│  │   12 notes · 48 fiches · 6 à revoir│  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ ▤ Mes notes              0 vault   │  │
│  │   8 notes                          │  │
│  └────────────────────────────────────┘  │
│                                          │
│                                  ╭────╮  │
│                                  │ ＋ │  │  FAB flottant
│                                  ╰────╯  │  « Nouveau projet »
│  ┌────────────────────────────────────┐  │
│  │ Notes   Espaces  Réviser  Apprendre│  │  barre : 4 + « ··· »
│  │   ▢        ▣        ◷        ✦    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Dans un projet (`/spaces/p-these`) le FAB devient **« Nouveau vault »** ; dans
un vault (`/vault/v-eco`) il devient **« Nouvelle fiche »** ; dans la
bibliothèque et dans Apprendre il crée **une note libre**, sans projet ni vault,
reliable plus tard.

## 3. Le menu des pages (remplace la feuille du bas)

Il s'ouvre **vers le haut**, ancré au bouton « ··· », et ne recouvre que la
barre :

```
        ╭──────────────────────────╮
        │ ◷  Réviser               │
        │ ✦  Apprendre             │
        │ ⚙  Réglages              │
        ╰───────────▲──────────────╯
   Notes  Espaces  ···
```

Chaque ligne : icône + libellé, la page courante marquée. Fermeture au clic
extérieur, à `Échap`, ou après choix. Aucun voile, aucune feuille.

## 4. Bureau (≥ 1024 px)

```
┌───────────────┬───────────────────────────────────────────────┐
│ É  Einnote     │  Espaces                              ⚙      │
│ + Nouvelle note│  Un projet contient des vaults.              │
│               │                                               │
│ ▢ Notes       │  ┌─────────────┐ ┌─────────────┐              │
│ ▣ Espaces     │  │ Thèse       │ │ Mes notes   │              │
│ ◷ Réviser     │  │ 3 vaults    │ │ 0 vault     │              │
│ ✦ Apprendre   │  │ 12 notes    │ │ 8 notes     │              │
│               │  └─────────────┘ └─────────────┘              │
│ ▤ Vaults (2)  │                                               │
│  · Économie   │                                    ╭────────╮ │
│  · Travail    │                                    │＋ Projet│ │
│               │                                    ╰────────╯ │
│ ⚙ Réglages    │                                               │
└───────────────┴───────────────────────────────────────────────┘
```

Le rail garde ses pages ; les vaults du projet courant y sont listés comme
raccourcis (pas comme une page). Le FAB se pose en bas à droite **de la colonne
de contenu**, à 32 px des bords.

## 5. Hiérarchie des adresses

| Adresse | Écran | Crée (FAB) |
|---|---|---|
| `/spaces` | les projets | un projet |
| `/spaces/:id` | les vaults du projet | un vault |
| `/spaces/:id/graph` | graphe du projet (vaults reliés par les renvois) | — |
| `/vault/:id` | les fiches du vault | une fiche |
| `/vault/:id/graph` | graphe du vault | — |
| `/note/:id` | la note | — |
| `/` | la bibliothèque | une note libre |
| `/learn` | les leçons | une note libre |

`/projects`, `/projects/:id` et `/vaults` redirigent vers `/spaces` : une seule
hiérarchie, une seule adresse à retenir.

## 6. Critères observables

- aucune page ne contient plus d'un bouton flottant ;
- le FAB n'apparaît pas dans les réglages, ni sur les graphes, ni en révision ;
- la barre du bas ne porte plus aucun « + » ;
- le menu des pages s'ouvre vers le haut, avec icônes, et ne bloque pas la page ;
- `/projects` et `/vaults` répondent par une redirection, pas une 404.
