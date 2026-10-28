# Einnote — architecture de l’application

> 28 octobre 2026. **Document de décision**, pas de code. Il fixe la structure
> avant qu’on retouche une seule ligne : hiérarchie, adresses, coquille web,
> modales, modèle de données, et les deux surfaces manquantes (calendrier,
> statistiques). Tant qu’il n’est pas arrêté, toute nouvelle page est une
> hypothèse.

---

## 0. La décision, en six lignes

1. **On arrête d’ajouter des écrans.** Sept surfaces : Notes, Espaces,
   Calendrier, Statistiques, Réviser, Apprendre, Réglages. Une hiérarchie, une
   coquille. Tout le reste est un panneau ou un état de ces sept surfaces.
2. **Le web n’est pas une colonne de téléphone.** Aujourd’hui le contenu est
   plafonné à `720 px` même sur un écran de 1600 px : la coquille devient trois
   zones (rail 264 · contenu · panneau de contexte 320).
3. **Les modales passent par un portail unique**, au-dessus de la coquille.
   Aucune ne le fait aujourd’hui — d’où les feuilles « encastrées ».
4. **Un vault est un coffre**, pas un style : nom, description, date, nombre de
   notes, méthodes utilisées. Les quatre méthodes sont des propriétés des
   *notes*, jamais du vault.
5. **Deux surfaces manquent** : Calendrier et Statistiques. Les bibliothèques
   nécessaires sont déjà installées et inutilisées (`recharts`,
   `react-day-picker`, `date-fns`) : aucun paquet à ajouter.
6. **Le produit s’appelle Einnote** — l’application s’appelle encore « Einnote »
   dans 76 endroits du dépôt.

---

## 1. Ce qui ne va pas — mesuré, pas ressenti

| Symptôme | Cause, mesurée dans le code | Décision |
|---|---|---|
| Les modales « restent encastrées » sur le web | **`createPortal` n’existe nulle part dans `src`.** Le composant `Sheet` (`src/components/Layout.tsx:228`) rend son scrim et sa feuille **dans l’arbre de la page**. Le bloc bureau (`src/index.css:1231`) tente de le centrer avec `left: var(--rail)` — donc avec le balisage d’une feuille mobile. Dès qu’un ancêtre crée un bloc conteneur (`backdrop-filter`, `transform`, `contain`), le `position: fixed` se résout contre lui | §5 : un portail unique, un dialogue de bureau, une feuille mobile, la même API |
| Le web ressemble au mobile | `--screen-max: 720px` dès 768 px (`src/index.css:1054`) **et** à 1024 px (`:1102`). Toutes les pages passent par `<Screen>` + `<AppBar>`, qui sont des primitives de téléphone. Les feuilles montent du bas, les barres sont des barres d’app | §4 : coquille à trois zones, en-tête de page, dialogues centrés |
| Pas de calendrier | Aucune route, aucun écran. `date-fns` : **0 import**, `react-day-picker` : **0 page** (seulement `ui/calendar.tsx`, jamais monté) | §10 : `/calendar` |
| Les statistiques sont invisibles | `/settings/progress` (`Progress.tsx`) : 4 chiffres + des barres maison, enterré dans les réglages. `recharts` est installé, l’enveloppe `ui/chart.tsx` existe, **aucune page ne l’importe** | §11 : `/stats` |
| Espaces se lit comme un cours | Le bouton « Apprendre en 3 minutes : un projet, des vaults, des notes » (`Spaces.tsx:120`) ouvre un tutoriel depuis une page de travail ; les cartes affichent `vaults` **et** `fiches` séparément (`:170-186`), trace des deux modèles | §7 : une page opérationnelle, projet → vault → notes |
| Un vault est traité comme un style | Deux modèles parallèles : `ZettelVault` + `ZettelCard` d’un côté, `Note` + `method` de l’autre (`src/types/index.ts:39-135`). **108** occurrences de `vaultId` | §6 : un seul modèle, `Note.method` |
| Le nom | `index.html:16` : « Einnote — des notes qui font apprendre ». `package.json` : `vite_react_shadcn_ts`. 76 occurrences d’« Einnote » | Phase 0 : renommage Einnote |

**Le vrai problème n’est pas visuel, il est structurel :** l’application n’a
jamais décidé ce qu’est un écran. Elle a accumulé 37 routes, dont 8 redirections,
et deux modèles de données qui décrivent le même objet sous deux noms.

---

## 2. Le vocabulaire — arrêté une fois

| Mot | Définition | Ce que ce n’est **pas** |
|---|---|---|
| **Einnote** | L’application. | — |
| **Espace** | La **feature** qui range les projets. Un lieu de travail, pas une leçon. | Une page d’apprentissage, un tutoriel, une explication de la hiérarchie |
| **Projet** | Un sujet. « Droit des contrats », « Superposition quantique ». Contient des vaults. | Un dossier de fichiers, une catégorie de notes |
| **Vault** | Un **coffre** à l’intérieur d’un projet : un ensemble de notes liées à une catégorie. Sa carte dit : nom, description, date de création, nombre de notes, méthodes présentes. | Un style (Zettelkasten), un graphe, une méthode, un dossier |
| **Note** | Une note, avec **une** méthode. | Une fiche de vault (c’est une note de méthode `zettelkasten`) |
| **Méthode** | `outline` · `cornell` · `mindmap` · `zettelkasten`. Propriété de la note. | Un type de vault, un thème, un réglage |
| **Graphe** | Une **vue** sur des notes et leurs liens. Deux échelles : le projet, le vault. | Un objet stocké, un « style de vault » |

La conséquence la plus importante de ce tableau : **un vault peut contenir les
quatre méthodes à la fois**, parce que la méthode est portée par la note. C’est
exactement ce que le produit doit montrer dans la carte du coffre
(`4 méthodes`, pas `Zettelkasten`).

---

## 3. Hiérarchie et adresses

Une seule hiérarchie, et elle est dans l’URL. On doit pouvoir coller un lien
vers un coffre et retomber dessus.

```
Espaces (/spaces)            → des projets, rien d’autre
  └ Projet (/spaces/:p)      → les vaults de ce projet
      └ Vault (/spaces/:p/:v)→ les notes de ce coffre
          ├ Graphe du vault  (/spaces/:p/:v/graph)
          └ Note             (/note/:id)
      └ Graphe du projet     (/spaces/:p/graph)

Surfaces transverses : / · /calendar · /stats · /review · /learn · /settings
```

| Adresse | Écran | Statut |
|---|---|---|
| `/` | Notes (bibliothèque) | existe — à recadrer sur la coquille bureau |
| `/spaces` | Projets | existe — à dépouiller du texte pédagogique |
| `/spaces/:projectId` | Vaults du projet | existe (`ProjectSpace`) — carte de vault à refaire |
| `/spaces/:projectId/:vaultId` | Notes du vault | **à créer** (aujourd’hui `/vault/:id`, qui ne montre que des fiches) |
| `/spaces/:projectId/graph` | Graphe du projet | existe (`ProjectGraph`) |
| `/spaces/:projectId/:vaultId/graph` | Graphe du vault | à déplacer depuis `/vault/:id/graph` |
| `/calendar` | Calendrier | **à créer** |
| `/stats` | Statistiques | **à créer** (remplace `/settings/progress`) |
| `/review` · `/learn` · `/settings/*` | inchangés | — |
| `/vault/:id`, `/vault/:id/graph`, `/projects/*` | redirections | à conserver pour ne pas casser un signet |

Les adresses restent en anglais (`/spaces`, `/settings`) : c’est déjà la
convention de tout le dépôt, et changer `/settings` maintenant casserait les
liens, les tests et la synchronisation cloud pour un gain nul.

---

## 4. La coquille web — trois zones

[Établi] Le bureau n’est pas un téléphone élargi. Une application de notes sur
1600 px a trois zones, et le contenu du milieu ne fait pas 720 px.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌────────────┬───────────────────────────────────────────┬─────────────────┐ │
│ │  EINNOTE   │  Projets                     ⌘K  ＋ Nouveau│  Contexte       │ │
│ │            ├───────────────────────────────────────────┤                 │ │
│ │ ・Notes     │  Tous · Récents · À réviser     7 projets │  Droit des      │ │
│ │ ・Espaces   │ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  contrats       │ │
│ │ ・Calendrier│ │ Projet   │ │ Projet   │ │ Projet   │   │  3 vaults       │ │
│ │ ・Statistiques│ │ 3 coffres│ │ 1 coffre │ │ 5 coffres│   │  42 notes       │ │
│ │ ・Réviser   │ │ 42 notes │ │ 12 notes │ │ 88 notes │   │                 │ │
│ │ ・Apprendre │ └──────────┘ └──────────┘ └──────────┘   │  Méthodes       │ │
│ │            │                                            │  ▓▓▓▓░░ Cornell │ │
│ │ ──────────  │                                            │  ▓▓░░░ Outline  │ │
│ │ Réglages    │                                            │                 │ │
│ │ 264 px      │              contenu ≤ 1080 px              │  320 px (opt.)  │ │
│ └────────────┴───────────────────────────────────────────┴─────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Zone | Largeur | Rôle | Règles |
|---|---|---|---|
| **Rail** | 264 px (`≥1024`) · 88 px (`768–1023`) · absent `<768` | Navigation, marque, Réglages en bas | Déjà en place (`DesktopRail.tsx`), à enrichir de deux entrées : Calendrier, Statistiques |
| **Contenu** | fluide, `max 1080 px` | La surface | Une page = un en-tête de page (titre, sous-titre court, actions) + un corps. **Pas d’`AppBar` mobile** au-delà de 1024 px |
| **Contexte** | 320 px, optionnel | Détail de l’élément sélectionné (projet, vault, note, jour) | Se ferme ; ne remplace jamais une page. Sur `<1024`, il devient une feuille |

**Ce que la coquille change concrètement :**

- `--screen-max` passe de `720px` à `1024px` au-delà de 1024 px, et les pages
  gagnent une variante `grid` (2 colonnes de cartes à 900 px, 3 à 1200 px).
- L’en-tête bureau est un vrai en-tête : fil d’Ariane, titre `serif 28 px`,
  actions à droite, ligne de filtres dessous. Le composant actuel `AppBar`
  reste, mais uniquement pour `<768` et pour les écrans de détail (Éditeur).
- Les barres collantes (`sticky top-0`) ne doivent jamais passer sous le rail :
  leur `top` est `0` mais leur `left` est `var(--rail)` — c’est déjà le cas du
  `Composer`, pas des en-têtes de page.
- **Aucune feuille montante au-delà de 1024 px.** Au-delà, une modale est un
  dialogue centré, ou un panneau latéral droit si elle a besoin de contexte.

---

## 5. Les modales — une couche, pas des rustines

### L’état actuel, en un schéma

```
<body>
  <div class="app-shell">
    <aside class="rail">            z-index 40
    <div class="app-main">
      <div class="screen">          ← ici vivent les pages
        <section> …le contenu… </section>
        <div role="dialog">         ← LA MODALE, rendueInline
          <button class="scrim">    position: fixed  z-index 40
          <div class="sheet">       position: fixed  z-index 50
```

Deux défauts, tous les deux dans la structure :

1. **Pas de portail.** La modale appartient à la page qui l’ouvre. Si un ancêtre
   crée un bloc conteneur (`.glass` avec `backdrop-filter`, une carte 3D avec
   `will-change: transform`, un futur panneau redimensionnable avec `contain`),
   le `fixed` se résout contre cet ancêtre : la feuille s’affiche **dans** le
   contenu, coupée par l’`overflow`.
2. **Pas d’échelle de plans.** `.rail` est à `40`, `.scrim` à `40` : égalité,
   l’ordre dépend du DOM. Le premier `z-index` inventé à 51 quelque part casse
   la règle.

### La cible

```
<body>
  <div id="app-root">   rail · contenu · contexte
  <div id="overlay-root">        ← UN SEUL portail, créé au démarrage
     <Overlay>   scrim, blur, clic = fermer
        <Dialog>/<Sheet>  focus trap, Échap, aria-modal
  <div id="toast-root">          ← au-dessus des dialogues
```

```
plans :  rail 30 · sticky d’en-tête 40 · panneau contexte 50
         overlay 60 · dialogue 70 · menu contextuel 75 · toast 80
```

**Contrat unique** — un seul composant, deux formes :

```ts
<Overlay
  open            // état
  onClose         // Échap, scrim, bouton
  variant="dialog" | "panel" | "sheet"   // dialog ≥1024, sheet <1024
  size="sm" | "md" | "lg"
  title           // aria-labelledby
  footer?         // actions collées en bas
>
```

| Règle | Pourquoi |
|---|---|
| Rendu par `createPortal(node, document.getElementById("overlay-root"))` | Un seul ancêtre : `body`. Plus d’« encastré » possible |
| `variant` choisi par la coquille, pas par la page | Une page ne sait pas si elle est sur un téléphone ; la coquille, oui |
| Piège de focus + retour du focus à l’ouvreur | Une modale est un contexte, pas un panneau décoratif |
| Verrou de défilement **avec compensation de scrollbar** | Sans elle, la page saute de 15 px à l’ouverture |
| `aria-modal`, `role="dialog"`, titre obligatoire | Accessibilité, et le test peut l’exiger |
| Sur mobile, une feuille peut être tirée vers le bas ; sur bureau, non | Deux gestes, pas un compromis |

**Fichiers concernés :** `src/components/Layout.tsx` (le `Sheet` actuel),
`src/index.css:608-640` et `:1229-1255`, puis les six appelants :
`ProjectSheet`, `VaultSheet`, `ZettelSheet`, `TemplateGallery`,
`GraphStyleGallery`, `NavSettings`. Aucun changement d’API côté pages si
`Sheet` garde sa signature.

---

## 6. Le modèle de données

### La cible

```ts
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
  archivedAt?: string;      // archivé ≠ supprimé
}

interface Vault {
  id: string;
  projectId: string;        // obligatoire : un coffre vit dans un projet
  name: string;
  description?: string;
  category?: string;        // « catégorie » au sens de l’utilisateur : libre
  createdAt: string;
  updatedAt?: string;
}

interface Note {
  id: string;
  vaultId: string;          // obligatoire : une note vit dans un coffre
  projectId?: string;       // dénormalisé pour les filtres ; recalculé sur le vault
  method: "outline" | "cornell" | "mindmap" | "zettelkasten";
  title: string;
  blocks: Block[];
  status: NoteStatus;
  zettel?: {                // la charge utile de la méthode zettelkasten
    code: string;
    refs: string[];
    source?: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

### Les invariants, qui deviennent des tests

1. `note.vaultId` existe toujours ; `note.projectId === vaultOf(note).projectId`.
2. La **méthode** est une propriété de la note : un vault n’a pas de méthode,
   il a un **ensemble** de méthodes. La carte d’un vault affiche
   `méthodes = unique(notes.map(n => n.method))`.
3. Supprimer un vault ne supprime pas ses notes : elles passent en corbeille
   (déjà le comportement de `deleteVault`, à verrouiller par un test).
4. Les compteurs affichés (`nombre de notes`) sont **dérivés**, jamais stockés :
   un compteur stocké finit toujours par mentir.
5. Le graphe d’un projet est l’union des graphes de ses vaults, plus les liens
   inter-vaults. Aucun nœud orphelin.

### La migration, en trois temps (le point coûteux)

Aujourd’hui coexistent `ZettelVault`/`ZettelCard` (fiches zettelkasten, avec
`code`, `refs`, `source`) et `Note` (`method`, `vaultId?`). **108** endroits du
code parlent de `vaultId`. Trois phases, chacune livrable :

| Phase | Ce qu’on fait | Risque | Sortie |
|---|---|---|---|
| **M1 — vérité d’affichage** | La carte d’un vault montre `notes(vaultId) + fiches(vaultId)` et l’union des méthodes. Aucune migration de données | Faible | La promesse « coffre » est tenue à l’écran |
| **M2 — modèle unifié** | `ZettelCard` devient une `Note` de méthode `zettelkasten` avec `zettel: {…}`. Migration idempotente au chargement, testée sur les sauvegardes existantes et sur un export cloud | Moyen : sauvegardes, fusion cloud, 108 sites | Un seul tableau `notes` |
| **M3 — nettoyage** | Suppression de `ZettelVault`, des routes `/vault/:id` (redirigées), de l’onglet « Zettelkasten » | Faible | Un vocabulaire, un modèle |

M2 est la seule décision vraiment coûteuse : elle touche la synchronisation
cloud et les sauvegardes. Elle mérite son propre tour, avec un test de migration
sur un fichier réel.

---

## 7. Espaces — la page, sans la leçon

Ce qu’on retire : les trois paragraphes d’explication (`Spaces.tsx:24-38`), les
rappels de hiérarchie dans les cartes, l’aide « où créer quoi ». Une feature se
comprend en s’en servant ; un mode d’emploi au-dessus d’une liste est un aveu.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Espaces                                              ⌘K   [ ＋ Nouveau projet ]│
│  7 projets · 23 coffres · 412 notes                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│  Tous   Récents   À réviser (12)   Archivés          Trier : Activité ▾       │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌────────────────────────┐ ┌──────────────────┐  │
│  │ Droit des contrats   ⌾ │ │ Superposition quantique│ │ Mémoire & sommeil│  │
│  │ 3 coffres · 42 notes   │ │ 2 coffres · 68 notes   │ │ 1 coffre · 9 notes│ │
│  │ ▓▓▓▓░ Cornell 18       │ │ ▓▓░░ Outline 40        │ │ ▓░░░ Mindmap 9    │  │
│  │ modifié il y a 2 h     │ │ modifié hier           │ │ modifié lundi     │  │
│  │ [Ouvrir]        ⋯      │ │ [Ouvrir]        ⋯      │ │ [Ouvrir]     ⋯    │  │
│  └────────────────────────┘ └────────────────────────┘ └──────────────────┘  │
│                                                                              │
│  ＋ Nouveau projet        (carte fantôme, même taille que les autres)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Filtre professionnel** : trois filtres qui comptent (activité, révision
  due, archivés), un tri explicite, une recherche ; pas de puces décoratives.
- Une carte = nom, compteurs dérivés, répartition des méthodes, dernière
  activité, deux actions (Ouvrir, menu `⋯` : renommer, archiver, supprimer).
- L’état vide n’est pas un cours : une phrase, un bouton.

## 8. Projet → Vaults

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Espaces › Droit des contrats                        [ ⋯ ]   [ ＋ Nouveau coffre]│
│  3 coffres · 42 notes · 2 méthodes                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌──────────────────────────┐ ┌────────────────┐│
│  │ Obligations            ◉ │ │ Responsabilité civile    │ │ Preuves        ││
│  │ Contrats et exécution    │ │ Faute, dommage, lien     │ │ Charge et admin││
│  │ créé le 12 sept. 2026    │ │ créé le 3 oct. 2026      │ │ créé le 20 oct.││
│  │ 24 notes · 3 méthodes    │ │ 12 notes · 2 méthodes    │ │ 6 notes        ││
│  │ ▓ Cornell · ▓ Outline …  │ │ ▓ Zettel · ▓ Mindmap     │ │ ▓ Outline      ││
│  └──────────────────────────┘ └──────────────────────────┘ └────────────────┘│
│  ＋ Nouveau coffre                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

La carte du coffre porte exactement ce que vous avez demandé : **nom,
description, date de création, nombre de notes, méthodes**. Rien d’autre. Ni
« Zettelkasten », ni « graphe » — le graphe est une action du coffre, pas son
identité.

## 9. Vault → Notes

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Espaces › Droit des contrats › Obligations      [Graphe]   [ ＋ Nouvelle note ]│
│  24 notes · Cornell 12 · Outline 8 · Zettel 3 · Mindmap 1                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Toutes   Cornell   Outline   Zettelkasten   Mindmap     Trier : Modifiée ▾   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ▤ Conditions de validité          Cornell    à revoir aujourd’hui   ⋯        │
│  ▤ Obligation de moyens            Outline    revu il y a 3 j        ⋯        │
│  ▤ Force majeure                   Zettel     liée à 4 notes         ⋯        │
│  ▤ Exécution en nature             Mindmap    12 nœuds                ⋯        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Règles : la méthode est une **colonne et un filtre**, pas une page. Créer une
note demande la méthode — c’est le seul choix imposé, parce qu’il change
l’éditeur.

---

## 10. Calendrier — `/calendar`

Objectif : « voir tout », d’un mois, sans naviguer.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Calendrier                                  [ Mois | Semaine | Agenda ]  ◀ ▸ │
│  Octobre 2026                            Filtres : Projet ▾ · Vault ▾ · Types ▾│
├──────────────────────────────────────────────────────────────────────────────┤
│  lun  mar  mer  jeu  ven  sam  dim            │  Jeudi 29 octobre            │
│              1    2    3    4    5            │  ─────────────────────────    │
│   6    7    8    9   10   11   12            │  ● 09:12  4 cartes révisées  │
│  13   14   15   16   17   18   19            │  ● 11:40  Note « Force majeure│
│  20   21   22   23   24   25   26            │           » créée (Cornell)  │
│  27   28  [29]  30   31                      │  ● 18:00  12 cartes à revoir │
│   ·    ·    ·●  ·    ●●                      │           (Obligations)      │
│  ● création  ○ révision faite  ▁ échéances   │                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**D’où viennent les événements** — tout est dérivé, aucune invention :

| Événement | Source | Disponible |
|---|---|---|
| Note créée | `note.createdAt` | oui |
| Révision faite | `logs[].reviewedAt` + `rating` | oui |
| Révision due | `cards[].schedule.due`, `zettel[].schedule.due` | oui |
| Leçon terminée | `progress[].doneAt` | oui |
| Note modifiée | `note.updatedAt` | oui, **masqué par défaut** (bruit) |

**Ce qui n’existe pas et ne sera pas inventé :** les événements créés à la main
(un « examen le 12 » utilisateur). Ce serait une nouvelle entité (`Event`) et un
nouveau panneau d’édition : hors périmètre tant que ce n’est pas demandé.

Sur bureau, le panneau de droite est permanent ; sur mobile, la grille devient
une liste d’agenda groupée par jour.

## 11. Statistiques — `/stats`

Objectif : répondre à « est-ce que je progresse ? », pas décorer avec des
camemberts.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Statistiques                              [ 7 j | 30 j | 90 j | Tout ]      │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│  │ 18 notes │ │ 6 j de   │ │ 82 % de  │ │ 12 cartes│                          │
│  │ ce mois  │ │ série    │ │ rétention│ │ à revoir │                          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                          │
│  Activité (90 j)          ▁▂▃▅▂▇▃▁▂▅▃▁▁▂▃▅▇▂▁▃▂▅▃▁▁▂▇▃▅▂▁▃                        │
│  ─────────────────────────────────────────────────────────────────────────   │
│  Rétention par semaine    ╱╲___╱‾‾╲___╱‾‾‾ (ligne, % good+easy)              │
│  Charge à venir (14 j)    ▃▅▂▁▁▂▇▁▁▂▃▁▁▁ (barres, cartes dues)                │
│  Par méthode              Cornell ▓▓▓▓▓▓▓ 12 · Outline ▓▓▓▓ 8 · …            │
│  Par projet               table triable : notes, à revoir, rétention, série  │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Indicateur | Calcul | Source |
|---|---|---|
| Notes créées (période) | `notes.filter(createdAt ∈ période)` | `useContentStore.notes` |
| Série (streak) | jours consécutifs avec ≥ 1 log | `logs` |
| Rétention | `logs.rating ∈ {good, easy}` / `logs.length` | `logs` |
| Cartes à revoir | `dueCards(cards)` + fiches dues | `lib/scheduler` |
| Activité journalière | notes créées + révisions, par jour | `notes.createdAt`, `logs.reviewedAt` |
| Charge à venir | cartes dues par jour sur 14 j | `schedule.due` |
| Répartition par méthode | compte par `note.method` | `notes` |
| Par projet / vault | agrégat des précédents | jointures dérivées |

**Ce qui n’existe pas :** le **temps d’étude**. Aucune durée de session n’est
enregistrée. On peut l’ajouter (`SessionLog { startedAt, endedAt, cardsSeen }`)
si vous le voulez — mais un graphique de « temps » calculé à partir de rien
serait une invention. Les barres ci-dessus sont toutes mesurables aujourd’hui.

`recharts` est déjà dans `package.json` et `ui/chart.tsx` l’enveloppe : **zéro
dépendance à ajouter**. Même chose pour `react-day-picker` et `date-fns`.

---

## 12. Ce qui ne bouge pas

Contraintes déjà en place, qu’aucune refonte n’a le droit de casser :

- trois couleurs maximum par surface, jetons `--primary/--ring/--accent/--tint` ;
- contraste ≥ 4,5:1 sur le texte des boutons, calculé, pas estimé ;
- fondu `@property` de 0,8 s, cartes `bg-card/40 backdrop-blur-2xl` + voile 22 % ;
- PNG HD pour les fonds, jamais de SVG de remplacement ;
- un écran de réglages ne configure que la surface où l’on est ;
- aucun iframe : **le bureau est la vraie version web**.

---

## 13. Le plan — dans cet ordre

| Phase | Contenu | Critère d’acceptation |
|---|---|---|
| **P0 · Nom** | Einnote → Einnote (76 occurrences), `index.html`, `package.json`, docs, notifications | `grep -ri engram src` = 0 |
| **P1 · Overlays** | `overlay-root`, `<Overlay>` portalé, échelle de plans, dialogue bureau / feuille mobile, piège de focus | un test monte deux pages et vérifie que le dialogue est **enfant de `body`** ; aucune capture « encastrée » possible |
| **P2 · Coquille** | trois zones, `--screen-max 1024`, en-tête de page, variantes `grid`, panneau de contexte | un écran de 1440 px montre 3 colonnes de cartes, pas une colonne de 720 |
| **P3 · Espaces → Vault → Notes** | nettoyage de `Spaces`, carte de coffre (nom, date, notes, méthodes), route `/spaces/:p/:v`, filtre par méthode | un vault contenant 3 méthodes l’affiche ; le graphe reste accessible aux deux échelles |
| **P4 · Calendrier** | `/calendar`, dérivation des événements, panneau du jour | mois navigable, filtres, 4 types d’événements dérivés |
| **P5 · Statistiques** | `/stats`, 4 KPI, 5 graphiques, table par projet | chaque chiffre traçable à une source ; `Progress` redirigé |
| **P6 · Modèle unifié** | M2/M3 de §6 (fusion `ZettelCard` → `Note`) | migration testée sur une sauvegarde réelle + export cloud |

P1 et P2 avant P3 : sans portail et sans largeur, refaire les cartes de coffre
serait du travail à refaire.

---

## 14. Ce que ce document ne tranche pas

- **Le temps d’étude** (§11) : à ajouter ou pas.
- **Les événements manuels** dans le calendrier (§10).
- **La fin de « Apprendre »** : c’est la seule surface qui ressemble à une page
  d’apprentissage, et elle est légitime — mais elle ne doit pas contaminer
  Espaces.

**Une seule question, la plus chère si je me trompe :** la fusion
`ZettelCard` → `Note` (§6, M2) — **maintenant**, avec la migration des
sauvegardes et de la synchronisation cloud, ou **après** le calendrier et les
statistiques, en gardant deux tableaux mais une seule promesse à l’écran (M1) ?
Mon avis : M1 tout de suite, M2 après P4/P5, parce que le calendrier et les
statistiques ont besoin de la **promesse** (un coffre = des notes de plusieurs
méthodes) mais pas de la **table unique**.

---

## 15. État d’avancement — 28 octobre 2026 (soir)

Ce qui est **fait** dans cette phase, et ce qui ne l’est pas encore. Un
document d’architecture qui ne dit pas où en est le code finit par mentir.

### Fait

| Point | Détail |
|---|---|
| **P0 · Nom** | Le produit s’appelle **Einnote** dans l’interface, le titre de la page, les notifications, les noms de fichiers exportés, les docs et `package.json`. Les **clés de stockage restent `engram.*`** : c’est un format de données, les renommer sans migration viderait l’application de chaque utilisateur. Le format de sauvegarde écrit désormais `einnote.backup` et **relit encore `engram.backup`** (testé). |
| **Rail épuré** | Le bloc « Projets » a disparu du rail : les projets se parcourent dans **Espaces**, pas dans la navigation. Une seule entrée en pied de rail, **Réglages** — Apparence, Données, Corbeille, À propos, Progrès sont des sections de Réglages, pas des pages de travail. « Aperçu bureau » a quitté la navigation (l’adresse `/preview` reste, pour les tests côte à côte). |
| **Sept surfaces** | `Note`, `Espaces`, `Calendrier`, `Statistiques`, `Réviser`, `Apprendre` dans le rail ; `Réglages` en pied. Sur téléphone : quatre pages + « Plus », qui ouvre **vers le haut** avec les icônes. |
| **Calendrier `/calendar`** | Grille du mois (semaines complètes, 5 ou 6 lignes selon le mois), panneau du jour, filtres projet et familles d’événements. **Tout est dérivé** : notes créées, révisions faites, échéances FSRS, leçons terminées. Aucun événement saisi à la main. |
| **Statistiques `/stats`** | Quatre indicateurs (notes créées, série, rétention, à revoir), activité jour par jour, rétention hebdomadaire, charge à venir sur 14 jours, répartition par méthode, tableau par projet. `/settings/progress` redirige ici. |
| **Logique testée** | `src/lib/stats.ts` (16 tests) et `src/lib/calendar.ts` (12 tests) : jour **local** et non UTC, jours vides présents, retard replié sur aujourd’hui, échéances agrégées par jour, mois à 5 semaines. |

### Pas encore

| Point | Pourquoi ce n’est pas fait |
|---|---|
| **P1 · Overlays portalés** | Le diagnostic est posé (§5) mais le correctif n’est pas appliqué : `Sheet` rend toujours dans la page. C’est la prochaine étape, et elle est indépendante du reste. |
| **P2 · Coquille à trois zones** | Le contenu reste plafonné à 720 px au-delà de 1024 px. Les deux nouvelles pages utilisent déjà la largeur (`screen-wide`), mais le panneau de contexte n’existe pas. |
| **P3 · Vault = coffre** | La route `/spaces/:projet/:vault` et la carte de coffre (nom, description, date, **nombre de notes**, **méthodes**) restent à faire. Les deux modèles (`ZettelCard` / `Note`) coexistent toujours — la fusion est M2 de §6. |
| **P6 · Modèle unifié** | Non commencé, comme prévu : après P4/P5. |

### Ce que ce tour n’a pas inventé

- Pas de graphique de **temps d’étude** : aucune durée n’est enregistrée.
- Pas d’**événement de calendrier** créé à la main : ce serait une entité de plus.
- Pas de couleur en dur dans les graphiques : ils lisent `var(--accent)` et suivent donc le thème, la palette et l’accent tiré du fond.
- Les bibliothèques `recharts` et `react-day-picker` restent installées mais **non utilisées** : les graphiques et la grille sont écrits en SVG et en CSS, parce qu’ils doivent prendre les jetons du thème et rester mesurables dans les tests.
