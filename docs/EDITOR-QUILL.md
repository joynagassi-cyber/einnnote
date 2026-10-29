# L’éditeur : Quill 2, et les trois couches qui le tiennent à distance

**Décision du 29 octobre 2026.** Le moteur d’édition est Quill 2. Ce document dit
ce qui a changé, ce qui n’a **pas** changé, et où se trouve chaque
responsabilité — pour qu’une prochaine migration ne se paie pas deux fois.

---

## 0. Conclusion en dix lignes

1. **Le stockage n’a pas bougé.** Une note reste une **liste de blocs**
   (`Block[]` : `id`, `html`, `kind`, `bullet`, `ordered`, `task`, `checked`,
   `indent`, `align`, `marked`). Quill est un moteur d’affichage et de frappe,
   pas un format de fichier.
2. **L’identifiant de bloc survit à tout.** C’est la promesse la plus ancienne
   du produit : une question est ancrée sur un bloc. Le pont écrit l’id dans un
   attribut Parchment (`data-block-id`), et le relit à chaque enregistrement.
3. **`[[Titre]]` reste du texte.** Aucun nœud, aucune table de liens : la
   décoration est une classe (`note-link`, `note-link--broken`), réappliquée
   après chaque frappe. L’export Markdown garde la syntaxe.
4. **Trois fichiers seulement connaissent Quill** : `quill/delta.ts` (le pont),
   `quill/adapt.ts` (le contrat), `quill/bridge.ts` (la porte des tests). Tout le
   reste — barre, palette, pupitre, fiche, registre — parle au contrat
   `EditorHost`.
5. **Aucune commande n’a disparu.** Les 55 commandes du registre passent par les
   mêmes verbes ; ceux qui touchaient à ProseMirror sont devenus des méthodes de
   l’hôte.
6. **Les nœuds natifs de Quill sont assumés** : `<ul>`, `<ol>`, `<blockquote>`,
   `<h1>`, `.ql-indent-N`, `.ql-align-*`. On les habille au lieu de les
   combattre — c’est ce qui garde Entrée, Tabulation, l’annulation et le
   copier-coller du navigateur.
7. **Trois attributs sont les nôtres** : `data-block-id` (identité),
   `data-marked` (« à relire »), `data-rule` (le filet).
8. **Un bloc = une ligne.** Un saut de ligne doux à l’intérieur d’un bloc
   (`<br>`) devient une espace : c’est la contrepartie du modèle, et elle est
   documentée plus bas.
9. **La recherche sélectionne, elle ne décore pas.** Le compteur dit « 3 / 7 »
   et la sélection du moteur montre l’occurrence ; le document n’est jamais
   réécrit.
10. **Vérification honnête** : `tsc` 0, `eslint` 0 erreur, `vitest` 719/719,
    `vite build` ✓. Les tests d’écran ne peuvent pas *taper* dans un
    `contenteditable` sous jsdom : c’est `quill/adapt.test.ts` qui monte un vrai
    moteur et rejoue les gestes par l’API.

---

## 1. Pourquoi Quill

La demande était explicite : remplacer TipTap par Quill 2, avec des réglages du
plus simple au plus complexe. Les contraintes du produit n’ont pas changé :

| Contrainte | Ce qu’elle interdisait |
| --- | --- |
| `Block[]` est le format de la note | Un moteur qui impose son propre document comme source de vérité |
| L’id de bloc survit aux transformations | Un moteur qui recrée les nœuds à chaque opération |
| `[[Titre]]` reste du texte | Un nœud « lien de note » qui ne s’exporterait pas |
| Aucune commande ne disparaît | Un moteur sans équivalent pour une fonction existante |
| Tout en français | Un moteur dont l’UI ne se traduit pas |

Quill 2 tient ces contraintes parce qu’il expose **un Delta** (une suite
d’insertions avec attributs) plutôt qu’un arbre typé : on peut le lire, le
réécrire et le convertir sans posséder le modèle du produit.

---

## 2. Les trois couches

```
  composants (barre, palette, pupitre, fiche)
                    │  EditorHost — 40 verbes, aucun type de moteur
                    ▼
        lib/editor/quill/adapt.ts   ← seul fichier qui appelle Quill
                    │  Delta
                    ▼
        lib/editor/quill/delta.ts   ← seul fichier qui connaît le format
                    │  Block[]
                    ▼
             stores (zustand) → stockage local, export, synchro
```

| Fichier | Rôle | Ce qu’il ignore |
| --- | --- | --- |
| `lib/editor/host.ts` | Le contrat : marques, blocs, sélection, historique, recherche | Quill, le DOM, React |
| `lib/editor/quill/adapt.ts` | Implémente le contrat sur Quill ; enregistre les formats maison | React, les stores |
| `lib/editor/quill/delta.ts` | Blocs ↔ Delta : HTML en ligne, attributs de ligne, ids | Le DOM, la sélection |
| `lib/editor/quill/bridge.ts` | Expose l’instance aux **tests** uniquement | Le produit |

`lib/editor/quill/delta.test.ts` et `lib/editor/quill/adapt.test.ts` couvrent
ces couches : 17 tests de pont, 17 tests de gestes.

---

## 3. Correspondance bloc ↔ ligne Quill

Une ligne Quill se termine par `\n` ; **ses attributs vivent sur ce `\n`**, pas
sur les fragments de texte. C’est la règle qui rend l’aller-retour exact.

| Bloc (`Block`) | Attribut de ligne | Valeur |
| --- | --- | --- |
| `id` | `blockid` → `data-block-id` | chaîne stable |
| `kind: "h1" \| "h2" \| "h3"` | `header` | `1` à `3` |
| `kind: "quote"` | `blockquote` | `true` |
| `kind: "rule"` | `hr` → `data-rule` | `true` |
| `bullet` | `list` | `"bullet"` |
| `ordered` | `list` | `"ordered"` |
| `task` + `checked` | `list` | `"checked"` / `"unchecked"` |
| `indent` | `indent` | `1` à `3` (format `ql-indent-N`) |
| `align` | `align` | `"center"` / `"right"` |
| `marked` | `marked` → `data-marked` | `true` |

Formats en ligne reconnus : `bold`, `italic`, `underline`, `strike`, `code`,
`background` (surlignage, conservé en hexadécimal), `link`, `script`
(`"sub"` / `"super"`), `notelink` (classe `note-link[-‑broken]`), `tag`
(classe `tag-item`, pour `#étiquette`).

**Lecture défensive :** Parchment relit ses attributs dans le DOM, donc un
booléen écrit revient sous forme de chaîne (`"true"`). `isSet()` accepte les deux
formes — sans cela, « à relire » et le filet disparaîtraient au premier
rechargement.

---

## 4. La montée en complexité, telle qu’elle a été livrée

| Étape | Réglage | Ce qui a été fait |
| --- | --- | --- |
| 1 | **Le pont** | `delta.ts` : HTML en ligne ↔ fragments, blocs ↔ Delta, ids. 17 tests. |
| 2 | **Le contrat** | `host.ts` : 40 verbes, aucune dépendance de moteur. |
| 3 | **L’adaptateur** | `adapt.ts` : marques, blocs, listes, retrait, alignement, filet, casse, déplacement, duplication, suppression, historique. |
| 4 | **Le composant** | `NoteEditor.tsx` : montage neutre (pas de `React.StrictMode` double-moteur), frappe débouncée à 350 ms, `/` seul → palette d’insertion, `Ctrl/⌘ F`, `Ctrl/⌘ K`, `Ctrl/⌘ .`, collage sans format. |
| 5 | **Les décorations** | Renvois `[[…]]` par classes, résumé `role="status"` pour les renvois morts, badges de question dans la gouttière (`Q1`, `Q1 +1`). |
| 6 | **Les étiquettes** | `#nom` décoré (`tag-item`) et menu de propositions ancré sous le curseur, au clavier comme à la souris — voir `docs/ETIQUETTES.md`. |

Les formats maison sont enregistrés **une seule fois** (`registerEinnoteFormats`)
et la liste blanche passée à `new Quill` empêche un collage de faire entrer un
format que le produit ne sait pas stocker.

---

## 5. Ce qui est assumé, et pourquoi

1. **Pas de saut de ligne doux.** Un `<br>` dans une note existante devient une
   espace au chargement. La raison : « un bloc = une ligne » est ce qui rend
   l’ancrage des questions exact ; un bloc coupé en deux changerait d’id.
2. **Les renvois ne sont pas tabulables.** Une décoration en ligne n’est pas un
   élément focusable. Le chemin clavier existe quand même : la palette propose
   **« Ouvrir le lien sous le curseur »**.
3. **Le menu de `#` est un menu, pas un nœud.** Il vit à côté du document et
   lit la position du curseur (`getBounds`) ; l’étiquette, elle, reste du texte.
4. **La recherche ne surligne pas.** Elle sélectionne l’occurrence et affiche le
   compteur. C’était le choix de ne pas écrire dans le document pour une action
   de lecture.
5. **Les listes sont celles de Quill.** `<ol>`/`<ul>` natifs, marqueurs dessinés
   en CSS (`.ql-ui` masqué) : le HTML exporté reste standard.
6. **Le moteur ne décore pas son propre DOM.** Toute écriture d’attribut dans
   `.ql-editor` relance l’observateur de Quill, qui relance la mise en forme —
   donc une boucle. Les informations d’accessibilité vivent **à côté** du
   document, jamais dedans.

---

## 6. Ce qu’il reste à vérifier à la main

Les tests couvrent le pont, les gestes et les écrans, mais trois choses
demandent un vrai navigateur :

1. **Le collage depuis Word / Google Docs** : Quill filtre par liste blanche,
   mais le rendu réel des tableaux et des listes imbriquées n’est pas testé.
2. **Le curseur dans un `<li>` à case cochée** : le clic sur la pastille est
   mesuré à 26 px ; jsdom ne fait pas de mise en page, donc seul un écran réel
   le confirme.
3. **Le défilement pendant la recherche** : la sélection est déplacée par le
   moteur ; le comportement de `scrollIntoView` varie selon le navigateur.
