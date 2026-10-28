# Inventaire de l’éditeur — ce qu’Obsidian sait faire, ce qu’Engram fait

> **But.** Une liste complète, vérifiable et sans complaisance des capacités de
> l’éditeur Obsidian, confrontées à l’état réel du code d’Engram, pour décider
> quoi construire ensuite — et quoi refuser explicitement.
>
> **Sources.** Documentation officielle Obsidian (`obsidianmd/obsidian-help`,
> dossier `en/`, fichiers cités par leur nom) ; pour la comparaison « outliner
> par blocs », `logseq/docs` (`pages/Keyboard shortcuts.md`,
> `pages/Advanced commands.md`). Côté Engram : lecture directe du code
> (`src/lib/editor/*`, `src/components/editor/NoteEditor.tsx`,
> `src/lib/markdown.ts`). Date de relevé : 2026-10-27.
>
> **Statut des cases.** ✅ présent et vérifié · 🟡 partiel ou dégradé ·
> ⛔ absent · ✋ refusé volontairement (avec la raison).

---

## 0. La décision d’architecture qui explique tout le reste

Obsidian est un **éditeur de fichiers Markdown** : le texte source est la
vérité, le rendu est une projection. Engram est un **éditeur de blocs
structurés** : un document = `Block[]`, chaque bloc porte un `blockId`, un
`kind`, et des attributs (`bullet`, `ordered`, `indent`, `marked`). C’est ce qui
permet d’ancrer une question sur un passage précis et de la retrouver après
réédition (`src/lib/editor/blocks.ts`, règle « un bloc = un nœud de premier
niveau »).

Conséquences, à assumer :

| Conséquence | Effet |
|---|---|
| Pas de syntaxe à taper | On ne peut pas « écrire du Markdown » ; il n’y a pas de mode source. |
| Pas de perte à l’export | `blocksToMarkdown` produit un Markdown propre, mais l’aller-retour n’est pas garanti à 100 %. |
| Les attributs de bloc sont pauvres | Puce, numéro, retrait (0–3), citation : c’est tout. Une liste imbriquée *typée* n’existe pas. |
| Le `blockId` est un actif | Les questions, les badges de gouttière, la révision : tout en dépend. Aucune fonctionnalité ne doit le casser. |

C’est le point le plus important du document : **on ne rattrapera jamais
Obsidian sur le texte**, et ce n’est pas le but. On le bat sur la *boucle*
« lire → questionner → réviser », que Markdown ne modélise pas.

---

## 1. Structure du texte

| Capacité | Obsidian (`Basic formatting syntax`) | Engram | Écart |
|---|---|---|---|
| Paragraphes | Ligne vide = paragraphe | ✅ un paragraphe par nœud | — |
| Saut de ligne interne | `Shift+Entrée` ou deux espaces | ✅ `hardBreak` rendu `<br>` | — |
| Titres | `#` à `######` (6 niveaux) | 🟡 H1 et H2 seulement | Volontaire : un carnet d’étude n’a pas besoin de 6 niveaux ; l’outline de la note s’appuie sur 2 niveaux. |
| Listes à puces | `-`, `*`, `+`, imbrication libre | 🟡 puce/numéro = attribut + retrait 0–3 | Pas d’imbrication typée : pas de « sous-liste » sémantique, seulement un retrait visuel. |
| Listes numérotées | `1.` auto-incrément | 🟡 idem, avec l’attribut `ordered` | Pas de renumérotation automatique pilotée par le document. |
| Citations | `>` (imbricables) | 🟡 un attribut `kind: "quote"` sur le bloc | Pas d’imbrication, pas de multi-paragraphes cités d’un bloc. |
| Filets horizontaux | `---` | ✋ désactivé dans StarterKit | Un carnet de blocs n’en a pas besoin ; ils cassent le 1:1 bloc↔nœud. |
| Cases à cocher | `- [ ]` / `- [x]` | ⛔ | **Manque réel** : les listes de tâches sont un usage massif des notes d’étude. |
| Titres repliables | pliage des sections | ⛔ | Utile sur les longues notes ; coût : état de pliage à persister par bloc. |
| Tableaux | `\|` avec en-tête, édition par menu contextuel | ⛔ | **Manque coûteux** : les cours sont pleins de tableaux. |
| Blocs de code | ``` ``` ``` avec coloration | ✋ désactivé | Hors sujet pour des notes de cours littéraires ; à rouvrir si l’usage « technique » arrive. |
| Code en ligne | `` `code` `` | ✅ marque `code` | — |
| Notes de bas de page | `[^1]` | ⛔ | Rare dans un carnet ; coût de rendu élevé. |

## 2. Marques en ligne

| Capacité | Obsidian | Engram | Écart |
|---|---|---|---|
| Gras | `**a**` / `Ctrl+B` | ✅ | — |
| Italique | `*a*` / `Ctrl+I` | ✅ | — |
| Souligné | `<u>` / `Ctrl+U` | ✅ extension StarterKit | — |
| Barré | `~~a~~` | ✅ | — |
| Surlignage | `==a==` | ✅ + **5 couleurs** (`HIGHLIGHTS`) | Au-delà d’Obsidian par défaut. |
| Surlignage multi-couleurs | via callouts ou HTML | ✅ `multicolor: true` + retrait | — |
| Commentaires | `%%texte%%` (invisibles) | ⛔ | Peu utile dans un carnet de révision. |
| Échappement | `\*` | ✋ sans objet (pas de syntaxe) | — |
| Wiki-lien | `[[Note]]`, `[[Note#Titre]]`, alias `\|` | ⛔ | Voir §4 : c’est la ligne la plus délicate. |

## 3. Blocs riches

| Capacité | Obsidian (`Advanced formatting syntax`, `Callouts`) | Engram | Écart |
|---|---|---|---|
| Callouts typés | 13 types (`note`, `tip`, `warning`, `danger`, `quote`, `bug`, `example`…), titres, repliables (`-`/`+`), imbriqués, icônes SVG | ⛔ | **Manque visible.** On a l’ombre d’une citation, pas d’admonition. |
| Callouts personnalisés | CSS `callout-<id>` | ⛔ | — |
| Formules LaTeX | `$…$`, `$$…$$` | ⛔ | Crucial si les notes couvrent éco/sciences ; inutile en droit. À arbitrer. |
| Mermaid | ` ```mermaid `, liens internes acceptés | ⛔ | La carte mentale maison couvre une part du besoin. |
| Images distantes / locales | `![](…)`, redimensionnement `\|100` | ⛔ (aucun nœud image) | **Manque** : coller une capture de cours est un geste de base. |
| Embeddings `![[…]]` | notes, images, blocs, PDF | ⛔ | — |
| HTML brut | autorisé, limité | ✋ sandboxé (`sanitizeHtml`) | Choix de sécurité assumé. |
| Propriétés (frontmatter) | YAML typé, 7 types de champs, vue Properties, Bulk edit | 🟡 champs maison (`collection`, `status`, `projectId`, `tags` sur cartes) | Pas d’éditeur de propriétés libre. |
| Tags | `#tag`, `#a/b` hiérarchiques | 🟡 tags de vault seulement | Pas de tag inline dans une note. |

## 4. Références, liens, circulation

| Capacité | Obsidian | Engram | Écart |
|---|---|---|---|
| Liens externes | `[t](url)` | ✅ marque `link`, autolink, `target=_blank` + `noopener` | — |
| Lien interne entre notes | `[[…]]` + autocomplétion | ⛔ | La bibliothèque et les projets organisent, mais un texte ne peut pas *pointer* vers une note. C’est le manque le plus structurant. |
| Liens retour | panneau Backlinks | ⛔ | Sans lien interne, pas de backlink. |
| Ancres / titres | `[[Note#Section]]` | 🟡 l’ancrage existe, mais par `blockId` (questions), pas par l’auteur | L’ancrage machine est meilleur que l’ancrage texte ; il reste invisible à l’auteur. |
| Blocs référencés | `^bloc-id` | ✅ `data-block-id` sur chaque bloc | **Au-dessus d’Obsidian** pour l’usage révision. |
| Graphe | vue Graph globale | 🟡 graphe du vault uniquement (`ZettelGraph`) | Pas de graphe du carnet entier. |
| Recherche plein texte | recherche + liens | 🟡 recherche bibliothèque (titre + contenu filtré), pas de recherche « dans la note » | — |

## 5. Édition et gestes

| Capacité | Obsidian (`Editing shortcuts`, `Multiple cursors`, `Find and replace`, `Folding`) | Engram | Écart |
|---|---|---|---|
| Annuler / rétablir | `Ctrl+Z` / `Ctrl+Shift+Z` | ✅ barre d’outils + raccourcis | — |
| Copier / coller sans format | `Ctrl+Shift+V` | 🟡 collage natif ProseMirror seulement | — |
| Copier la sélection | `Ctrl+C` sans sélection = paragraphe | 🟡 bouton « Copier la sélection » | — |
| Supprimer la ligne | `Ctrl+Shift+K` | ⛔ | — |
| Déplacement par mot | `Ctrl+←/→` | ✅ natif contenteditable | — |
| Sélection multiple / curseurs | `Alt+clic`, sélection rectangulaire `Shift+Alt` | ⛔ | Puissant, mais rare chez un étudiant. |
| Rechercher / remplacer | dans la note + dans tout le vault | ⛔ dans la note | **Manque gênant** dès qu’une note dépasse 2 écrans. |
| Pliage | replier titres et listes, « Fold all » | ⛔ | — |
| Palette de commandes | tout, avec raccourcis modifiables | ⛔ (le menu « / » couvre 6 insertions) | — |
| Raccourcis personnalisables | fichiers `hotkeys.json` | 🟡 actions fixes (`Mod-Shift-7/8/9`, `Tab`) | — |
| Menu « / » | « Insert » | ✅ 6 entrées : H1, H2, puce, numéroté, citation, texte | Sous-ensemble honnête. |
| Compteur de mots | barre d’état | ✅ `CharacterCount` → `words` | — |
| Modes d’affichage | Lecture / Live Preview / Source | ✋ pas de mode source (par conception) | — |
| Personnalisation typographique | thèmes, CSS snippets | ✅ teinte du papier, largeur de lecture, interlettrage, interligne, taille | **Au-dessus d’Obsidian** pour le confort de lecture mobile. |

## 6. Obsidian Bases — le concurrent direct du panneau d’affichage

`en/Bases/Views.md` décrit exactement le problème qu’on vient de traiter :
vues multiples, tri, regroupement, filtres, propriétés affichées, et sur
téléphone un menu **Display** qui regroupe Results / Sort / Group / Properties.

| Élément de Bases | Engram aujourd’hui |
|---|---|
| Vue unique par surface | ✅ préférences par surface (`engram.display.v1`) |
| Mises en page table / cards / list / kanban / map | 🟡 grille, liste, pile (vault) |
| Tri | ✅ principal + secondaire |
| Regroupement | ✅ un niveau, ordre de groupes dérivé |
| Filtres (et/ou/non, groupes) | 🟡 facettes bibliothèque (méthode, projet, révision) |
| Propriétés affichées | 🟡 non choisies par l’utilisateur |
| Formules | ⛔ |
| Export / copie du résultat | 🟡 export Markdown d’une note, pas d’une vue |

Conclusion : sur le **menu d’affichage**, on est désormais au niveau de Bases
pour un carnet personnel, et au-dessus sur un point — Bases n’a pas de tri
secondaire explicite, nous si.

---

## 7. Les dix manques, classés par coût d’absence

Classement pour **ce produit** (notes de cours + questions + révision), pas en
absolu. Effort : S ≤ ½ j, M ≈ 1–2 j, L ≥ 3 j.

| # | Manque | Pourquoi ça coûte | Effort | Verdict |
|---|---|---|---|---|
| 1 | **Listes de tâches** (`- [ ]`) | Un plan de révision se coche ; sans ça, l’utilisateur sort de l’app | S | À faire |
| 2 | **Tableaux** | Les cours en contiennent partout ; aujourd’hui on ne peut pas les recopier | L | À faire, version minimale (2 colonnes, pas de fusion) |
| 3 | **Images / captures** | Coller la photo d’un schéma est le geste n°1 après la frappe | M | À faire (stockage local, quota) |
| 4 | **Rechercher / remplacer dans la note** | Bloque la correction d’une note longue | S | À faire |
| 5 | **Callouts (3 types)** | Structure visuelle sans invention graphique : `note`, `warning`, `example` | S | À faire |
| 6 | **Lien interne entre notes** | Crée le tissu que le Zettelkasten promet ; sans lui, les vaults sont des îlots | L | À discuter : c’est un changement de modèle (graphe de notes), pas un ajout |
| 7 | **LaTeX en ligne** | Débloque éco/sciences : c’est un choix de marché | M | Dépend du public visé |
| 8 | **Pliage des titres** | Lisibilité des notes longues, gratuit en perception | S | Plus tard |
| 9 | **Propriétés visibles/éditables** | Rend l’organisation explicite au lieu de déduite | M | Plus tard |
| 10 | **Curseurs multiples / sélection rectangulaire** | Confort d’expert | M | ✋ Refusé : coût d’implémentation ProseMirror très supérieur au gain |

**Ce qu’on refuse et pourquoi (à dire clairement) :** mode source, Mermaid,
embeds `![[…]]`, plugins communautaires, palette de commandes extensible,
curseurs multiples. Ce sont les fonctionnalités qui font d’Obsidian un
*environnement* ; les copier dilue la promesse d’Engram, qui est une **boucle
d’apprentissage**, pas un atelier de texte.

---

## 8. Vérification et limites de cet inventaire

**Vérifié dans le code (fait foi)**
- Marques rendues : `MARK_ORDER` dans `src/lib/editor/blocks.ts` → `link`,
  `bold`, `italic`, `underline`, `strike`, `code`, `highlight`.
- Extensions actives et extensions coupées : `StarterKit.configure` dans
  `src/components/editor/NoteEditor.tsx` (`codeBlock`, `horizontalRule`,
  `bulletList`, `orderedList`, `listItem`, `blockquote` = `false`).
- Insertions du menu « / » : `SLASH_ITEMS` (6 entrées) ; surligneurs :
  `HIGHLIGHTS` (5 couleurs).
- Raccourcis clavier réels : `BlockMeta.addKeyboardShortcuts` (`Tab`,
  `Shift-Tab`, `Mod-Shift-7/8/9`).
- Ancrage : `blockId` global sur les nœuds, badges `QuestionBadges`.
- Assainissement du HTML importé : `sanitizeHtml`.

**Non vérifié (à ne pas affirmer sans test)**
- Comportement de `Mod-U` (souligné) sur clavier AZERTY et sur mobile.
- Rendu réel du collage depuis Word / Google Docs (le schéma TipTap peut
  convertir agressivement).
- Performance d’une note > 500 blocs avec badges de gouttière.
- Comportement Obsidian sur les mêmes gestes en version mobile : la doc
  consultée est celle du desktop, avec des notes `mobile: true` ponctuelles.

**Ce que ce document ne dit pas.** Il ne mesure pas la *qualité* du rendu
(lisibilité, rythme typographique) : c’est l’objet du travail thèmes et du dock
de personnalisation, pas de cet inventaire.
