# Présentation — six réglages qui agissent, aucun qui décore

> « La personnalisation est mauvaise et ne marche pas. » Les deux reproches
> étaient justes, mais pas pour la même raison. 28 octobre 2026.

## 1. Le bug était dans l'ordre des styles, pas dans l'écran

Les teintes de papier et le contraste des traits étaient peints en CSS :

```css
:root[data-paper="ivory"] { --bg: #FBF8F0; }
```

Or la palette du thème pose les mêmes variables en **style en ligne** sur
`<html>`. Le style en ligne gagne. Les deux réglages ne changeaient donc rien
du tout — un défaut qu'aucune lecture de l'écran ne révèle, puisqu'on voyait
les bons boutons, le bon aperçu, et un document qui ne bougeait pas.

**Correction, une règle :** les jetons de couleur se calculent en JavaScript,
une seule fois, à partir de la palette **et** des réglages ; le CSS ne peint que
ce qu'on lui donne. `src/lib/presentation.ts` est désormais la seule source de
vérité, `applySettingsToDom` l'appelle avant de poser la palette.

Conséquence heureuse : une teinte n'est pas une palette de plus, c'est un
**déplacement de teinte** appliqué à la palette choisie. Sable, ivoire, gris et
brume fonctionnent avec les vingt-trois thèmes, en clair comme en sombre, et
ne touchent jamais `--ink` ni `--accent` — le texte et l'accent restent lisibles.

## 2. Ce que font les applications de ce genre

Relevé sur trois modèles, une seule leçon par modèle :

| Application | Ce qu'elle expose | Ce qu'on en a pris |
|---|---|---|
| **Bear** | Typographie : police du texte, des titres, du code, **taille, interligne, largeur de ligne, espacement des paragraphes**, plus « rétablir les réglages de l'éditeur » | la **Mesure** (interligne + largeur de lecture) et un **rétablir** par écran |
| **Obsidian** | Apparence : thème, couleur d'accent, taille de base, police d'**interface** distincte de la police de **texte** | séparer ce qui règle la coquille de ce qui règle la note |
| **Notion** | fond chaud, canvas de note plus clair que la coquille, texte presque noir, **un seul accent** réservé aux liens et à l'état actif | un accent unique, jamais réutilisé pour décorer |

Trois principes retenus : **un seul accent**, **des valeurs continues exprimées
en variables** (donc surchargeables sans JavaScript), **un rétablir visible**.

## 3. Les six réglages, et ce qu'ils déplacent réellement

Trois sections, dans l'ordre où un choix se prend — la forme d'abord, parce que
c'est ce qui change le plus la lecture ; la mesure ensuite, parce qu'elle décide
du confort.

### Formes

| Réglage | Valeurs | Effet réel |
|---|---|---|
| **Densité** | Compacte · Standard · Aérée | `--pad`, marges des cartes et des écrans |
| **Angles** | Nets · Doux · Très ronds | `--r-card`, `--r-field`, `--r-sheet` |
| **Traits** | Discrets · Normaux · Marqués | contraste de `--line`, calculé depuis `--ink` |
| **Relief** | Plat · Standard · Surélevé | `--shadow-1/2/3` |

### Papier

| Teinte | Pastille | Direction |
|---|---|---|
| Sable | `#F6F1E7` | référence, aucun mélange |
| Ivoire | `#FBF8F0` | plus clair, plus chaud |
| Gris | `#F2F2F0` | neutre |
| Brume | `#EFF2F1` | froid |

Le mélange est **plus doux en thème sombre** (0,75 × la force) : à faible
luminosité, un déplacement trop fort casse le contraste du texte.

### Mesure

| Réglage | Plage | Pourquoi cette plage |
|---|---|---|
| **Interligne des notes** | 20 – 38 px | en dessous, les descendantes se touchent ; au-delà, la ligne se lit comme un paragraphe |
| **Largeur de lecture** | 520 – 980 px | au-delà de ~80 caractères par ligne, l'œil perd le début de la ligne suivante |
| **Force du canevas** | 0 – 100 % | l'opacité du pointillé et du quadrillage ; 0 = aucune trame |

## 4. Ce qui empêche d'ajouter un réglage décoratif

`PRESENTATION` décrit chaque contrôle (identifiant, libellé, valeurs, plage,
unité). L'écran ne connaît **aucune** liste : il boucle sur les sections. Un
réglage qui ne figure pas dans le registre n'existe pas.

`effectOf(id, réglages)` renvoie la trace écrite de ce que le contrôle déplace,
et `src/lib/presentation.test.ts` vérifie trois choses :

1. les clés du registre sont **exactement** celles de `DEFAULT_PERSONALIZATION`
   — ni un contrôle sans état, ni un état sans contrôle ;
2. **chaque contrôle a un effet réel** — c'est le test qui aurait attrapé le
   bug d'origine ;
3. les quatre teintes produisent quatre fonds distincts, sans jamais toucher
   `ink` ni `accent`.

## 5. Contrat DOM

```html
<html data-density="regular" data-radius="soft" data-borders="subtle"
      data-elevation="regular" data-paper="mist"
      style="--note-leading: 28px; --reading-width: 720px; --canvas-strength: .5">
```

Rien d'autre. Pas de classe calculée, pas de style par composant : n'importe
quel bloc peut réagir en CSS pur, et `docs/DESIGN.md` reste la référence des
jetons.

## 6. Vérification

| Contrôle | Résultat |
|---|---|
| Tests purs du registre | 10/10 — dont « donne à chaque contrôle un effet réel » |
| Tests d'écran | attributs et variables écrits à chaque clic ; `--bg` déplacé par la teinte ; curseur → `--note-leading` **et** état persisté |
| `tsc` / `vite build` | propres |
| Suite complète | 440 tests / 39 fichiers |

**Non vérifié :** le rendu visuel réel des quatre teintes sur l'écran d'un
téléphone — Chromium n'est pas disponible ici, donc la pastille est vérifiée en
hexadécimal, pas à l'œil.
