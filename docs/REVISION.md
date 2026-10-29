# Révision espacée — FSRS-5, portées, cartes 3D

Ce document décrit ce qui tourne, ce qui a été refusé, et **comment le vérifier**.
Il remplace la note « prototype » qui décrivait une croissance d’intervalle
inventée (`stability × 2.4`).

---

## 1. Le défaut d’origine, en une phrase

La page `/review` démarrait une séance sur « toutes les cartes dues », sans
choix de portée, avec un ordonnanceur maison qui n’avait ni état
d’apprentissage, ni recalage après échec, ni difficulté par carte. Les chiffres
affichés étaient plausibles ; le comportement ne l’était pas.

## 2. Ce qui le remplace

### 2.1 FSRS-5 (`ts-fsrs`, poids par défaut)

`src/lib/scheduler.ts` est la seule porte d’entrée. Quatre évaluations — Encore,
Difficile, Bien, Facile — sont converties en notes FSRS 1–4, et **un seul appel
`repeat()`** produit les quatre intervalles affichés sous les boutons **et**
l’intervalle appliqué au clic. Aucun chiffre n’est écrit à la main.

| Règle | Pourquoi |
|---|---|
| `now` toujours passé en paramètre | Les tests sont déterministes ; `Date.now()` implicite rendrait l’aperçu et l’application divergents. |
| Rétention réglable (80–97 %, défaut 90 %) | C’est le paramètre qui a un effet visible : plus il monte, plus les intervalles raccourcissent. |
| Cartes d’avant FSRS converties à la volée | `reps > 0` sans `state` ≠ nouveauté. Sans cette conversion, une deuxième « première » rencontre casserait la progression. |
| `again` → 10 minutes, état *Relearning* | La sortie normale d’un échec, pas une punition. |

Vérification : `src/lib/scheduler.test.ts` (9 tests) — ordre des intervalles,
croissance, échec, effet de la rétention, déterminisme, conversion des anciennes
cartes, format des libellés, heure du rappel.

### 2.2 Portées : projet, vault, note

La séance se choisit (`/review`), elle ne s’impose plus.

| Portée | Ce qu’elle contient |
|---|---|
| **Tout** | questions dues + fiches déjà travaillées |
| **Projet** | questions de ses notes + fiches de ses vaults |
| **Vault** | ses fiches (y compris neuves) + questions des notes rattachées |
| **Note** | ses questions, une par carte |

Deux natures de cartes se révisent dans la même file :

- **question** : recto = question écrite à froid, verso = passage surligné ;
- **fiche** : recto = titre numéroté, verso = corps + source + renvois.

Une fiche neuve n’entre jamais par surprise dans « Tout » : elle entre par son
vault. C’est ce qui garde le badge du rail (12) égal au compteur de la page.

Vérification : `src/lib/review.test.ts` (8 tests) — filtrage par portée, fiches
neuves exclues de « Tout », plafonds quotidiens, comptage du jour.

### 2.3 La carte : un vrai retournement 3D

`src/components/review/FlipCard.tsx` + le bloc `.flip` de `src/index.css`.

- deux faces réelles dans le DOM, `backface-visibility: hidden`,
  `transform-style: preserve-3d`, `perspective: 1600px` ;
- `rotateY(180deg)` en 620 ms, `cubic-bezier(0.19, 0.86, 0.24, 1.02)` —
  démarrage franc, arrivée amortie ;
- inclinaison au pointeur (5° maximum) : au-delà, le texte tremble ;
- **reflet holographique** en `soft-light` (conic-gradient spectral + halo qui
  suit le pointeur) et liseré spectral d’un pixel sur la tranche ;
- coupé si `prefers-reduced-motion`, `data-motion="reduced"`,
  `data-contrast="high"` ou `data-transparency="reduced"`.

Le verso **porte le contenu** : passage, aperçu rendu de la note (3 blocs),
source et renvois pour une fiche. Il défile à l’intérieur de la carte, qui garde
une hauteur fixe (`min(64vh, 560px)`) pour que les deux faces coïncident.

Mesures navigateur (1440 × 900 et 390 × 844) : carte 574 × 560 px et
350 × 523 px, `matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)` après
retournement — la rotation est réelle, pas une classe d’opacité.

### 2.4 Plafonds et rappel quotidien

`/settings/review` (Réglages › Révision et rappels) :

| Réglage | Effet réel |
|---|---|
| Rétention 80–97 % | intervalles recalculés, aperçu chiffré sur une carte réelle |
| Nouvelles / jour | `planSession()` s’arrête au plafond, par jour civil |
| Révisions / jour | second plafond de sécurité |
| Ordre | échéance ou mélangé |
| Intervalles affichés | sous chaque bouton, ou l’indice à la place |
| Rappel + heure | bandeau dans la bibliothèque, une fois par jour, seulement s’il reste des cartes |

Le rappel système est possible **seulement application ouverte** : sans service
worker ni serveur, une page fermée ne peut rien programmer. C’est écrit dans
l’écran, pas caché.

## 3. Ce qui n’a pas été fait, et pourquoi

- **FSRS optimisé sur vos données** : il faut un historique de plusieurs
  milliers de révisions et un optimiseur hors ligne. Les poids par défaut sont
  l’état de l’art sans données personnelles.
- **Rappels hors application** : voir ci-dessus — cela demande un service
  worker, donc un périmètre différent (et une permission navigateur).
- **Session interrompue et reprise** : la file vit en mémoire. Quitter
  `/review/session` termine la séance ; les notes déjà données sont enregistrées.
