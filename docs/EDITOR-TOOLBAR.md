# Barre d’outils d’édition : Obsidian, les autres, et le catalogue TipTap

**Recherche du 28 octobre 2026.** Ce document répond à trois questions, dans
cet ordre :

1. comment Obsidian conçoit — ou refuse — une barre d’outils d’édition ;
2. ce que font les autres outils de prise de note, et ce qu’ils ont en commun ;
3. la liste **exhaustive** de ce que TipTap met à disposition, et ce qu’Einnote
   peut en faire sans casser son stockage.

Convention de confiance, utilisée dans tout le document :

- **[Établi]** — lu aujourd’hui dans la documentation officielle, le registre
  npm ou le journal de versions du projet.
- **[Probable]** — largement documenté, cohérent entre plusieurs sources, mais
  pas revérifié ligne à ligne aujourd’hui.
- **[Incertain]** — de mémoire, ou sujet à variation rapide. À vérifier avant
  de s’engager dessus.

---

## 0. Conclusion en dix lignes

1. **[Établi] Obsidian n’a pas de barre d’outils sur bureau.** Ce n’est pas un
   oubli : le Markdown *est* l’interface. Les substituts sont la palette de
   commandes, les raccourcis, et — sur mobile seulement — une barre
   configurable.
2. **[Établi] Obsidian a donc une barre là où le clavier manque** (mobile), et
   laisse des plugins la réinventer sur bureau. Le vide est assumé, mais
   comblé par la communauté : `Editing Toolbar` dépasse les 2 millions de
   téléchargements.
3. **[Établi] Notion a inventé le modèle inverse**, et c’est celui qui gagne :
   trois surfaces — menu `/` pour insérer, poignée `⋮⋮` pour transformer un
   bloc, barre flottante pour la sélection.
4. **[Établi] Bear, Craft, Apple Notes** font le minimum vital avec un bouton
   d’appel (`B*I*~U~`, `Aa`), et laissent le reste aux raccourcis.
5. **[Établi] TipTap n’est pas un éditeur** : c’est un schéma ProseMirror et
   82 paquets d’extensions publiés. Aucune barre d’outils n’est fournie — seulement
   des primitives (`BubbleMenu`, `FloatingMenu`, `DragHandle`) pour la
   construire.
6. **[Établi] La barre de référence de TipTap** (démo `StarterKit`) tient en
   vingt-deux boutons : effacer les marques, effacer les nœuds, paragraphe,
   gras, italique, barré, code, H1–H6, puces, numéros, tâches, bloc de code,
   citation, filet, saut de ligne, annuler, rétablir.
7. **Pour Einnote**, la barre actuelle (17 contrôles + menu `/` à 6 entrées +
   barre de sélection) couvre le socle. Le manque n’est pas le nombre de
   boutons, c’est **la transformation de bloc** : on ne peut pas passer d’un
   paragraphe à une tâche ou à un tableau.
8. **La contrainte propre à Einnote** : le stockage est une liste de blocs
   (`Block[]`) où puces, numéros, retrait et citation sont des **attributs**,
   pas des nœuds. Toute extension TipTap qui crée un nœud de liste ou de table
   exige soit une adaptation (attributs), soit une migration du modèle.
9. **Trois lots** sont proposés en §6 : le socle clavier (0 dépendance), le
   confort structurel (3 extensions), le document long (tableaux, images,
   sommaire — migration de données).
10. **La règle à retenir** : une barre d’outils ne se juge pas au nombre de
   boutons, mais à ce qu’elle permet de faire **sans quitter le clavier**.

---

## 1. Ce qu’est une barre d’outils d’édition

Quatre archétypes, et ils ne s’excluent pas :

| Archétype | Où | Force | Faiblesse |
|---|---|---|---|
| **Barre persistante** | Word, Google Docs, Evernote, barre mobile d’Obsidian | État visible, aucune mémoire requise | Mange l’écran, ment sur ce qu’elle peut faire hors contexte |
| **Barre de sélection** (bulle) | Notion, Bear, Medium, Craft | N’apparaît que quand elle sert | Invisible tant qu’on n’a pas sélectionné |
| **Menu d’insertion** (`/` ou `+`) | Notion, Obsidian, Logseq, Einnote | Extensible sans coût visuel | Demande de savoir qu’il existe |
| **Poignée de bloc** (`⋮⋮`) | Notion, Craft, Obsidian (via plugin), TipTap `DragHandle` | Transforme et déplace | Découverte tardive |

**Le consensus 2026** est donc : *palette de commandes + menu `/` + barre de
sélection + poignée de bloc*, la barre persistante n’étant conservée que là où
le clavier est absent (mobile) ou l’utilisateur novice (Google Docs, Apple
Notes).

---

## 2. Obsidian

### 2.1 Sur bureau : aucune barre d’outils

**[Établi]** Il n’existe pas de barre de mise en forme dans l’éditeur de
bureau. Trois modes d’édition cohabitent :

| Mode | Ce qu’on voit | À quoi il sert |
|---|---|---|
| **Live Preview** | Markdown rendu en place ; les symboles réapparaissent sous le curseur | Écriture quotidienne |
| **Source mode** | Markdown brut | Contrôle exact, débogage, tableaux |
| **Reading view** | Rendu seul | Relecture |

Les commandes de mise en forme existent, mais **dans la palette** (`Ctrl/Cmd +
P`) et dans les raccourcis : `Mod-B`, `Mod-I`, `Mod-K`… **[Établi]**

### 2.2 Les commandes de formatage natives

**[Probable]** pour l’ensemble, cohérent entre la documentation et le manuel :

| Famille | Commandes |
|---|---|
| **Titres** | `H1`–`H6`, monter/descendre d’un niveau |
| **Emphase** | Gras, italique, barré, surligné (`==`), code en ligne |
| **Blocs de texte** | Citation (`>`), bloc de code clôturé, filet horizontal |
| **Listes** | Puces, numérotée, tâche (`- [ ]`), retrait/désindentation, basculer puce/numéro/tâche |
| **Liens** | Lien externe, lien interne (`[[…]]`), lien vers un titre (`[[note#titre]]`), vers un bloc (`[[note#^id]]`), embed (`![[…]]`) |
| **Tableaux** | Insérer un tableau, ajouter/supprimer ligne ou colonne, aligner |
| **Notes** | Note de bas de page, commentaire (`%%…%%`), appel de note |
| **Propriétés** | Ajouter/modifier une propriété YAML, gérer les tags |
| **Divers** | Échapper un caractère, insérer une formule LaTeX, un bloc Mermaid, une date, un modèle |

### 2.3 La syntaxe étendue, qui remplace la barre

**[Établi]** Ce qu’Obsidian ajoute au Markdown standard :

| Élément | Syntaxe | Particularité |
|---|---|---|
| Lien interne | `[[Note]]`, `[[Note\|texte]]` | Autocomplétion, création à la volée |
| Embed | `![[Note]]`, `![[Note#titre]]`, `![[Note^id]]` | Transclusion vivante |
| Callout | `> [!type] Titre` | 13 types et plus, pliable (`-`/`+`) |
| Référence de bloc | `^id` | Rend un paragraphe citable |
| Surlignage | `==texte==` | Couleur possible depuis 1.14 |
| Commentaire | `%%texte%%` | Masqué en lecture |
| Tag | `#projet/sous-projet` | Hiérarchique, indexé |
| Maths | `$…$`, `$$…$$` | KaTeX |
| Diagrammes | ` ```mermaid ` | Rendu natif |
| Propriétés | YAML en tête | Champs typés, requêtes |

### 2.4 La barre mobile — la seule barre officielle

**[Établi, obsidian.md/help/mobile]** Une rangée d’icônes au-dessus du clavier,
**entièrement configurable** :

- réordonner et retirer les actions existantes (poignées, boutons de retrait) ;
- ajouter **n’importe quelle commande** de l’application (« Ajouter une
  commande… »), y compris celles des plugins ;
- plusieurs rangées : le balayage horizontal révèle la suite ;
- réglage accessible par la clé de réglage de la barre ou par
  *Réglages → Interface → Configurer la barre d’outils mobile*.

C’est le modèle exact qu’une application web devrait copier : **une barre
courte par défaut, extensible par la palette**.

### 2.5 Les plugins de barre d’outils et de formatage

**[Établi]** L’annuaire communautaire compte **10 plugins étiquetés
`#toolbar`** et **44 étiquetés `#formatting`** (obsidianstats.com, consulté le
28/10/2026). Les plus structurants :

| Plugin | Auteur | Ce qu’il ajoute | État |
|---|---|---|---|
| **Editing Toolbar** | Cuman (PKM-er) | Barre façon traitement de texte : titres, couleurs de texte et de fond, alignement, retrait de liste, filet ; palette de couleurs, brosse de formatage, icônes et libellés personnalisables, sous-menus, réordonnancement par glisser, thèmes *Default / Tiny / Glass*, mode « suit le curseur », bouton IA | v4.1.11, 24/10/2026, actif **[Établi]** |
| **cMenu** | Chetachi | Barre minimale d’origine : gras, italique, barré, souligné, exposant, indice, code, bloc de code, citation, + toute commande | v1.1.2, 5 ans, bureau seul, MPL-2.0 **[Établi]** |
| **Note Toolbar** | Chris Gurney | Barres **contextuelles par note** : attachées par dossier ou propriété, en haut/bas/au curseur, sur sélection, dans le ruban, les barres mobiles, les callouts, via commandes et URI ; réglages de style, épinglage, auto-masquage | actif, ~438 k téléch. **[Établi]** |
| **Mini Toolbar** | AidenLx & Boninall | Petite barre en ligne sur sélection en Live Preview : couper, copier, gras, italique, souligné | **[Établi]** |
| **Commander** | jsmorabito | Place n’importe quelle commande partout (ruban, barre d’onglets, menus contextuels, barre mobile) et crée des macros | actif, ~800 k **[Établi]** |
| **Power Editor** | Power Plugins | Barre + bulle de sélection + menu `/` + poignées de blocs + redimensionnement d’image + dictée + IA, **en restant du Markdown** | récent **[Établi]** |
| **Gay Toolbar** | chaskane | Barre mobile flottante : deux commandes par bouton (appui / appui long), gestes, couleurs, configurations sauvegardées | récent **[Établi]** |
| **toolbar+** | — | Barre mobile qui se détache en pavé gestuel à huit directions | récent **[Établi]** |
| **PopKit** | Zhou Hua | Barre à la PopClip | **[Établi]** |
| **Mobile Toolbar Utilities** | Buckley Research | Trois commandes pour la barre mobile : supprimer la ligne courante, l’envoyer dans une autre note, la basculer en case à cocher | **[Établi]** |

Et, côté **formatage** (compléments à la barre, pas des barres) :

| Plugin | Ce qu’il fait |
|---|---|
| **SupSub** | Enveloppe la sélection en `<sub>`/`<sup>` au clavier |
| **Autocorrect Formatter** | Corrections typographiques et formatage automatique du Markdown |
| **Advanced Tables** | Navigation et édition de tableaux façon tableur, formules |
| **Admonition** / **Callout Manager** / **Callout Integrator** | Création et personnalisation des callouts |
| **Linter** | Normalise YAML, notes de bas de page, titres, espacement, gras/italique |
| **Markdown prettifier** / **Formatto** | Réécriture automatique du Markdown |
| **Extended Markdown Syntax** | Emphases supplémentaires, gras/italique multi-lignes |
| **Multi-Column Markdown** | Colonnes en lecture |
| **MAKE.md** (Maker Mode) | Style et blocs sans écrire de Markdown |
| **Mermaid Tools** | Barre visuelle d’éléments Mermaid |
| **Emoji Picker** | Sélecteur d’emoji avec bouton de barre |
| **Change Case** / **Text Conversions** / **Inline spoilers** / **Paste Mode** / **Code block from selection** | Micro-transformations de sélection |
| **Table Line Break Mobile** / **Sectionals** / **Chronobars** / **Canvas Folding** | Structures et aides d’édition spécialisées |

### 2.6 Ce que ce choix coûte

**[Établi]** Observer Obsidian, c’est comprendre trois choses :

1. **La barre est un aveu** : si elle est indispensable, c’est que la syntaxe
   n’est pas apprise. Obsidian préfère enseigner `**`, `#`, `[[`.
2. **Le vide est instable** : sans barre, trois plugins se sont disputé le
   même besoin, avec des qualités inégales et deux quasi-abandonnés (cMenu).
3 **La configuration est le vrai produit** : ce qui a réussi (Editing Toolbar,
   Note Toolbar), c’est la personnalisation par commandes, pas les boutons.

---

## 3. Les autres outils

| Outil | Modèle | Barre persistante | Bulle de sélection | Menu `/` | Poignée de bloc |
|---|---|---|---|---|---|
| **Obsidian** | Markdown + Live Preview | Non (mobile seulement) | Via plugin | Via plugin | Via plugin |
| **Notion** | Blocs | Non | **Oui** (Turn into, couleur, B/I/U/S/code, lien, commentaire) | **Oui**, groupé | **Oui** (`⋮⋮` : Turn into, couleur, dupliquer, déplacer, supprimer) |
| **Bear** | Markdown CommonMark | Oui, à la demande — bouton `B*I*~U~` ouvre la *Formatting Bar* (Mac) / *Formatting Keyboard* (iOS) | Non | Non | Non |
| **Craft** | Blocs | Oui (sélecteur de style) | Oui | Oui | Oui |
| **Apple Notes** | Riche | Oui, bouton `Aa` : Titre, Sous-titre, Corps, Monospace, gras, italique, souligné, barré, surlignage, listes, cases, tableau, pièces jointes | Non | Non | Non |
| **Evernote** | Riche | Oui (styles, couleurs, tableaux, pièces jointes) | Non | Non | Non |
| **Google Docs** | Riche | Oui (complète) | Non | `@` pour objets | Non |
| **Logseq** | Blocs Markdown | Non | Non | Oui | Oui (menu de bloc) |
| **Roam** | Blocs | Non | Non | Oui | Oui |
| **Joplin** | Markdown + riche | Oui dans l’éditeur riche | Non | Non | Non |
| **Zettlr** | Markdown | Oui (barre de formatage) | Non | Non | Non |
| **Typora** | Markdown | Non — raccourcis et menu *Format* | Oui (petite) | Non | Non |
| **OneNote** | Riche | Oui (ruban) | Non | Non | Non |

**[Établi]** pour Notion (surfaces détaillées plus bas), Bear, Apple Notes ;
**[Probable]** pour Craft, Evernote, Joplin, Zettlr, Typora, Logseq, Roam ;
**[Incertain]** pour OneNote et Google Docs dans le détail de chaque bouton.

### 3.1 Notion, en détail — le modèle à trois surfaces

**[Établi]** Le menu `/` est groupé : *Blocs de base* (texte, page, tâche,
H1–H4, puces, numéros, liste pliable, citation, callout, tableau, séparateur,
lien vers une page), *Média* (image, vidéo, audio, code, fichier, signet),
*Bases de données*, *Avancé* (deux colonnes, équation, sommaire).

La barre de sélection propose : **Text ▾ (Turn into)**, couleur de texte et de
fond, gras, italique, souligné, barré, code, lien, commentaire, IA.

La poignée `⋮⋮` propose : **Turn into ›**, couleur ›, copier le lien du bloc,
dupliquer, déplacer vers ›, supprimer. Le `+` ajoute un bloc **en dessous**
(`Option`-clic : au-dessus).

**Ce que Notion a compris** : les trois surfaces partagent **le même
vocabulaire de types de blocs**. C’est ce qui rend l’ensemble apprenable — on
apprend « Turn into » une fois, on l’utilise partout.

### 3.2 Bear et Apple Notes — le bouton d’appel

**[Établi]** Bear masque les symboles Markdown hors du curseur et ouvre sa
barre par un bouton explicite `B*I*~U~`. Apple Notes fait pareil avec `Aa`.
Dans les deux cas, **la barre n’est pas permanente** : elle est une aide
ponctuelle, pas un cadre.

C’est un compromis élégant pour une application qui doit rester « calme » :
aucun pixel de chrome tant qu’on n’en demande pas.

---

## 4. TipTap — catalogue exhaustif

### 4.1 Trois couches, à ne pas confondre

| Couche | Ce que c’est | Paquets |
|---|---|---|
| **Noyau** | Éditeur, schéma ProseMirror, commandes, historique | `@tiptap/core`, `@tiptap/pm`, `@tiptap/react` |
| **Extensions** | Nœuds (structure), marques (inline), fonctionnalités (greffons) | `@tiptap/extension-*`, `@tiptap/extensions` |
| **UI** | Rien d’imposé : seulement des primitives de menus | `BubbleMenu`, `FloatingMenu`, `DragHandle` |

**TipTap ne fournit aucune barre d’outils.** La démo officielle en construit
une à la main : *annuler/rétablir, gras, italique, barré, code, effacer les
marques, effacer les nœuds, paragraphe, H1–H6, puces, numéros, tâches, bloc de
code, citation, filet, saut de ligne*. **[Établi]**

### 4.2 Les paquets officiels publiés sur npm

**[Établi]** Relevé au 28/10/2026 : **82 paquets** dont le nom commence par
`@tiptap/` (hors `@tiptap-pro/*`, qui vit sur un registre privé).

#### Noyau et rendu (13)

| Paquet | Rôle |
|---|---|
| `@tiptap/core` | `Editor`, `Node`, `Mark`, `Extension`, commandes |
| `@tiptap/pm` | Réexport de ProseMirror (state, view, model, commands, schema-list…) |
| `@tiptap/react` | `useEditor`, `EditorContent`, `useEditorState`, `NodeViewWrapper` |
| `@tiptap/vue-2`, `@tiptap/vue-3` | Équivalents Vue |
| `@tiptap/html` | Rendu HTML hors éditeur |
| `@tiptap/static-renderer` | Rendu statique (React, HTML, Markdown) |
| `@tiptap/markdown` | Aller-retour Markdown natif (bêta) |
| `@tiptap/cli` | Outils en ligne de commande |
| `@tiptap/suggestion` | Moteur des menus de suggestion (`/`, `@`, `[[`) |
| `@tiptap/starter-kit` | Le socle en un paquet (voir §4.4) |
| `@tiptap/extensions` | Les utilitaires regroupés en v3 (voir §4.3) |
| `@tiptap/y-tiptap` | Pont Yjs pour la collaboration |

#### Nœuds (32)

| Paquet | Ce qu’il ajoute |
|---|---|
| `extension-document`, `extension-paragraph`, `extension-text` | Le minimum vital du schéma |
| `extension-heading` | H1–H6 (niveaux configurables) |
| `extension-blockquote` | Citation |
| `extension-bullet-list`, `extension-ordered-list`, `extension-list-item`, `extension-list` | Listes ; `extension-list` exporte **ListKit** |
| `extension-task-list`, `extension-task-item` | Cases à cocher (imbrication optionnelle) |
| `extension-code-block`, `extension-code-block-lowlight` | Bloc de code, avec coloration (lowlight) |
| `extension-horizontal-rule`, `extension-hard-break` | Filet, saut de ligne |
| `extension-image` | Image (URL, attributs) |
| `extension-audio` | Audio intégré |
| `extension-youtube`, `extension-twitch` | Vidéos intégrées |
| `extension-emoji` | Emoji en nœud inline, avec image de repli |
| `extension-details`, `extension-details-content`, `extension-details-summary` | Blocs pliables (`<details>`) |
| `extension-mention` | `@mention` (avec `suggestion`) |
| `extension-table`, `extension-table-row`, `extension-table-cell`, `extension-table-header` | Tableaux ; `extension-table` exporte **TableKit** |
| `extension-mathematics` | Formules LaTeX (nœud et en ligne) |
| `extension-table-of-contents` | Sommaire calculé sur les titres |
| `extension-unique-id` | Identifiant stable par nœud — **ce qui manque pour citer un bloc** |
| `extension-node-range` | Sélectionner une plage de nœuds |

#### Marques (13)

`extension-bold`, `extension-italic`, `extension-strike`, `extension-code`,
`extension-underline`, `extension-highlight` (multicolore optionnel),
`extension-link`, `extension-color`, `extension-text-style` (le porteur des
styles inline), `extension-font-family`, `extension-subscript`,
`extension-superscript`, `extension-ruby-text` (furigana).

> `extension-text-style` exporte **TextStyleKit** = TextStyle + Color +
> BackgroundColor + FontFamily + FontSize + LineHeight. **[Établi]**

#### Fonctionnalités (17 paquets + utilitaires regroupés)

| Paquet / extension | Ce qu’il apporte à une barre d’outils |
|---|---|
| `extension-character-count` | Compteur de mots/caractères et limite |
| `extension-placeholder` | Texte d’appel sur une ligne vide |
| `extension-focus` | Surligne le bloc sous le curseur |
| `extension-selection` *(dans `extensions`)* | Conserve la sélection quand l’éditeur perd le focus — indispensable pour une barre cliquable |
| `extension-dropcursor`, `extension-gapcursor` | Retour visuel du glisser-déposer, curseur dans les « trous » |
| `extension-trailing-node` | Garantit un paragraphe final (sinon impossible de cliquer après une table) |
| `extension-undo-redo` *(dans `extensions`)* | Annuler / rétablir |
| `extension-list-keymap` | Règles de clavier des listes (Tab, Entrée, retour arrière) |
| `extension-typography` | Guillemets, tirets, ellipses automatiques |
| `extension-bubble-menu` | Bulle au-dessus de la sélection |
| `extension-floating-menu` | Menu sur une ligne vide |
| `extension-drag-handle` (+ `-react`, `-vue-2`, `-vue-3`) | Poignée de bloc déplaçable |
| `extension-file-handler` | Glisser-déposer et coller de fichiers |
| `extension-find-and-replace` | Rechercher / remplacer |
| `extension-invisible-characters` | Afficher espaces, sauts, paragraphes |
| `extension-collaboration`, `extension-collaboration-caret` | Édition partagée, curseurs distants (Yjs) |
| `extension-ai-toolkit`, `server-ai-toolkit` | Primitives pour agents IA |

**Fonctionnalités documentées mais exportées par un paquet existant**
**[Probable, à vérifier paquet par paquet]** : `FontSize`, `LineHeight`,
`BackgroundColor`, `Color`, `FontFamily` (via `extension-text-style`),
`TextAlign` (`extension-text-align`), `ListKit` (`extension-list`),
`TableKit` (`extension-table`), `TextStyleKit`
(`extension-text-style`), `UndoRedo`, `Selection`, `TrailingNode`
(`@tiptap/extensions`).

#### Hors du noyau : Pro, Team, Add-on

**[Établi, changelog public]** Paquets `@tiptap-pro/*` :

`extension-ai`, `extension-bookmark`, `extension-columns`, `extension-comments`,
`extension-content-protection`, `extension-convert-kit`,
`extension-cross-references`, `extension-document-styles`,
`extension-export` (+ `-doc`, `-docx`, `-docx-header-footer`, `-epub`,
`-markdown`, `-odt`, `-pdf`), `extension-footnotes`, `extension-import`,
`extension-import-docx`, `extension-number-formats`,
`extension-outline-numbering`, `extension-page-layout` (+ react),
`extension-pagebreak`, `extension-pages` (+ `-pagekit`, `-tablekit`),
`extension-paste-handler`, `extension-slot`, `extension-snapshot`,
`extension-snapshot-compare`, `extension-split-view`,
`extension-tracked-changes`, `extension-variable`, `extension-whiteboard`,
`extension-whole-blocks`, `provider` (+ react).

**À retenir** : les fonctionnalités qui font un « vrai » traitement de texte —
commentaires, suivi de modifications, historique de versions, export DOCX/PDF,
notes de bas de page, références croisées, colonnes, pagination — sont
**toutes payantes** chez TipTap.

### 4.3 Les kits (v3)

**[Établi]**

| Kit | Contenu | Paquet |
|---|---|---|
| `StarterKit` | Blockquote, BulletList, CodeBlock, Document, HardBreak, Heading, HorizontalRule, ListItem, OrderedList, Paragraph, Text, **Bold, Code, Italic, Link, Strike, Underline**, Dropcursor, Gapcursor, UndoRedo, ListKeymap, TrailingNode | `@tiptap/starter-kit` |
| `ListKit` | BulletList, ListItem, OrderedList, TaskItem, TaskList, ListKeymap | `@tiptap/extension-list` |
| `TableKit` | Table, TableRow, TableCell, TableHeader (+ options de redimensionnement) | `@tiptap/extension-table` |
| `TextStyleKit` | TextStyle, Color, BackgroundColor, FontFamily, FontSize, LineHeight | `@tiptap/extension-text-style` |

**Nouveautés de la v3 utiles à une barre d’outils** : `Link`, `Underline` et
`ListKeymap` entrent dans le StarterKit ; `History` devient `UndoRedo` ;
`CollaborationCursor` devient `CollaborationCaret` ; les utilitaires
(`CharacterCount`, `Placeholder`, `Dropcursor`, `Gapcursor`, `TrailingNode`,
`Focus`, `Selection`) déménagent dans `@tiptap/extensions`. **[Établi]**

### 4.4 La communauté (npm, 28/10/2026)

**[Établi]** Extensions tierces les plus installées, hors `@tiptap` :

| Paquet | Téléch./sem. | Ce qu’il ajoute |
|---|---|---|
| `tiptap-extension-global-drag-handle` | ~238 k | Poignée de bloc globale |
| `tiptap-extension-resize-image` | ~217 k | Images redimensionnables |
| `tiptap-extension-auto-joiner` | ~96 k | Joint les nœuds voisins du même type |
| `tiptap-extension-resizable-image` | ~28 k | Variante de redimensionnement |
| `tiptap-extension-code-block-shiki` | ~20 k | Coloration Shiki |
| `tiptap-extension-font-size` | ~18 k | Taille de police (avant la v3) |
| `@intevation/tiptap-extension-office-paste` | ~13 k | Nettoyage du collage Office |
| `@sereneinserenade/tiptap-search-and-replace` | ~13 k | Rechercher/remplacer communautaire |
| `@veltdev/tiptap-velt-comments` | ~9 k | Commentaires superposés |
| `tiptap-extension-mermaid`, `prosemirror-mermaid` | ~1–2 k | Diagrammes Mermaid |
| `tiptap-extension-pagination` | ~1 k | Pagination |
| `tiptap-extension-iframe`, `tiptap-extension-video`, `tiptap-extension-figma` | < 1 k | Intégrations |

**Règle** : préférer l’officiel quand il existe ; ces paquets ne sont utiles que
pour ce que TipTap ne fait pas (Mermaid, redimensionnement d’image, pagination).

### 4.5 Traduction : quel bouton pour quelle extension

C’est le tableau à garder sous la main quand on construit une barre.

| Bouton | Extension(s) | Commande |
|---|---|---|
| Gras / Italique / Souligné / Barré | Bold, Italic, Underline, Strike | `toggleBold()`, `toggleItalic()`, `toggleUnderline()`, `toggleStrike()` |
| Code en ligne | Code | `toggleCode()` |
| Surlignage | Highlight `{ multicolor: true }` | `toggleHighlight({ color })` |
| Couleur de texte | Color + TextStyle | `setColor()` / `unsetColor()` |
| Couleur de fond | BackgroundColor + TextStyle | `setBackgroundColor()` |
| Police, taille, interligne | FontFamily, FontSize, LineHeight (TextStyleKit) | `setFontFamily()`, `setFontSize()`, `setLineHeight()` |
| Alignement | TextAlign | `setTextAlign("left"\|"center"\|"right"\|"justify")` |
| Exposant / indice | Superscript, Subscript | `toggleSuperscript()`, `toggleSubscript()` |
| Lien | Link | `setLink()`, `unsetLink()`, `extendMarkRange("link")` |
| Titre 1–6 / paragraphe | Heading, Paragraph | `toggleHeading({ level })`, `setParagraph()` |
| Citation | Blockquote | `toggleBlockquote()` |
| Puces / numéros / tâches | BulletList, OrderedList, TaskList+TaskItem | `toggleBulletList()`, `toggleOrderedList()`, `toggleTaskList()` |
| Retrait / désindentation | (listes) | `sinkListItem()`, `liftListItem()`, `splitListItem()` |
| Bloc de code | CodeBlock (± Lowlight) | `toggleCodeBlock()` |
| Filet | HorizontalRule | `setHorizontalRule()` |
| Saut de ligne | HardBreak | `setHardBreak()` |
| Tableau | TableKit | `insertTable()`, `addRowAfter()`, `addColumnAfter()`, `deleteTable()`… |
| Image | Image | `setImage({ src, alt })` |
| Vidéo / audio | Youtube, Twitch, Audio | `setYoutubeVideo()`, etc. |
| Emoji | Emoji | `insertContent()` |
| Bloc pliable | Details + Summary + Content | `setDetails()` |
| Formule | Mathematics | `insertContent("$…$")` |
| Sommaire | TableOfContents | nœud calculé |
| ID de bloc | UniqueID | attribut `id` |
| Mention | Mention + Suggestion | menu de suggestion |
| Barre de sélection | BubbleMenu (react/menus) | composant |
| Menu sur ligne vide | FloatingMenu | composant |
| Poignée de bloc | DragHandle | composant |
| Rechercher/remplacer | FindAndReplace | commandes dédiées |
| Compteur de mots | CharacterCount | `editor.storage.characterCount.words()` |
| Texte d’appel | Placeholder | option `placeholder` |
| Espaces invisibles | InvisibleCharacters | `toggleInvisibleCharacters()` |
| Typographie automatique | Typography | automatique |
| Mode focus | Focus | automatique |
| Sélection persistante | Selection | automatique |

---

## 5. Einnote aujourd’hui

### 5.1 Inventaire exact de la barre (source : `src/components/editor/NoteEditor.tsx`)

**[Établi]** Quatre groupes, 17 contrôles :

| Groupe | Boutons |
|---|---|
| **Historique** | Annuler, Rétablir |
| **Structure** | Titre 1, Titre 2, Liste à puces, Liste numérotée, Citation |
| **Marques** | Gras, Italique, Souligné, Barré, Code, Surligner (5 couleurs + retrait), Lien |
| **Retrait** | Décaler à droite, Décaler à gauche |
| **Insertion** | `+` (nouveau bloc à puce) |

Plus :

- **menu `/`** à 6 entrées (Titre 1, Titre 2, puces, numéros, citation,
  paragraphe) ;
- **barre de sélection** (« Créer une question », surligner, gras, copier) ;
- **compteur de mots**, **pastilles de questions** en gouttière ;
- raccourcis : `Mod-B/I/U`, `Mod-Shift-8` (puces), `Mod-Shift-7` (numéros),
  `Mod-Shift-9` (citation), `Tab`/`Shift-Tab` (retrait).

### 5.2 Écart avec le catalogue TipTap

| Manque | Coût | Verdict |
|---|---|---|
| **Titre 3** (et niveaux 4–6) | trivial — `heading.levels` | à faire |
| **Cases à cocher** | moyen — pas de nœud de liste dans le stockage | à faire en attribut `task: true` |
| **Filet horizontal** | trivial — nouvel attribut `rule` ou nœud `horizontalRule` | à faire |
| **Exposant / indice** | trivial — 2 extensions | à faire |
| **Effacer la mise en forme** | trivial — `unsetAllMarks()` + `clearNodes()` | à faire |
| **Copier / coller sans format** | faible — manipulation du presse-papiers | à faire |
| **Rechercher / remplacer** | moyen — `FindAndReplace` | à faire |
| **Poignée de bloc** | moyen — `DragHandle` + menu de bloc | à faire (le plus rentable) |
| **Tableaux** | élevé — nouveau type de bloc, export Markdown, questions ancrées | après migration |
| **Images / pièces jointes** | élevé — stockage local-first des fichiers | après décision de stockage |
| **Formules LaTeX** | moyen — KaTeX + nœud | plus tard |
| **Sommaire / plan** | moyen — `TableOfContents` | plus tard |
| **Notes de bas de page** | élevé — Pro chez TipTap | plus tard |
| **Couleur de texte, police, taille** | moyen — mais **contraire** à la charte (3 couleurs, typographie unique) | refusé, volontairement |
| **Alignement** | faible — mais le format est un texte linéaire | reporté |
| **Commentaires, suivi de modifications, versions** | très élevé (Pro) | hors périmètre |
| **Collaboration temps réel** | très élevé (Yjs + serveur) | déjà cadré par l’offre cloud payante |

### 5.3 La contrainte qui commande tout

**[Établi]** `src/lib/editor/blocks.ts` : *« un bloc = un nœud de premier
niveau (paragraphe ou titre). Les puces, la numérotation, le retrait et la
citation sont des attributs du bloc, pas des nœuds de liste : le retour de
l’éditeur vers le stockage est donc exact, sans heuristique. »*

Conséquences :

1. **Brancher `TaskList` ou `Table` tel quel casserait le pont** : le nœud
   produit n’est pas un paragraphe, `docToBlocks` le perdrait.
2. Les extensions **de marque** (Superscript, Subscript, Highlight, Link)
   passent sans risque : elles vivent dans le HTML des blocs.
3. Les extensions **qui ajoutent un attribut** à `paragraph`/`heading` sont
   sûres (c’est déjà le cas de `BlockMeta`).
4. Toute nouvelle structure demande **trois choses ensemble** : un attribut ou
   un nouveau `BlockKind`, un rendu Markdown, et un test de survie au
   rechargement.

---

## 6. Recommandation — trois lots

### Lot A · le socle clavier (aucune dépendance, ~1 jour)

- Titre 3 ; filet horizontal ; exposant / indice ; effacer la mise en forme ;
  coller sans format.
- Raccourcis complets et **affichés dans les infobulles** (`Mod-Alt-1…3`,
  `Mod-Shift-7/8/9`, `Mod-K`, `Mod-Shift-X`).
- Menu `/` porté de 6 à 20 entrées, avec recherche.
- **Critère** : une note entière rédigée sans toucher la souris.

### Lot B · l’édition structurelle (~3 jours, 2 extensions)

- `TaskList`/`TaskItem` **remplacés** par un attribut `task` maison : la case
  est un glyphe dans le paragraphe, pas un nœud. Le Markdown produit `- [ ]`.
- `DragHandle` + menu de bloc (Turn into, dupliquer, supprimer, déplacer) —
  **le vocabulaire de Notion, appliqué aux attributs existants**.
- `FindAndReplace`.
- **Critère** : transformer un paragraphe en citation, en titre ou en tâche
  sans le réécrire, au clavier comme à la poignée.

### Lot C · le document long (migration, ~2 semaines)

- Tableaux et images : nouveau `BlockKind`, stockage de fichiers local-first,
  export Markdown, ancrage des questions conservé.
- Sommaire calculé sur les titres ; `UniqueID` pour citer un bloc.
- **Critère** : une note de 5 000 mots avec un tableau reste exportable et
  ses questions restent ancrées.

**Ce qu’on ne fera pas** : couleur de texte libre, choix de police, taille de
police, alignement — ils contredisent la charte (trois couleurs, typographie
unique) et n’ajoutent rien à l’apprentissage. Une barre qui grossit sans
doctrine devient celle de Word : personne ne sait plus où est le gras.

---

## 7. Annexe — vérifier et rafraîchir

```bash
# Liste courante des paquets officiels (à dater)
curl -s "https://registry.npmjs.org/-/v1/search?text=%40tiptap&size=250" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(
      JSON.parse(d).objects.map(o=>o.package.name).filter(n=>n.startsWith('@tiptap')).sort().join('\n')))"

# Extensions communautaires les plus installées
curl -s "https://registry.npmjs.org/-/v1/search?text=tiptap%20extension&size=100" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(
      JSON.parse(d).objects.filter(o=>!o.package.name.startsWith('@tiptap'))
        .sort((a,b)=>(b.downloads?.weekly||0)-(a.downloads?.weekly||0))
        .slice(0,20).map(o=>o.package.name).join('\n')))"
```

Pages de référence, consultées le 28/10/2026 :

- TipTap, *Extensions overview* — <https://tiptap.dev/docs/editor/extensions/overview>
- TipTap, *StarterKit* — <https://tiptap.dev/docs/editor/extensions/functionality/starterkit>
- TipTap, *TextStyleKit* — <https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit>
- TipTap, *What’s new in v3* — <https://tiptap.dev/docs/resources/whats-new>
- Obsidian, *Mobile app* (barre configurable) — <https://obsidian.md/help/mobile>
- Obsidian Stats, étiquettes `#toolbar` et `#formatting` — <https://www.obsidianstats.com/tags/toolbar>
- Editing Toolbar, journal de versions — <https://github.com/PKM-er/obsidian-editing-toolbar>
- cMenu — <https://community.obsidian.md/plugins/cmenu-plugin>
- Bear, *How to use Markdown* — <https://bear.app/faq/how-to-use-markdown-in-bear/>
- Apple, *Create and format notes on iPhone* — <https://support.apple.com/guide/iphone/create-and-format-notes-iph1ac0b3a2/ios>
