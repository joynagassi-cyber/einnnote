# Les étiquettes : `#un-mot`, et une base qui s’en souvient

**Décision du 29 octobre 2026.** On écrit `#méthode` dans une note ; dès le `#`,
la liste des étiquettes **déjà employées** s’ouvre sous le curseur.

Ce document dit où vit une étiquette, ce que la base stocke (et ce qu’elle ne
stocke pas), et pourquoi le texte reste la seule vérité.

---

## 0. Conclusion en huit lignes

1. **Une étiquette est du texte.** `#méthode` est écrit dans le bloc, pas dans
   une table. Conséquence : l’export Markdown l’emporte, une sauvegarde
   restaurée la retrouve, et changer d’éditeur ne la perd pas.
2. **Une base garde le vocabulaire.** `tags` dans `useContentStore` retient les
   noms rencontrés — c’est ce qui permet de proposer une liste **même dans une
   note vide**.
3. **La base n’est jamais la vérité.** Qui porte quelle étiquette se lit dans le
   texte (`lib/editor/tags.ts`), pas dans la base.
4. **Le menu s’ouvre sur `#`**, en début de ligne ou après une espace. `C#` et
   « prix#2 » n’en ouvrent pas.
5. **Choisir écrit `#nom` puis une espace**, à la place de ce qui était tapé.
6. **Le clavier suffit** : `↑` `↓` parcourent, `Entrée` ou `Tab` choisissent,
   `Échap` referme sans rien écrire.
7. **La bibliothèque filtre par étiquette** ; deux étiquettes cochées
   **élargissent** la vue (un OU, jamais un ET).
8. **Vérification** : `tsc` 0, `eslint` 0 erreur, `vitest` 766/766,
   `vite build` ✓.

---

## 1. La forme d’une étiquette

| Règle | Exemple accepté | Exemple refusé |
| --- | --- | --- |
| commence en début de ligne ou après une espace / ponctuation | `#idée` · `(voir #annexe)` | `C#`, `prix#2` |
| lettres (accents compris), chiffres, `_`, `-`, `/` | `#à-relire` · `#chapitre/3` | `#deux mots` |
| 48 caractères au plus | | |
| un titre Markdown n’en est pas une | `# Titre` | `## Sous-titre` |

**L’accent compte, la casse non.** `#thèse` et `#these` sont deux étiquettes,
mais `#Thèse` et `#thèse` n’en font qu’une : c’est la première graphie rencontrée
qui s’affiche.

---

## 2. Où vit quoi

```
  le texte de la note          la base (zustand, persistée)
  « Une #idée, puis #méthode »        tags: [{ id, name: "méthode" }, …]
            │                                   │
            └──────── buildTagIndex ────────────┘
                              │
                    ce que le menu propose
                    (#méthode × 4, #idée × 1, …)
```

| Fichier | Rôle |
| --- | --- |
| `src/lib/editor/tags.ts` | lire, valider, classer, renommer — **aucun** import d’éditeur |
| `src/stores/useContentStore.ts` | `tags`, `registerTags`, `renameTag`, `deleteTag`, migration v3 |
| `src/lib/editor/quill/adapt.ts` | l’attribut Parchment `tag` → classe `tag-item` |
| `src/components/editor/NoteEditor.tsx` | décoration, détection du `#`, menu, clavier |
| `src/lib/libraryFilters.ts` | la dimension `tags` du filtre, et ses puces |

La base apprend **en écrivant** : `replaceBlocks` enregistre les noms nouveaux à
chaque sauvegarde de note. Un modèle de note qui contient déjà des étiquettes les
fait entrer dès la création.

---

## 3. La base, et ses trois gestes

| Geste | Comportement | Refus |
| --- | --- | --- |
| `registerTags(names)` | ajoute les noms inconnus, une fois chacun | un nom invalide est ignoré |
| `renameTag(id, nom)` | renomme dans la base **et** réécrit le texte de toutes les notes | nom invalide, ou déjà porté par une autre étiquette |
| `deleteTag(id)` | retire une entrée du vocabulaire | si une note la porte encore, avec le nombre de notes |

Deux choix à assumer :

1. **Le renommage réécrit les notes.** Renommer seulement la base laisserait
   l’ancien nom dans les textes, donc deux vocabulaires pour une idée. La
   réécriture s’arrête net sur les caractères qui prolongeraient le nom
   (`#art` ne touche pas `#artisan`), et ne rentre jamais dans un attribut
   (`href="#ancre"` est intouché).
2. **La suppression est refusée si l’étiquette est portée.** Le contraire
   laisserait un nom dans le texte et plus rien dans la base — l’état exact que
   ce document existe pour éviter.

---

## 4. La migration

| Version | Ce qui apparaît |
| --- | --- |
| v1 | les projets (tout est rattaché au premier projet) |
| v2 | les étiquettes (`tags`), reconstituées depuis le texte des notes |

Une sauvegarde v1 traverse les deux sauts en un seul appel, sans rien perdre. Une
sauvegarde déjà en v3 traverse `migrateContentData` sans être copiée.

---

## 5. Ce que le menu ne fait pas

- Il **n’insère pas** d’étiquette à la place d’une sélection : on tape `#`, on
  choisit, on continue sa phrase.
- Il **ne crée pas** de nœud : le texte reste `#nom`, la pastille est une classe.
- Il **ne s’ouvre pas** dans un mot (`C#`), ni après un espace, ni pour un titre.
- Il **ne propose pas** les étiquettes des notes en corbeille.

---

## 6. Ce qu’il reste à vérifier à la main

1. **La position du menu sur téléphone.** Le calcul vient de `getBounds` ; jsdom
   renvoie des zéros. Seul un écran réel dit si le menu passe sous le clavier
   virtuel quand la ligne est en bas.
2. **Le clic sur une proposition.** `onMouseDown` est bloqué pour garder le
   curseur : à vérifier sur iOS, où la sélection est plus capricieuse.
3. **Le contraste de `tag-item`.** La pastille utilise `--accent-soft` sur
   `--surface` ; le calcul de contraste de l’application le couvre, mais une
   capture réelle reste la preuve.
