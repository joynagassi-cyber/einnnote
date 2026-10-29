# Einnote — ce qui reste à faire, et pourquoi

État au dernier passage de vérification :

- `npx tsc -p tsconfig.app.json --noEmit` : 0 erreur
  (**attention** : `npx tsc --noEmit` à la racine ne vérifie rien, le
  `tsconfig.json` racine n’a que des `references` et `"files": []`)
- `npm run lint` : 0 erreur, 0 avertissement
- `npx vitest run` : **110 tests** (9 fichiers) — 11 moteur d’accent, 8 presets
  CSS↔TS, 10 pont éditeur, 12 filtres, 10 stockage, 10 export Markdown,
  14 projets et migration, 4 `ErrorBoundary`, 29 parcours d’écran
- `npm run build` : ✓ — 1,21 Mo de JS (361 kB gzip) et 143 kB de CSS

Légende : **[Établi]** vérifié dans le code ou par un test · **[Probable]**
déduit du code mais non exercé · **[Incertain]** dépend d’une décision produit
ou d’une contrainte que je ne peux pas vérifier ici.

Les colonnes « Utilité » et « Effort » sont des jugements, pas des mesures :
utilité de 1 (confort) à 5 (sans quoi le produit ne tient pas), effort S/M/L/XL.

---

## 1. Avant toute bêta réelle (P0)

| Sujet | État | Utilité | Effort | Pourquoi maintenant |
| --- | --- | --- | --- | --- |
| **Quota `localStorage`** | ✅ **fait** — `src/lib/storage.ts` mesure, seuils 80 %/90 %, `StorageMeter` sur Données | 5 | S | 5 Mo suffisent pour ~1 500 notes avec images interdites. Sans compteur ni alerte, l’écriture échoue en silence (`QuotaExceededError`) et la dernière frappe est perdue. |
| **Sauvegarde automatique** | ✅ **rappel fait** — `lastBackupAt` + `BackupReminder` à 7 jours ; **reste l’export automatique** (File System Access API) | 5 | S | Un navigateur nettoyé = tout perdu. Un rappel « dernière sauvegarde : il y a 12 jours » coûte quelques heures et évite la catastrophe. |
| **Édition d’une question** | [Établi] on peut supprimer, pas modifier ; le passage n’est pas ré-ancrable | 4 | S | Une faute de frappe oblige à supprimer la carte — donc à perdre son historique de révision. |
| **Raccourcis de révision** | [Établi] évaluation uniquement au clic | 4 | S | `1-4`, `Espace` (révéler), `Échap` : c’est ce qui rend une session de 60 cartes supportable. |
| **Garde-fou d’erreur** | ✅ **fait** — `ErrorBoundary` par route (clé = chemin), « Réessayer » + retour bibliothèque ; la dernière erreur est gardée en `sessionStorage` | 4 | S | Un écran blanc après une exception est le pire scénario pour un outil de notes. L’erreur doit rester locale. |
| **Test sur appareil réel** | [Incertain] validé en jsdom seulement | 5 | M | Le clavier mobile, le `contenteditable` iOS et les gestes de la pile Zettelkasten ne peuvent pas être validés ici. C’est le principal angle mort. |

## 2. Ce qui manque au produit, par domaine

### Éditeur (Quill 2)

| Fonction | État | Utilité | Effort | Commentaire |
| --- | --- | --- | --- | --- |
| Listes sémantiques (`<ul>`, `<ol>`) | ✅ **fait** — listes natives de Quill | 3 | — | L’ancrage des questions tient à l’identifiant posé sur la **ligne**, pas à l’absence de nœuds de liste : le HTML exporté est standard. |
| Images et pièces jointes | absent | 4 | L | Un cours se prend souvent en photo. Demande du stockage (IndexedDB) et une politique de compression. |
| Tableaux, code multi-lignes, maths | absent | 2 | M | Rare dans des notes de cours littéraires ; les maths demandent KaTeX. |
| Réorganisation par poignée | 🟡 partiel — monter / descendre / dupliquer / supprimer existent (barre, palette) ; le glissement à la souris reste à faire | 3 | M | Le geste direct manque encore, mais aucune opération de déplacement n’est absente. |
| Rechercher / remplacer | ✅ **fait** — `Ctrl/⌘ F`, compteur `3 / 7`, remplacer un ou tout | 3 | — | La recherche sélectionne l’occurrence au lieu de décorer le texte. |
| Plan de la note (sommaire) | absent | 2 | S | Les titres existent ; une liste cliquable latérale suffirait. |
| Indicateur « enregistré » | [Établi] enregistrement différé 350 ms, sans retour visuel | 3 | S | Un point qui pulse puis « enregistré » supprime le doute. |
| Historique de versions | absent | 3 | M | Utile pour revenir sur une suppression ; coûteux en stockage. |
| Notes H3 | ✅ **fait** — dans la barre, la palette et les raccourcis | 1 | — | — |

### Apprentissage

| Fonction | État | Utilité | Effort | Commentaire |
| --- | --- | --- | --- | --- |
| Ordonnanceur FSRS réel (`ts-fsrs`) | [Probable] approximation maison (4 boutons, intervalles fixes ×1,2/2,4/3,6) | 4 | M | L’approximation ignore la difficulté par carte ; les intervalles dérivent sur 3 mois. Les tests de `scheduler.ts` décrivent le comportement actuel, pas le bon. |
| Limite quotidienne de nouvelles cartes | absent | 4 | S | Sans plafond, une grosse session crée 200 cartes dues le même jour et décourage. |
| Annuler la dernière évaluation | absent | 4 | S | Un clic malheureux condamne la carte à 3 mois. Mémoire d’une marche arrière suffit. |
| Cartes à trous (cloze) / choix multiple | absent | 3 | L | Le modèle ne connaît qu’un couple question ↔ passage. |
| Cartes inversées, suspension, « leech » | absent | 2 | M | Gestion des cartes qui résistent : suspension après 8 échecs. |
| Réviser depuis la note | absent | 2 | S | Une carte par bloc, en mode flash, sans quitter le contexte. |

### Bibliothèque

| Fonction | État | Utilité | Effort | Commentaire |
| --- | --- | --- | --- | --- |
| Étiquettes transverses | absent | 4 | M | Les collections sont un texte libre sur la note ; des étiquettes multi-valeurs ouvriraient le filtre à facettes. |
| Sélection multiple + actions par lot | absent | 3 | M | Déplacer, corbeille, changer de collection. |
| Filtres enregistrés | absent | 2 | S | « Mes cartes en retard de droit » en un clic. Le store est déjà non persistant par choix ; il suffirait d’une liste nommée. |
| Épingler / favoris | absent | 2 | S | Évite de chercher la note du jour. |

### Zettelkasten, carte mentale

| Fonction | État | Utilité | Effort | Commentaire |
| --- | --- | --- | --- | --- |
| Liens par `[[ ]]` avec autocomplétion | absent | 4 | M | Aujourd’hui les références sont saisies à la main (`#1A`, `#1B`), donc source d’erreurs. |
| Panneau de rétroliens | [Probable] le graphe calcule les voisines, mais aucun panneau dans la pile | 4 | S | « Qui cite cette carte ? » est la moitié de la valeur du Zettelkasten. |
| Numérotation automatique des cartes | absent | 2 | S | Le code est saisi par l’utilisateur. |
| Graphe global du vault | [Établi] volontairement limité à 2 niveaux | 2 | M | Décision produit : éviter la pelote. Un mode « tout le vault » en lecture seule reste possible. |
| Mise en page automatique de la carte mentale | absent | 2 | M | Les nœuds se placent à la main ; un layout radial/branché aiderait les grosses cartes. |
| Export de la carte mentale (PNG/SVG) | absent | 3 | S | Très demandé pour les révisions sur papier. |

### Données et plateforme

| Fonction | État | Utilité | Effort | Commentaire |
| --- | --- | --- | --- | --- |
| SQLite + Capacitor / Electron | [Établi] non implémenté | 5 | XL | Condition pour tenir la promesse « hors ligne, sans serveur » sur mobile et pour dépasser 5 Mo. |
| ~~Export Markdown en un seul fichier~~ | ✅ fait : **arborescence** `.zip`, un fichier par note et par fiche, par projet puis par vault (`docs/TEMPLATES.md` §7) | — | — | — |
| Import Markdown / Obsidian | absent | 4 | M | Le pont existe dans l’autre sens (`blocksToMarkdown`). L’import demanderait un parseur et une politique de blocs. |
| Export PDF | absent | 3 | M | Passe par l’impression CSS d’abord. |
| Versionnage du format | [Établi] sauvegarde `version: 1` avec contrôle | 4 | S | Un refus explicite vaut mieux qu’une restauration partielle. |
| Verrouillage PIN / biométrie | absent | 3 | M | Le stockage est chiffré à l’export, pas au repos. |
| PWA (manifeste + service worker) | absent | 4 | M | Sans lui, l’application n’est pas installable et ne se charge pas hors ligne. |
| Traduction (anglais) | [Établi] `language` existe, aucune ressource | 2 | L | Tout le texte est français en dur. |

---

## 2 bis. Idées qui améliorent les features existantes

Classées par effet / effort. Les trois premières se renforcent : elles
transforment des écrans déjà écrits en boucle d’usage.

| Idée | Feature améliorée | Effet | Effort |
| --- | --- | --- | --- |
| **Révision depuis la bibliothèque** : appui long sur une carte → « Réviser cette note » | Bibliothèque + révision | 5 | S |
| **Fusion de deux vaults** avec réindexation des références | Zettelkasten, projets | 4 | M |
| **Question ↔ bloc ré-ancrable** (glisser la question sur un autre passage) | Cornell, ancrage | 4 | S |
| **Raccourcis clavier** (`1-4`, `Espace`, `Échap`, `⌘K` recherche globale) | Révision, bibliothèque | 4 | S |
| **Carte mentale → plan** (export de l’arbre en titres de note) | Carte mentale, éditeur | 3 | M |
| **« Continuer où j’en étais »** : dernier bloc édité, restauré à l’ouverture | Éditeur | 3 | S |
| **Statistiques par projet** (temps, cartes, notes) sur Progrès | Projets, progrès | 3 | S |
| **Import Markdown inverse** (front-matter → note + projet) | Export Markdown | 4 | M |
| **Compagnon de lecture** : passage collé → découpage en blocs + questions suggérées | Éditeur | 4 | L |
| **Recherche globale `⌘K`** notes + cartes + vaults | Bibliothèque | 5 | M |

## 3. Décisions d’architecture prises dans ce passage

**Un moteur, derrière un contrat — et non un moteur dans les composants.**
Le premier éditeur posait un `contentEditable` par bloc ; le suivant a été
TipTap, dont les commandes avaient fini par entrer dans la barre, la palette et
le registre. Le 29 octobre 2026, le moteur est devenu **Quill 2**, et la
migration a coûté trois fichiers au lieu de trente parce que le produit ne parle
plus qu’à `EditorHost` (`src/lib/editor/host.ts`). Le pont blocs ↔ Delta
(`quill/delta.ts`) est le seul endroit qui connaît le format ; l’adaptateur
(`quill/adapt.ts`) le seul qui appelle Quill. Détail complet :
[`EDITOR-QUILL.md`](./EDITOR-QUILL.md).

**Un bloc = une ligne.** Le pont garantit que l’aller-retour éditeur ↔ stockage
ne perd ni identifiant, ni type, ni puce, ni retrait : c’est ce qui permet aux
questions de rester ancrées après réédition. Le prix est assumé : un saut de
ligne doux (`<br>`) à l’intérieur d’un bloc devient une espace.

**Assainissement à la frontière.** `sanitizeHtml()` retire scripts, iframes et
gestionnaires `on*` du HTML stocké avant qu’il n’entre dans l’éditeur, et le
texte est ré-échappé à la sortie. Un test couvre ce cas.

**Accent dérivé et mesuré.** Une couleur libre ne peut pas produire un texte
illisible : la palette est corrigée jusqu’à AA, et le ratio est affiché.

---

## 4. Risques et angles morts

1. **Le vrai test est sur téléphone.** Clavier iOS, `contenteditable`, gestes :
   rien de tout cela n’est couvert par jsdom. [Incertain]
2. **Poids du bundle** : 1,76 Mo de JS (502 kB gzip) au dernier build. La
   découpe par route (`React.lazy`) et le chargement paresseux du moteur
   diviseraient le premier chargement ; ce n’est pas fait pour ne pas fragiliser
   les tests d’écran, qui montent les routes de façon synchrone. [Établi]
3. **L’ordonnanceur maison dérive.** Il est testé, mais il ne fait pas du FSRS.
   Ne pas communiquer sur des intervalles « scientifiques » avant migration.
   [Probable]
4. **Le stockage local n’est pas une sauvegarde.** L’export chiffré est la
   seule protection ; sans rappel, il ne sera pas utilisé. [Établi]
5. **Accessibilité partielle** : contrastes de l’accent mesurés, reste de la
   palette non audité ; pas de piège de focus dans les feuilles. [Établi]
6. **Aucun test de bout en bout** (Playwright) : les parcours sont vérifiés en
   jsdom, pas dans un vrai navigateur. [Établi]

## 5. Prochaines actions, dans l’ordre

1. **S** Raccourcis de révision (`1-4`, `Espace`, `Échap`) et annulation de la
   dernière évaluation.
2. **S** Édition d’une question (texte + ré-ancrage du passage).
3. **S** Découpe du bundle par route (`React.lazy` + `manualChunks` Quill,
   React Flow) — le premier chargement est à 502 kB gzip.
4. **M** `ts-fsrs` + plafond de nouvelles cartes.
5. **M** PWA (manifeste, service worker) + test sur deux appareils réels.
6. **M** Import Markdown inverse (front-matter → note + projet).
7. **L** Persistance SQLite (Capacitor) — remplace `localStorage`, donc
   `src/lib/storage.ts` et la jauge.

### Fait dans ce passage

Compteur de stockage + alertes, rappel de sauvegarde, `ErrorBoundary` par
route, export Markdown du vault entier, projets (multi-vault) avec migration
v1 → v2, personnalisation avancée pilotée par `data-*`, accent Indigo Gemini,
compositeur mobile au-dessus du clavier, page `/preview` mobile + bureau.

Puis (passage VisualFlow, `docs/VISUALFLOW.md`) : 13ᵉ style **Carte
conceptuelle** (liens nommés), arête unique `EinnoteEdge` (5 dessins, étiquette
sur le chemin), réglages d’affichage (étiquettes / renvois / animation), export
SVG clair-sombre + JSON validé, import d’un graphe en vault, et **6 modèles de
vault** appliqués en un geste depuis `Vaults → + Vault`.
