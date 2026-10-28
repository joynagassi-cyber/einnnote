# Apprendre — le socle, puis les outils

> Où l'on apprend l'app en même temps qu'on apprend à prendre des notes.
> Dernière mise à jour : 28 octobre 2026.

## 1. Le problème que cette page répare

L'app enseignait six méthodes (outline, Cornell, carte mentale, fiche, révision,
effort) et ne répondait jamais à la question qui vient **avant** toutes les
autres : *où va ce que j'écris ?* Un projet, des coffres, des notes — la
hiérarchie existait dans le code, pas dans le parcours. Résultat : on apprenait
Cornell, puis on cherchait un endroit pour ranger la note.

Décision : **Espaces est le centre**, et c'est Apprendre qui l'enseigne.

```
Projet « Thèse »
├── Notes du projet ................. ce qui ne demande pas de coffre
└── Coffres
    ├── « Économie » ................ 8 fiches, qui se citent entre elles
    └── « Travail »   ................ 5 fiches
```

Un projet contient des **notes** et **plusieurs coffres** ; un coffre contient
des **fiches** — des notes d'une seule idée, numérotées et reliées. Les deux
niveaux sont montrés ensemble dans le schéma de la page, parce que l'erreur de
rangement vient toujours de là : croire qu'un coffre est un dossier
d'écriture, ou qu'une note est déjà une fiche.

## 2. Trois pistes, dans cet ordre

L'ordre d'affichage est celui de `TRACKS` (`src/lib/learn.ts`), **pas** celui des
numéros de piste — c'est une décision de parcours, tenue par des tests.

| Ordre | Piste | Contenu | Rôle |
|---|---|---|---|
| 1 | `track: 3` — Le socle | 5 leçons : la hiérarchie, créer un projet, ouvrir un coffre, écrire la première note, retrouver ce qu'on a écrit | *où* vit ce qu'on écrit |
| 2 | `track: 1` — Tutoriels par outil | 6 leçons (outline, Cornell, carte mentale, fiche, réviser, effort) | *comment* écrire |
| 3 | `track: 2` — Cours « Lire pour retenir » | 9 leçons de lecture (Adler, article, documentation, cours, sources) | *quoi* lire et retenir |

`nextLesson()` suit cet ordre, s'arrête à la première leçon non terminée et ne
saute jamais à l'intérieur d'une piste.

## 3. Le geste, pas le conseil

Une pratique qui n'ouvre rien est un conseil. Chaque étape peut donc porter un
**bouton qui mène à la page où faire le geste** :

```ts
practice?: { title; text; noteId?; href?; hrefLabel? }
```

Les `href` du socle mènent à `/spaces`, `/projects?new=1`, `/vaults?new=1`,
`/new`, `/review`. Un test vérifie qu'aucun `href` ne pointe vers une page
inexistante et que chaque bouton a un libellé.

Réciproquement, la page **Espaces** renvoie vers la leçon du socle
(« Apprendre en 3 minutes : un projet, des coffres, des notes » → `/learn/x-1`) :
le schéma d'Espaces est un aide-mémoire, la leçon est le cours.

## 4. Premier lancement

Quand aucune leçon n'a été commencée, le bloc du haut passe en « Commencez
ici » et son bouton mène directement à la leçon 1 du socle. Le schéma, lui,
est calculé sur **les données réelles** (projet qui porte le plus de coffres,
nombres de notes et de fiches) : il reste vrai après le deuxième coffre, ce
qu'un exemple figé ne ferait pas.

## 5. Vérification

| Contrôle | Résultat |
|---|---|
| `src/lib/learn.test.ts` | 8 tests : ordre des pistes, unicité des identifiants et des rangs, `href` réels, progression, saut de piste terminée |
| `src/test/learn.test.tsx` | 5 tests d'écran : schéma en tête avant les tutoriels, données réelles, CTA → `/learn/x-1`, `/spaces` → leçon, six tutoriels et neuf leçons de cours intacts |
| Suite complète | 410 tests / 36 fichiers |
| `tsc` / `eslint` | propres |

**Non vérifié :** rendu visuel du schéma sur un écran de 320 px (aucune capture
possible ici) — la structure est en colonne unique et les textes sont tronqués,
mais le confort réel demande un appareil.
