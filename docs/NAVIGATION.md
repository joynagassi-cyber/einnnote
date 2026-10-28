# Navigation — deux barres, un catalogue, zéro page perdue

> Ce qui a changé, pourquoi, et ce qui reste à vérifier.

---

## 1. Le défaut réparé

Trois listes écrites à trois endroits :

| Endroit | Contenu |
|---|---|
| `BottomNav` (téléphone) | Notes · Réviser · **+** · Apprendre · Réglages |
| `DesktopRail` (bureau) | Projets · Espaces · Réviser · Apprendre, puis un bloc Réglages |
| — | rien pour `Espaces`, `Projets`, `Coffres`, `Studio des cartes` sur téléphone |

Résultat concret : **la page « Espaces » — celle qui explique qu'un projet range,
qu'un coffre relie, et où créer l'un puis l'autre — n'existait pas sur
téléphone.** Le parcours projet → coffre → note était donc praticable sur
ordinateur et pas dans la poche. Ce n'était pas un oubli d'affichage : deux
listes qui divergent font disparaître une fonction d'un appareil sans que
personne ne l'ait décidé.

## 2. Le modèle

Un catalogue (`src/lib/navigation.ts`), deux listes de préférences
(`src/stores/useNavStore.ts`), deux rendus.

```
NAV_CATALOG            identifiant, adresse, libellé, libellé court, description, icône
      │
      ├── DEFAULT_NAV.mobile   5 entrées  (Notes, Espaces, Réviser, Apprendre, Réglages)
      └── DEFAULT_NAV.desktop  7 entrées  (+ Projets, Coffres, Studio des cartes)
                │
                ├── BottomNav  → splitMobile() : 5 places, le reste derrière « Plus »
                └── DesktopRail → ordre libre, réorganisation en place
```

Deux listes et non une : la barre du bas tient cinq entrées autour du bouton
« + », le rail en tient quinze. Une liste commune aurait imposé le compromis du
plus petit — appauvrir le bureau, ou déborder le téléphone.

**Ce qui ne bouge jamais** : le bouton « + » (créer), la liste des projets dans
le rail, le bloc de révision du jour. Ce sont des gestes, pas des pages.

## 3. Téléphone — cinq places, et un parking

Cinq entrées maximum dans la barre. Au-delà, les suivantes **ne débordent pas
hors de l'écran** : elles passent derrière un bouton « Plus » qui ouvre une
feuille nommée (« Toutes les pages »), avec la description de chaque page et un
raccourci vers les réglages.

Pourquoi ce plafond : à 390 px, cinq entrées plus le bouton central occupent
déjà 374 px. Une sixième obligerait soit à rétrécir les libellés jusqu'à
l'illisible, soit à faire défiler une barre de navigation — deux choses qu'on
ne fait pas à un pouce.

## 4. Bureau — réorganiser d'un clic

Deux chemins, volontairement :

1. **Dans le rail** : bouton « Ordre ». La navigation cesse de naviguer ; on
   touche la page à déplacer, puis la page **devant laquelle** la poser. Des
   flèches montent et descendent pour un ajustement fin. « Terminé » rend au
   rail son rôle de navigation.
2. **Dans les réglages** (`/settings/navigation`) : liste numérotée, flèches,
   retrait, ajout, rétablissement, et un **aperçu vivant** des deux barres.

Le geste par clics plutôt que par glisser-déposer : il fonctionne au clavier,
il ne demande pas de viser, et il ne casse pas quand une page est plus haute
qu'une autre. Le glisser-déposer ajouterait du code pour un geste moins
accessible.

## 5. Créer, dans l'ordre (page Espaces)

La page porte désormais un bloc **« Créer, dans l'ordre »** à trois étapes :

1. **Nouveau projet** → `/projects?new=1`, la feuille de création s'ouvre déjà ;
2. **Nouveau coffre** → `/vaults?new=1&project=<id>`, le projet est présélectionné ;
3. **Nouvelle note** → `/new`, dans le projet actif.

Et sur chaque projet : « Nouveau coffre », « Nouvelle note » — nommés avec le
nom du projet pour les lecteurs d'écran (« Nouveau coffre dans Droit civil »),
puisque plusieurs boutons identiques à l'écran ne doivent pas porter le même nom
accessible.

## 6. Vérification

| Contrôle | Résultat |
|---|---|
| Suite complète | **387 tests / 34 fichiers**, verts |
| Catalogue et manipulations de liste | 22 tests purs (doublons, ids inconnus, plafond de 5, répartition barre/débordement, `placeBefore` sans perte) |
| Écrans | 13 tests : Espaces dans la barre, page masquée réellement retirée, parking « Plus », parcours de création avec projet présélectionné, réorganisation du rail au clic **et** à la flèche, persistance dans `localStorage`, « retirer la dernière » refusé |
| `tsc` / `eslint` | propres (0 erreur) |
| `vite build` | 3,4 s |
| Routes HTTP | `/spaces`, `/projects`, `/vaults`, `/settings/navigation` → 200 |

**Non vérifié :** aucune capture d'écran (Chromium indisponible ici) — la
largeur réelle des cinq entrées sur un écran de 390 px, et le confort du bouton
« Plus » au pouce, demandent un vrai téléphone.
