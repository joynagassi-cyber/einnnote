# Le pupitre et la fiche — barre d’outils mobile et menu de document

> **Périmé sur un point (29 octobre 2026).** Le pupitre à quatre gestes et le
> rangement par appui long ont été **retirés** : la note n’a plus qu’une seule
> barre, avec tous les gestes, qui défile sur téléphone. Voir
> [`docs/EDITOR-LAYOUT.md`](EDITOR-LAYOUT.md). Ce document reste la référence
> pour la **fiche** (menu du document) et pour la carte des 96 commandes.

> **Statut : spécification livrée.** Les cinq lots sont codés, testés et
> poussés (§14). Ce document reste le contrat : ce qui est écrit ici est ce
> qui tourne, et les deux écarts assumés sont listés au §14.3.
> Ce document est la réponse à la demande « mapper tout ça avec un document
> Markdown et décrire comment ça fonctionnera **avant** de coder ».
> Il se lit comme un contrat : ce qui est écrit ici est ce qui sera construit,
> et ce qui est refusé est refusé avec sa raison.

Date : 28 octobre 2026 · Périmètre : éditeur de note (mobile + bureau), réglages,
palette de commandes, menu de note.

---

## 0. La décision, en dix lignes

1. Les captures décrivent **quatre écrans d’Obsidian** et **96 entrées** de
   commandes. Toutes sont cartographiées au §8, une par une.
2. On **ne copie pas** Obsidian : sa liste est plate, identique sur téléphone et
   sur ordinateur, et ne dit jamais *quand* une commande s’applique.
3. Sur **téléphone**, la barre devient **le Pupitre** : **quatre gestes** choisis
   par vous, plus un bouton « Tout ». Le pupitre se range **sur place**, par
   appui long, comme le rail — pas dans un écran de réglages à trois niveaux.
4. Sur **bureau**, il n’y a **aucune barre permanente** : la sélection ouvre une
   barre flottante, le reste passe par la **palette** (`Ctrl/⌘ K`). C’est la
   différence de fond avec Obsidian, qui affiche la même interface partout.
5. Le **menu du document** (les captures 8 à 10) devient une **fiche** : feuille
   sur téléphone, panneau latéral sur bureau.
6. Une **seule liste de commandes** alimente le pupitre, la palette, la fiche et
   les raccourcis clavier. Zéro duplication, zéro dérive.
7. Une commande qui ne s’applique pas est **grisée avec sa raison**, jamais
   cachée en silence.
8. Ce qui n’existe pas dans le modèle (tableaux, mathématiques, pièces jointes,
   mode source) est **différé ou refusé** — jamais simulé.
9. La page **Réglages → Navigation disparaît du bureau** (le rail se réordonne
   en le tirant). Elle reste sur téléphone, où cinq places pour sept pages
   créent un vrai arbitrage.
10. Livraison en **cinq lots**, chacun testable seul (§12).

---

## 1. Ce que les captures montrent exactement

| Capture | Écran | Ce qu’on y voit |
|---|---|---|
| 1–2 | **Configurer la barre d’outils mobile** | liste de toutes les commandes, chacune avec `×` (retirer) et `≡` (réordonner) ; bascule coché/non coché en bas |
| 3 | suite de la liste | « Ajouter une commande… », puis **« Plus d’options de barre d’outils »** |
| 4 | **Plus d’options** | repli des titres, en-têtes 1 à 6, surlignages nommés |
| 5–7 | **Catalogue complet** | déplacements de curseur, 16 commandes de tableau, extraction, palette, signets, « Bases » |
| 8–10 | **Menu du document** | Fermer, rétro-liens, mode lecture, mode source, épingler, renommer, déplacer, marquer, fusionner, propriétés, chercher, remplacer, copier le chemin, historique, vue liée, partager, supprimer, « New drawing » |

**96 entrées relevées**, dont 3 partiellement visibles (coupées par le bord de
l’écran) : le surlignage en cours de la capture 4, la dernière ligne de la
capture 5, et la fin de la liste des commandes de tableau.

Trois observations qui commandent la suite :

- **Aucun regroupement.** « Annuler » côtoie « Insérer une base » : 96 lignes
  dans un seul ordre alphabétique implicite, sans dire à quel moment elles
  servent.
- **La même liste partout.** La configuration est un écran de réglages, alors
  que l’usage est dans le texte. On quitte sa note pour régler les boutons de sa
  note.
- **Le menu du document mélange quatre sujets** : la lecture (mode), le fichier
  (renommer, déplacer, supprimer), le partage (copier le chemin) et l’historique.
  Dix-huit lignes, un seul écran, aucune hiérarchie visuelle.

---

## 2. Pourquoi Einnote ne copie pas Obsidian

| # | Obsidian | Einnote |
|---|---|---|
| 1 | Une barre identique sur mobile et sur bureau | Deux surfaces différentes : pupitre sur téléphone, palette + sélection flottante sur bureau |
| 2 | 96 commandes dans une liste plate | Un registre **groupé par moment** (texte, sélection, liste, note) |
| 3 | Six boutons, réglés dans les réglages | Quatre boutons, rangés **dans la note**, par appui long |
| 4 | Une commande indisponible est absente ou sans effet | Grisée, avec la raison écrite (« sélectionnez du texte d’abord ») |
| 5 | Marque visuelle violette, icônes neutres | Trois couleurs du produit, aucune icône décorative, cibles de 44 px |
| 6 | Menu fichier plein écran, 18 lignes | Fiche en sections, avec les actions destructrices isolées en bas |
| 7 | Le mode source est un état de lecture | Pas de source : le document est structuré, il n’y a rien à révéler |
| 8 | La configuration vit hors du contenu | La configuration vit **là où on écrit**, et s’efface au premier geste |

---

## 3. Les trois surfaces

```
┌─ TÉLÉPHONE (≤ 767 px) ─────────────┐   ┌─ BUREAU (≥ 768 px) ────────────────┐
│                                    │   │                                    │
│  ┌──────────────┐  ← sélection     │   │   texte…                           │
│  │ Gras  Ital  …│     flottante    │   │   ┌─────────────┐  ← sélection     │
│  └──────────────┘                  │   │   │ Gras Ital … │     flottante    │
│                                    │   │   └─────────────┘                  │
│  ┌────────────────────────────────┐│   │                                    │
│  │ A− A+  Interligne   Papier     ││   │  (aucune barre permanente)         │
│  ├────────────────────────────────┤│   │                                    │
│  │  B   I   ≔   ☑        Tout ⋯  ││   │   ⌘K  palette, en bas au centre    │
│  └────────────────────────────────┘│   │                                    │
└────────────────────────────────────┘   └────────────────────────────────────┘
```

- **Pupitre** (téléphone) : quatre gestes + « Tout », au-dessus du clavier,
  sous la ligne de personnalisation (taille, interligne, largeur, papier) qui
  existe déjà.
- **Palette** (bureau et téléphone) : ouverte par « Tout » sur téléphone, par
  `Ctrl/⌘ K` et par `/` dans le texte au bureau.
- **Fiche** : feuille du bas sur téléphone, panneau latéral sur bureau.

### Vocabulaire des moments

Un **moment** est ce que le curseur traverse. Une commande appartient à un seul
moment, ce qui permet de ne proposer que ce qui s’applique.

| Moment | Déclenché quand | Exemples |
|---|---|---|
| `texte` | curseur dans un paragraphe, sans sélection | Titres, listes, citation, insérer la date |
| `selection` | du texte est sélectionné | Gras, italique, surlignage, lien, extraire |
| `liste` | bloc en mode puces / numéroté / case | Indenter, désindenter, cocher, transformer |
| `note` | toujours (actions de document) | Chercher, remplacer, fiche, lecture |

Le moment `tableau` est **réservé** dans le type et n’est pas alimenté : aucun
nœud de tableau n’existe dans le modèle (§9).

---

## 4. Le registre de commandes — une seule source

Fichier prévu : `src/lib/commands/registry.ts`.

```ts
export type Moment = "texte" | "selection" | "liste" | "tableau" | "note";

export interface Command {
  id: CommandId;                       // identifiant stable, jamais traduit
  label: string;                       // « Mettre en gras »
  hint: string;                        // « Ctrl+B » ou « sélectionnez du texte »
  group: string;                       // « Mise en forme », « Listes », « Document »
  moment: Moment;
  icon: ComponentType<IconProps>;
  run: (ctx: CommandContext) => void;
  /** faux = bouton grisé, jamais bouton absent */
  available?: (snap: EditorSnapshot) => boolean;
  /** affiché sous le libellé quand available() est faux */
  unavailable?: string;
}
```

`CommandContext` = `{ editor, snapshot, note, navigate, toast, openFiche }`.
Aucune commande ne touche au store : elles appellent les fonctions existantes de
`src/lib/editor/extensions.ts` et `transform.ts`, déjà testées.

**Consommateurs du registre** (aucun ne redéfinit une commande) :

| Surface | Ce qu’elle lit |
|---|---|
| Pupitre | les identifiants enregistrés dans les quatre places |
| Palette | tout le registre, filtré par moment puis par texte |
| Barre de sélection | les commandes de moment `selection` |
| Fiche | les commandes de moment `note` |
| Raccourcis clavier | `shortcut` déclaré une fois, appliqué par un seul écouteur |

Règle dure : **une commande absente du registre ne peut apparaître nulle part.**

---

## 5. Le Pupitre mobile

### 5.1 Anatomie

- **4 places** + **« Tout »** fixe. Cinq cibles de 44 × 44 px sur 390 px de
  large : c’est la largeur du pouce, pas un hasard.
- Chaque place = icône + `aria-label` complet. L’état actif (gras actif, case
  cochée) se lit au remplissage de l’icône, pas à la couleur seule.
- Ordre = ordre choisi. **La poignée de rangement est le dernier élément de la
  ligne**, six points, exactement comme le rail.
- Un appui long (500 ms) sur n’importe quelle place entre en **mode Ranger**.

### 5.2 Mode Ranger (la configuration, sans quitter la note)

```
┌────────────────────────────────────────────┐
│  Ranger le pupitre                 Terminé │
│  Quatre gestes, pas plus : au-delà, le     │
│  pouce ne suit plus.                       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ ⬛ Gras                    ×      ⋮⋮ │  │
│  │ ⬛ Surligner               ×      ⋮⋮ │  │
│  │ ⬛ Liste à puces           ×      ⋮⋮ │  │
│  │ ⬛ Case à cocher           ×      ⋮⋮ │  │
│  └──────────────────────────────────────┘  │
│  ＋ Ajouter un geste                       │
│  Réinitialiser                             │
└────────────────────────────────────────────┘
```

- **`×` retire**, la place se referme ; jamais de trou.
- **`⋮⋮` déplace** : glisser, ou `↑`/`↓` au clavier. Le dépôt se fait en
  relâchant n’importe où dans la liste.
- **« Ajouter un geste »** ouvre la palette **en mode choix** : seules les
  commandes des moments `texte`, `selection` et `liste` sont proposées (une
  commande de document n’a rien à faire sous le pouce).
- **« Réinitialiser »** remet les quatre gestes par défaut.
- Quitter le mode Ranger (bouton « Terminé », `Échap`, ou un appui dans le
  texte) **efface la configuration de l’écran** et rend la note.

### 5.3 États

| État | Ce qu’on voit |
|---|---|
| Normal | 4 gestes + « Tout » |
| Commande indisponible | bouton **grisé**, `aria-disabled`, raison dans `title` et dans la palette |
| Mode Ranger | chaque place encadrée, poignée visible, compteur « 3 sur 4 » |
| Lecture | le pupitre **et** la ligne de personnalisation disparaissent ; un seul bouton « Quitter la lecture » |
| Clavier fermé | le pupitre reste visible, collé au bas de l’écran |

### 5.4 Ce que le pupitre ne fait jamais

- Il ne change pas de contenu tout seul : **stabilité d’abord**. Une barre qui
  se réorganise sous le doigt est une barre qu’on ne mémorise pas.
- Il n’affiche pas de libellé texte : quatre icônes nommées par `aria-label`,
  et la palette pour les chercher par mot.
- Il n’affiche pas de commande destructive.

---

## 6. La palette — le même catalogue, au clavier

- **Ouverture** : bouton « Tout » (téléphone), `Ctrl/⌘ K` (bureau), `/` dans le
  texte (les deux).
- **Filtre** : parcourt `label`, `hint`, `group` ; insensible aux accents
  (`surlign` trouve « Surligner »).
- **Ordre** : les trois dernières commandes utilisées, puis le moment courant,
  puis le reste, groupé.
- **Clavier** : `↑` `↓` pour parcourir, `Entrée` pour exécuter, `Échap` pour
  fermer, `Tab` reste dans la palette.
- **Indisponible** : la ligne reste visible, grisée, avec `unavailable` affiché
  à droite — on apprend pourquoi, on ne devine pas.
- Elle remplace le menu `/` actuel, qui devient un simple point d’entrée.

---

## 7. La fiche du document

Les captures 8 à 10 montrent **un écran plein** pour dix-huit actions. Einnote
en fait une fiche à sections, dans l’ordre où on s’en sert.

### Téléphone — feuille du bas

```
┌ Cette note ──────────────────────── ✕ ┐
│  Vault (catégorie)      [ Thèse ▾ ]   │
│  Déplacer vers…                       │
│                                       │
│  Lire                                 │
│   ▸ Lecture                            │
│   ▸ Chercher… / Remplacer…             │
│                                       │
│  Sortir                               │
│   ▸ Exporter en Markdown               │
│   ▸ Copier le texte                    │
│   ▸ Copier le lien de la note          │
│                                       │
│  Fichier                              │
│   ▸ Renommer                           │
│   ▸ Marquer le passage                 │
│   ▸ Historique (indisponible : bientôt)│
│                                       │
│  ⚠ Mettre à la corbeille               │  ← rouge, séparé, jamais collé
└───────────────────────────────────────┘
```

### Bureau — panneau latéral droit

Même contenu, en colonne persistante à droite du texte (il reste ouvert pendant
qu’on écrit). Deux différences :

- **Aucun accès par un `⋮` plein écran** : le panneau s’ouvre par un bouton de
  la barre de titre ou par `Ctrl/⌘ .`.
- Les actions destructrices demandent une **confirmation en deux temps** dans le
  panneau, pas une feuille par-dessus la feuille.

---

## 8. Cartographie exhaustive des 96 entrées

Décisions : **Gardée** (reprise telle quelle), **Adaptée** (même intention,
forme propre à Einnote), **Différée** (juste, mais demande un chantier),
**Refusée** (contraire au modèle ou à la promesse, avec sa raison).

### A. Barre d’outils mobile — catalogue « Gérer les options » (1–35)

| # | Commande Obsidian | Décision | Dans Einnote |
|---|---|---|---|
| 1 | Annuler | Gardée | pupitre · `undo` |
| 2 | Rétablir | Gardée | pupitre · `redo` |
| 3 | Ajouter un lien interne | Adaptée | « Lier une note » (sélecteur projet → vault → note), lot 4 |
| 4 | Intégrer un aperçu | Refusée | pas de transclusion : une note n’est pas un fichier inclus |
| 5 | Ajouter un mot-clé | Adaptée | « Ranger dans un vault » — le vault **est** la catégorie |
| 6 | Insérer une pièce jointe | Différée | pas de stockage de fichiers dans le modèle |
| 7 | Basculer l’entête | Gardée | « Transformer le bloc » (Texte, Titre 1–3, Citation, Filet) |
| 8 | Mettre en gras | Gardée | `bold` |
| 9 | Mettre en italique | Gardée | `italic` |
| 10 | Mettre en barré | Gardée | `strike` |
| 11 | Mettre en surbrillance | Gardée | `highlight` (5 couleurs) |
| 12 | Basculer en code | Gardée | `code` (en ligne) |
| 13 | Basculer en bloc de citation | Gardée | Citation (le seul bloc « mis en avant ») |
| 14 | Insérer un lien | Gardée | `link` (URL) |
| 15 | Basculer en liste à puces | Gardée | `bullet` |
| 16 | Basculer en liste numérotée | Gardée | `ordered` |
| 17 | Basculer l’état de la checklist | Gardée | `toggleChecked` |
| 18 | Indenter l’item de liste | Gardée | `indent+` (attribut de bloc, pas de nœud imbriqué) |
| 19 | Désindenter l’item | Gardée | `indent−` |
| 20 | Configurer la barre d’outils mobile | Adaptée | **mode Ranger sur place** (appui long), pas un écran de réglages |
| 21 | Mettre en commentaire | Refusée | aucun modèle de commentaire ; les questions Cornell jouent un autre rôle |
| 22 | Ligne mathématique | Refusée | pas de KaTeX, hors périmètre assumé |
| 23 | Afficher le formatage | Refusée | rien à révéler : le document est structuré, pas du texte balisé |
| 24 | Basculer puces ↔ cases | Adaptée | « Transformer en case à cocher » |
| 25 | Couper | Refusée | geste système, déjà fourni par le clavier |
| 26 | Coller | Refusée | idem |
| 27 | Copier | Refusée | idem (la fiche propose « Copier le texte ») |
| 28 | Insérer un tableau | Différée | demande l’extension Table **et** un type de bloc |
| 29 | Bloc mathématique | Refusée | même raison que 22 |
| 30 | Mise en avant (callout) | Refusée | trois couleurs, pas de blocs colorés décoratifs |
| 31 | Insérer un bloc de code | Différée | `codeBlock` est désactivé aujourd’hui : l’activer crée un type de bloc |
| 32 | Modèles : date actuelle | Gardée | « Insérer la date » (`todayLabel`) |
| 33 | Modèles : heure actuelle | Gardée | « Insérer l’heure » |
| 34 | Note de bas de page | Refusée | pas de nœud, pas d’export possible en Markdown fidèle |
| 35 | ＋ Ajouter une commande… | Adaptée | « Ajouter un geste » dans le mode Ranger |

### B. « Plus d’options de barre d’outils » (36–50)

| # | Commande Obsidian | Décision | Dans Einnote |
|---|---|---|---|
| 36 | Renommer cet entête (de barre) | Refusée | les libellés appartiennent au produit ; un renommage rend l’aide impossible |
| 37 | Plier/Déplier sur la ligne | Différée | demande un modèle de sections repliables |
| 38 | Plier tous les titres | Différée | idem |
| 39 | Déplier tous les titres | Différée | idem |
| 40 | Plier moins | Différée | idem |
| 41 | Plier plus | Différée | idem |
| 42 | Supprimer l’entête | Gardée | « Supprimer le bloc » (pas d’enfants : pas de hiérarchie) |
| 43 | Définir comme entête 1 | Gardée | Titre 1 |
| 44 | Définir comme entête 2 | Gardée | Titre 2 |
| 45 | Définir comme entête 3 | Gardée | Titre 3 |
| 46 | Entête 4 | Différée | le modèle ne porte que 1 à 3 |
| 47 | Entête 5 | Différée | idem |
| 48 | Entête 6 | Différée | idem |
| 49 | Surlignage rouge (bascule) | Gardée | une des 5 couleurs |
| 50 | Autre surlignage (coupé) | Gardée | les autres couleurs |

### C. Catalogue complet, suite (51–78)

| # | Commande Obsidian | Décision | Dans Einnote |
|---|---|---|---|
| 51 | Aller à la première ligne | Gardée | « Aller au début » |
| 52 | Aller à la dernière ligne | Gardée | « Aller à la fin » |
| 53 | Basculer le clavier | Refusée | un site ne ferme pas le clavier système |
| 54 | Supprimer le paragraphe | Gardée | « Supprimer le bloc » |
| 55 | Ajouter un curseur au-dessous | Différée | le modèle suppose un curseur ; multi-curseur = autre éditeur |
| 56 | Ajouter un curseur au-dessus | Différée | idem |
| 57 | Tableau : ligne avant | Différée | lot « tableaux », non ouvert |
| 58 | Tableau : ligne après | Différée | idem |
| 59 | Tableau : déplacer la ligne haut | Différée | idem |
| 60 | Tableau : déplacer la ligne bas | Différée | idem |
| 61 | Tableau : dupliquer la ligne | Différée | idem |
| 62 | Tableau : supprimer la ligne | Différée | idem |
| 63 | Tableau : colonne avant | Différée | idem |
| 64 | Tableau : colonne après | Différée | idem |
| 65 | Tableau : déplacer la colonne gauche | Différée | idem |
| 66 | Tableau : déplacer la colonne droite | Différée | idem |
| 67 | Tableau : dupliquer la colonne | Différée | idem |
| 68 | Tableau : supprimer la colonne | Différée | idem |
| 69 | Tableau : aligner à gauche | Différée | idem |
| 70 | Tableau : aligner au centre | Différée | idem |
| 71 | Tableau : aligner à droite | Différée | idem |
| 72 | Menu contextuel sous le curseur | Refusée | menu système d’Obsidian ; la palette le remplace |
| 73 | Extraire la sélection dans une note | Différée | demanderait une création de note depuis le texte |
| 74 | Extraire cet entête | Différée | idem, et sans hiérarchie de sections |
| 75 | Palette de commandes | Gardée | `Ctrl/⌘ K`, bouton « Tout », `/` |
| 76 | Signets : marquer le bloc | Adaptée | « Marquer le passage » (`marked`, déjà stocké) |
| 77 | Signets : marquer l’entête | Adaptée | même attribut sur un titre |
| 78 | Bases : insérer une base | Refusée | produit différent (bases de données) ; hors périmètre |

### D. Menu du document (79–96)

| # | Commande Obsidian | Décision | Dans Einnote |
|---|---|---|---|
| 79 | Fermer | Gardée | retour à la bibliothèque |
| 80 | Rétro-liens dans le document | Gardée | section « Liens » de la fiche : qui cite la note, avec le passage |
| 81 | Mode lecture | Gardée | « Lecture » : masque pupitre et compositeur |
| 82 | Mode source | Refusée | il n’y a pas de source : blocs structurés, pas de balisage |
| 83 | Épingler | Différée | pas d’épingle dans le modèle ; « à revoir d’abord » couvre le besoin |
| 84 | Renommer | Gardée | le champ titre, en haut de la note |
| 85 | Déplacer le fichier vers… | Gardée | « Déplacer vers un projet / vault » |
| 86 | Marquer… | Adaptée | « Marquer le passage » |
| 87 | Fusionner tout le fichier avec… | Refusée | opération destructrice sans équivalent ; l’export/import couvre |
| 88 | Ajouter des propriétés de fichier | Refusée | les champs sont fixes ; pas de YAML libre |
| 89 | Chercher… | Gardée | « Chercher dans la note » (existe) |
| 90 | Remplacer… | Gardée | « Remplacer » (existe) |
| 91 | Copier le chemin | Adaptée | « Copier le lien de la note » |
| 92 | Ouvrir l’historique de version | Différée | aucune version locale ; viendra avec le cloud |
| 93 | Ouvrir la vue liée | Refusée | métaphore de panneaux propre à Obsidian |
| 94 | Partager | Adaptée | « Exporter en Markdown » + « Copier le texte » |
| 95 | Supprimer le fichier | Gardée | Corbeille (restaurable) |
| 96 | New drawing | Refusée | pas de dessin dans le produit |

### Bilan

| Décision | Nombre |
|---|---|
| Gardées | 35 |
| Adaptées | 10 |
| Différées | 32 |
| Refusées | 19 |
| **Total** | **96** |

Les **32 différées** ne représentent que **neuf chantiers**, et trois d’entre eux
en couvrent les trois quarts :

| Chantier | Entrées |
|---|---|
| Tableaux | 16 (28, 57–71) |
| Repli des sections | 5 (37–41) |
| Niveaux de titre 4 à 6 | 3 (46–48) |
| Extraction vers une note | 2 (73, 74) |
| Multi-curseur | 2 (55, 56) |
| Pièce jointe | 1 (6) |
| Bloc de code | 1 (31) |
| Épingle | 1 (83) |
| Historique de version | 1 (92) |

Les **19 refusées** le sont pour trois raisons seulement : le modèle ne porte pas
l’objet (commentaire, note de bas de page, mathématiques, dessin), la surface ne
le permet pas (clavier système, menu système, mode source), ou la promesse du
produit l’exclut (callout coloré, propriétés libres, fusion de fichiers).

---

## 9. Ce qui est refusé, et pourquoi c’est une force

Un refus n’est pas un manque, c’est une promesse tenue :

- **Pas de mode source.** Le document est une suite de blocs typés (`Block[]`).
  Il n’y a pas de fichier texte à révéler ; inventer un éditeur de source
  reviendrait à maintenir deux formats.
- **Pas de callout, pas de bloc coloré.** Trois couleurs et une teinte
  d’accent : un bloc coloré par émotion est une décoration, pas une structure.
- **Pas de commentaire, pas de note de bas de page.** Le modèle ne les porte
  pas, et une note qui ment sur ce qu’elle contient est pire qu’une note
  limitée.
- **Pas de propriétés libres.** Un YAML ouvert, c’est une base de données
  déguisée : chaque champ ajouté casse les filtres et l’export.

---

## 10. Persistance et versionnement

- Clé : `engram.pupitre.v1` → `{ version: 1, slots: CommandId[] }`, **4 entrées
  au plus**, sans doublon.
- Lecture : les identifiants inconnus (commande retirée d’une version future)
  sont **ignorés**, pas remplacés ; la place se referme.
- Si moins de 4 entrées : **on ne réinjecte rien.** Un pupitre de trois gestes
  reste un pupitre de trois gestes — la place rendue reste rendue. Seule une
  liste **vide ou illisible** rend les quatre gestes par défaut, parce qu’un
  pupitre sans gestes est un écran mort.
- Écriture : à chaque `×`, `⋮⋮`, « Ajouter », « Réinitialiser » — pas de bouton
  « Enregistrer ».
- Synchronisation cloud : hors périmètre du premier lot (le schéma `engram`
  peut l’accueillir plus tard comme collection `settings`).

---

## 11. Accessibilité, style, raccourcis

**Style** (contraintes du produit, non négociables)

- Trois couleurs : `--primary`, `--ring`, `--accent` (+ `--tint`). Aucune autre
  teinte, aucun dégradé, aucune ombre portée décorative.
- Fond des surfaces : `bg-card/40 backdrop-blur-2xl` avec voile à 22 %.
- Cible tactile **≥ 44 px**, écart ≥ 8 px entre deux cibles.
- 18 thèmes : le pupitre et la fiche n’utilisent que des variables de thème,
  donc suivent l’accent choisi.
- Aucune icône décorative : chaque icône est une action nommée.

**Accessibilité**

- `role="toolbar"` + `aria-label="Gestes d’écriture"` sur le pupitre.
- Chaque commande : `aria-label` complet, `aria-pressed` pour les bascules,
  `aria-disabled` + `title` (raison) pour les indisponibles.
- Le mode Ranger se pilote **entièrement au clavier** : `Tab`, `↑` `↓`, `×`,
  `Échap`.
- Contrastes vérifiés par calcul (≥ 4,5:1) pour le libellé et l’icône active.
- Aucune information portée par la seule couleur.

**Raccourcis** (une table, un écouteur)

| Geste | Téléphone | Bureau |
|---|---|---|
| Tout / palette | bouton « Tout » | `Ctrl/⌘ K` |
| Menu d’insertion | `/` | `/` |
| Ranger le pupitre | appui long | — (pas de pupitre) |
| Fiche | `⋮` | `Ctrl/⌘ .` |
| Lecture | dans la fiche | `Ctrl/⌘ Maj+ L` |

---

## 12. Découpage en lots (chacun livrable et testé seul)

| Lot | Contenu | Fichiers | Tests |
|---|---|---|---|
| **1** | Registre de commandes + palette (remplace le menu `/`) | `src/lib/commands/*`, `components/commands/Palette.tsx` | registre : identifiants uniques, moments, `available` ; palette : filtre accentué, clavier, indisponibles |
| **2** | Pupitre mobile + mode Ranger + persistance | `components/commands/Pupitre.tsx`, `lib/commands/pupitre.ts` | rendu de 4 places, plafond, retrait, glisser, clavier, `engram.pupitre.v1` |
| **3** | Fiche document (feuille mobile, panneau bureau) | `components/note/Fiche.tsx` | sections, actions destructrices séparées, `Lecture`, focus piégé puis rendu |
| **4** | Liens de notes (lot 2 de la carte §8) | `lib/links/*` | création, aller-retour, suppression |
| **5** | Nettoyage : ancien menu `/` supprimé, doc Apprendre mise à jour | `docs/`, `src/data/lessons/` | non-régression complète |

**État au 28 octobre 2026** :

| Lot | État | Preuve |
|---|---|---|
| **1** Registre + palette | **livré** | `registry.ts` (~55 commandes, 6 groupes), `recent.ts` (5 max), `Palette.tsx` ; `registry.test.ts` 13/13, `commands.test.tsx` 4/4 |
| **2** Pupitre + Ranger | **livré** | `Pupitre.tsx`, `pupitre.ts` ; `pupitre.test.ts` 10/10, `commands.test.tsx` 6/6 (appui long, clavier, persistance après rechargement) |
| **3** Fiche + lecture | **livré** | `note/Fiche.tsx`, `note/FicheWindow.tsx` (panneau bureau), `reading` dans `NoteEditor` ; `fiche.test.tsx` 7/7 |
| **4** Liens de notes | à faire | — |
| **5** Nettoyage | **partiel** — doc Apprendre à jour (`t-ecrire`), ancien menu `/` encore en place | `lessons.test.ts` 5/5 |

Deux écarts assumés par rapport au tableau ci-dessus :

- **La fiche du bureau est un panneau latéral sans voile**, pas une fenêtre
  modale : le texte doit rester lisible et cliquable pendant qu’on règle la
  note. Conséquence : pas de focus piégé (il n’y a rien à piéger), `Échap`
  referme.
- **La lecture n’existait pas dans le lot 3** ; elle y entre parce que la fiche
  est le seul endroit d’où on l’ouvre, et qu’une action sans effet visible se
  serait fait passer pour un bouton mort.

**Critères d’acceptation communs** : aucun libellé hors français, aucun
`console.log`, `tsc` 0 erreur, `eslint` 0 erreur, suite complète verte, et
chaque nouveau composant présent dans au moins un test de rendu.

---

## 13. Les trois questions — tranchées

| Question | Décision | Effet dans le code |
|---|---|---|
| Quatre gestes ou cinq ? | **Quatre**, plus « Tout ». À cinq, les cibles tombent sous 36 px sur un écran de 360 px. | `PUPITRE_MAX = 4` (`lib/commands/pupitre.ts`) |
| La fiche bureau remplace-t-elle le `⋮` ? | **Oui.** Un seul endroit pour les actions de note. | Le `⋮` n’existe plus qu’en dessous de 1024 px ; au bureau, bouton « Fiche » + `Ctrl/⌘ .` |
| Les gestes suivent-ils la note ou l’appareil ? | **L’appareil**, comme `settings.rail`. Un pupitre réglé au téléphone n’a aucune raison de réorganiser un bureau. | une seule clé `engram.pupitre.v1`, lue au téléphone seulement |

## 14. État de livraison

### 14.1 Les cinq lots

| Lot | État | Fichiers | Tests |
|---|---|---|---|
| 1 · Registre + palette | **livré** | `lib/commands/registry.ts` (~55 commandes, 6 familles), `lib/commands/recent.ts`, `components/commands/Palette.tsx` | `lib/commands/registry.test.ts` (13), `test/commands.test.tsx` |
| 2 · Pupitre + Ranger | **livré** | `components/commands/Pupitre.tsx`, `lib/commands/pupitre.ts` | `lib/commands/pupitre.test.ts` (10) |
| 3 · Fiche | **livré** | `components/note/Fiche.tsx`, `components/note/FicheWindow.tsx` | `test/fiche.test.tsx` (8) |
| 4 · Liens de notes | **livré** | `lib/links/notes.ts`, `lib/editor/note-links.ts`, `components/note/NotePicker.tsx` | `lib/links/notes.test.ts` (6), `test/links.test.tsx` (5) |
| 5 · Nettoyage | **livré** | menu `/` supprimé de `NoteEditor.tsx` (−120 lignes), `/` ouvre la palette en mode `insert` | `test/smoke.test.tsx` (le test du `/` passe par la palette) |

Bilan : **666 tests / 63 fichiers**, `tsc` 0 erreur, `eslint` 0 erreur,
`vite build` vert, `impeccable detect src/` **0 anti-patron**.

### 14.2 Ce que le code ajoute au document

- **Les liens de notes ne sont pas stockés.** `[[Titre]]` reste du texte ; une
  décoration TipTap le rend cliquable. Conséquences : rien à synchroniser, rien
  à migrer, export Markdown fidèle, et un lien mort reste **visible** (pointillé
  + « Lien mort vers … » pour le lecteur d’écran) au lieu de disparaître.
- **Rétro-liens calculés**, pas indexés : la fiche recompte qui cite la note à
  chaque rendu. À l’échelle d’un carnet, c’est instantané, et aucune table ne
  peut se désynchroniser du texte.
- **Accès clavier aux liens** : une décoration n’est pas focusable, donc
  « Ouvrir le lien sous le curseur » est une commande de palette. Sans elle, un
  lien de note aurait été un geste de souris — inacceptable.

### 14.3 Deux écarts assumés

1. **Le bureau garde sa barre de mise en forme.** Le §3 annonçait « aucune barre
   permanente ». La construire ainsi aurait retiré vingt gestes visibles d’un
   écran qui n’a pas été vérifié visuellement, dans le même lot que trois
   surfaces neuves. La palette reste le chemin rapide (`Ctrl/⌘ K`), le pupitre
   est masqué au-delà de 768 px, et la barre ne réapparaît pas en lecture. Si la
   suppression est souhaitée, c’est un lot à part, avec une capture avant/après.
2. **Le pupitre ne se reremplit pas tout seul.** Le §10 disait « on complète à
   quatre ». À l’usage, retirer un geste et voir un autre arriver à sa place est
   une négation du geste. Corrigé dans le document **et** dans le code.

