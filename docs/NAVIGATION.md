# Navigation — deux barres, un catalogue, zéro page perdue

> Ce qui a changé, pourquoi, et ce qui reste à vérifier.

---

## 1. Les défauts réparés

Trois choses cassées, toutes de structure :

| Défaut | Constat | Correction |
|---|---|---|
| **Trois pages pour une hiérarchie** | `Espaces`, `Projets` et `Vaults` décrivaient le même objet à trois endroits ; sur téléphone, aucune des trois n'était dans la barre | une seule page **Espaces** (`/spaces`), supprimée des autres ; `/projects*` et `/vaults` **redirigent** |
| **Un « + » dans la barre** | il restait affiché sur des pages où il ne créait rien de juste, et créait toujours une note | il devient un **bouton flottant** contextuel, absent là où il n'y a rien à créer |
| **Le mot « vault »** | vocabulaire du code, pas celui du produit | **« vault »** partout, interface et documentation |

Et le mot « Studio des cartes » a quitté la navigation : c'est un **réglage**
d'affichage, il se règle dans `/settings/cards`, pas dans une page.

## 2. Le modèle

Un catalogue (`src/lib/navigation.ts`), deux listes de préférences
(`src/stores/useNavStore.ts`), deux rendus.

```
NAV_CATALOG            identifiant, adresse, libellé, libellé court, description, icône
      │
      ├── DEFAULT_NAV.mobile   5 entrées  (Notes, Espaces, Réviser, Apprendre, Réglages)
      └── DEFAULT_NAV.desktop  4 entrées  (+ Réglages en pied de rail, à place fixe)
                │
                ├── BottomNav   → splitMobile() : 5 places, le reste derrière « ··· »
                └── DesktopRail → ordre libre, réorganisation en place
```

Deux listes et non une : la barre du bas tient cinq entrées autour du bouton
« + », le rail en tient quinze. Une liste commune aurait imposé le compromis du
plus petit — appauvrir le bureau, ou déborder le téléphone.

**Ce qui ne bouge jamais** : le bouton « + » (créer), la liste des projets dans
le rail, le bloc de révision du jour. Ce sont des gestes, pas des pages.

## 3. Téléphone — cinq places, et un menu qui monte

Cinq entrées maximum dans la barre. Au-delà, les suivantes ne débordent pas
hors de l'écran : elles passent derrière un bouton **« ··· »** qui ouvre un
**menu vers le haut**, ancré au bouton — une ligne par page, avec son icône,
la page courante marquée.

| Choix | Pourquoi |
|---|---|
| Menu qui monte, pas feuille du bas | la feuille recouvrait la page et demandait un geste de fermeture ; le menu laisse la page visible et se ferme en touchant ailleurs ou avec `Échap` |
| Icônes, pas seulement des mots | on reconnaît `◷` et `✦` avant de lire « Réviser » / « Apprendre » |
| Aucun voile | rien à charger, rien à rendre flou : trois à huit lignes |

Pourquoi cinq places : à 390 px, cinq entrées plus le bouton central occupent
déjà 374 px. Une sixième obligerait soit à rétrécir les libellés jusqu'à
l'illisible, soit à faire défiler une barre de navigation — deux choses qu'on ne
fait pas à un pouce.

## 4. Bureau — réorganiser d'un clic

Deux chemins, volontairement :

1. **Dans le rail** : bouton « Ordre ». La navigation cesse de naviguer ; on
   touche la page à déplacer, puis la page **devant laquelle** la poser. Des
   flèches montent et descendent pour un ajustement fin. « Terminé » rend au
   rail son rôle de navigation.
2. **Dans les réglages** (`/settings/navigation`) : liste numérotée, flèches,
   rétablissement, et un **aperçu vivant** de la barre de l'appareil courant.

Le geste par clics plutôt que par glisser-déposer : il fonctionne au clavier,
il ne demande pas de viser, et il ne casse pas quand une page est plus haute
qu'une autre. Le glisser-déposer ajouterait du code pour un geste moins
accessible.

## 4 bis. Les réglages ne règlent que l'appareil qu'on utilise

L'écran portait un sélecteur **Téléphone / Bureau** : depuis un téléphone, on
réécrivait la barre du bureau sans pouvoir en voir l'effet, et une manipulation
d'essai cassait la navigation d'une autre machine. C'est supprimé.

| Décision | Règle |
|---|---|
| Quelle surface est réglée ? | Celle de l'écran courant : `useRail()` (rail visible → bureau, sinon barre du bas). Aucun état local, donc aucune désynchronisation. |
| Peut-on masquer une page ? | Seulement là où **il y a un arbitrage de place** : `NAV_CATALOG.length > SURFACE_SLOTS[surface]`. Téléphone : 8 pages pour 5 places → oui. Bureau : 8 pages pour 12 places → non. |
| Et si des pages étaient masquées sur une surface sans choix ? | La liste est complétée (`fillItems`) et enregistrée : aucune page ne peut rester invisible sans moyen de la faire revenir. |
| Le réordonnancement ? | Partout, et c'est la même préférence que le bouton « Ordre » du rail. |

Le jour où le catalogue dépassera la place du rail, le choix réapparaît de
lui-même — la règle est dans `src/lib/navigation.ts`, pas dans l'écran.

## 5. La page Espaces — une hiérarchie, trois gestes

`/spaces` liste les **projets** ; `/spaces/:id` ouvre ses **vaults** ;
`/vault/:id` ouvre ses **fiches**. Chaque niveau crée le suivant, et rien
d'autre :

| Adresse | Ce qu'on voit | Le bouton flottant crée |
|---|---|---|
| `/spaces` | les projets | **Nouveau projet** |
| `/spaces/:id` | les vaults du projet | **Nouveau vault** |
| `/vault/:id` | les fiches du vault | **Nouvelle fiche** |
| `/` , `/learn` | la bibliothèque, les leçons | **Nouvelle note** — libre : ni projet ni vault |
| réglages, graphes, révision | — | rien : le bouton disparaît |

La note libre n'est pas une note « en attente » : elle vit très bien seule. On
peut la **rattacher plus tard** à un projet ou à un vault depuis sa fiche. Le
parcours inverse (projet → vault → note) reste le chemin d'apprentissage, mais
il n'est plus un péage.

Deux graphes, deux échelles : **graphe de projet** (`/spaces/:id/graph`, les
vaults comme nœuds) et **graphe de vault** (`/vault/:id/graph`, les fiches).

**Un seul bouton par page.** Deux boutons pour un même geste — une barre qui
pointe, un autre bouton dans le contenu — ont été retirés : la page indique
l'adresse, le bouton flottant fait le geste.

## 6. Vérification

| Contrôle | Résultat |
|---|---|
| Suite complète | **440 tests / 39 fichiers**, verts |
| Catalogue et manipulations de liste | 28 tests purs (doublons, ids inconnus, plafond de 5, répartition barre/débordement, `placeBefore` sans perte, règle de place `needsPicker`, `fillItems`) |
| Bouton flottant | 6 tests purs : une action par page, **jamais deux cibles identiques sur une page**, rien sur les graphes et la révision |
| Graphe de projet | 6 tests purs : arêtes vault → vault seulement, renvois internes et liens morts ignorés, vault isolé rejeté sur un anneau plus large |
| Écrans | barre sans « + », menu « ··· » qui s'ouvre vers le haut, Espaces → projet → vaults, graphe de projet comme de vault, FAB qui change d'action et crée là où il pointe |
| `tsc` / `eslint` | propres (0 erreur ; 2 avertissements `react-refresh` préexistants) |
| `vite build` | 3,6 s |
| Routes HTTP | `/spaces` et `/settings/personalization` → 200 |

**Non vérifié :** aucune capture d'écran (Chromium indisponible ici) — la
largeur réelle des cinq entrées sur un écran de 390 px, et le confort du menu
« ··· » au pouce, demandent un vrai téléphone.

## 7. Voir aussi

- **`docs/PRESENTATION.md`** — l'écran « Présentation » : les réglages viennent
  d'un registre unique, et les jetons sont calculés en JavaScript (c'est là
  qu'était le bug des réglages sans effet).
- **`docs/WIREFRAME-SPACES.md`** — la maquette écrite avant ce code.
