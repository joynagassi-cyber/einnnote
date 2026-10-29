# Einnote — contrat de design

Ce fichier est le **système de design déclaré** : ce que le produit s’autorise.
Le détecteur (`npx impeccable detect`) le lit et ne signale plus ce qui est
déclaré ici. La façon de le construire — couches, presets d’accent, contrats
d’accessibilité — vit dans [`docs/DESIGN.md`](docs/DESIGN.md).

Règle unique : **aucune valeur en dur dans un composant.** Tout passe par une
variable de `src/index.css` (`@layer base`).

## Couleurs

Un fond de papier, une surface, un accent. Rien d’autre n’est décoratif.

| Jeton | Clair | Sombre | Rôle |
| --- | --- | --- | --- |
| `--bg` | `#f6f1e7` | `#1e1c19` | le papier, jamais blanc pur |
| `--bg-outside` | `#ece4d4` | `#15130f` | derrière les fenêtres flottantes |
| `--surface` | `#fffdf8` | `#27241f` | cartes, feuilles, fenêtres |
| `--surface-2` | `#efe8d8` | `#312d26` | surface seconde, champs au repos |
| `--line` | `#e4dccb` | `#3a352c` | séparateurs |
| `--line-strong` | `#c9bfa8` | `#4c463a` | bordure au survol, contour de champ |
| `--ink` | `#2b2a27` | `#f1ece1` | texte |
| `--muted` | `#6b6659` | `#a8a193` | texte secondaire |
| `--accent` | `#0f766e` | réglable | action, focus, lien |
| `--accent-soft` | `#d9eeea` | réglable | fond teinté |
| `--accent-ink` | `#0b5c56` | réglable | texte sur fond teinté |
| `--on-accent` | `#ffffff` | réglable | texte posé sur l’accent |
| `--danger` | `#b3261e` | — | erreur, lien mort, suppression |
| `--highlight` | `#f6e3a1` | — | surlignage |

Le fond est chaud **par choix de produit** (papier, lecture longue), pas par
réflexe : il porte 23 thèmes et change avec eux. L’accent est un jeu de quatre
variables (`src/lib/accents.ts`), dont la valeur est calculée depuis le fond.

**Contraste exigé : ≥ 4,5:1** pour tout texte, calculé par
`src/lib/contrast.ts` et vérifié en test — jamais à l’œil.

## Typographie

Deux faces, deux rôles. Aucune famille n’est écrite dans un composant.

| Variable | Face | Usage |
| --- | --- | --- |
| `--font-ui` | **Inter** | mobilier : barres, listes, formulaires, boutons |
| `--font-note` | **Literata** | contenu : notes, titres, citations |

Inter est **assumé** pour l’interface : chiffres tabulaires, lisible à 11 px,
identique dans les 23 thèmes. Literata porte tout ce que l’utilisateur écrit,
et c’est elle qu’on voit d’abord.

Corps de note : `17 px / 28 px` (`--note-size`, `--note-leading`), réglable de
14 à 22 px. Échelle d’interface : 11 · 12 · 13 · 14 · 15 · 16 · 17 · 18 · 22 ·
26 · 30. Interlignes appariés : 18/13.5 · 21/14 · 24/16 · 28/17 · 32/26 · 36/30.
Chiffres alignés (`tabular-nums`) sur tout compteur.

## Rayons

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--r-rect` | 12 px | outil, bouton de barre |
| `--r-field` | 14 px | champ, pastille |
| `--r-card` | 18 px | carte, fenêtre |
| `--r-sheet` | 24 px | feuille, palette, fiche |

`--radius` (0,75 rem) est la compatibilité shadcn ; il pointe sur la même
échelle et suit `data-radius`.

## Espace et élévation

Pas de 4 px ; gouttière 20 px (téléphone) / 32 px (bureau). Trois ombres
seulement : `--shadow-card` (posé), `--shadow-float` (au-dessus du papier),
`--shadow-lift` (feuille, barre contextuelle). Aucune ombre colorée, aucun halo.

## Mouvement

150 ms (couleur, opacité), 220 ms (apparition de feuille), 300 ms (mise en
page). Fondu des thèmes : `@property` + 0,8 s. `prefers-reduced-motion` et
`[data-motion="reduced"]` neutralisent tout le non-essentiel.

## Mise en page

| Contexte | Contenu | Navigation |
| --- | --- | --- |
| Téléphone (< 768 px) | 440 px | barre d’onglets basse, `+` flottant |
| Tablette (768–1023 px) | 720 px | rail compact 88 px, icônes seules |
| Bureau (≥ 1024 px) | 720 px lecture · 1060 px listes | rail fixe 264 px, fenêtres flottantes |

Cibles tactiles ≥ 44 px ; au clavier, tout est atteignable et le focus est
visible (`--ring`).

## Interdits

- Une barre d’accent colorée sur le côté d’une carte ou d’une citation.
- Du texte en dégradé, des ombres colorées, des halos radiaux.
- Des cartes dans des cartes.
- Une couleur écrite en dur, une famille écrite en dur, une taille d’ombre
  inventée.
- Un état signalé par la seule couleur.

## Exceptions consignées

Deux dérogations au détecteur, avec leur raison, dans
`.impeccable/config.json` :

1. `overused-font = inter` — face d’interface assumée (voir plus haut).
2. `codex-grid-background` sur `src/index.css` — le papier quadrillé est une
   surface d’écriture **choisie par l’utilisateur** (`data-canvas="grid"`).
