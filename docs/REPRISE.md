# Reprendre le projet après une pause

**Écrit le 29 octobre 2026, au moment où le travail s'arrête pour trois mois.**
Ce document existe pour qu'une reprise — par toi, ou par un agent — coûte
quinze minutes et non une journée.

---

## 1. En quinze minutes : de zéro à l'écran

```bash
git clone https://github.com/joynagassi-cyber/einnnote
cd einnote
npx --yes pnpm@10 install --frozen-lockfile   # ~480 paquets ; npm install casse le dépôt
npx vite --host 0.0.0.0 --port 5173 --strictPort
```

Ouvrir `http://localhost:5173`. **Pas de `.env.local` ? L'application fonctionne
entièrement en local** : aucun compte, aucun appel réseau, aucun SDK cloud
chargé. Le cloud (abonnement, synchronisation, Stripe) est un module à part, et
`.env.example` dit les deux valeurs qu'il attend.

### Les quatre commandes qui disent si tout va bien

```bash
npx tsc -p tsconfig.app.json --noEmit    # 0 erreur attendue
npx eslint src                           # 0 erreur, 2 avertissements connus
npx vitest run                           # 794 tests, 73 fichiers
npx vite build                           # ✓
```

**Piège vérifié** : `npx tsc --noEmit` à la racine ne vérifie **rien** (le
`tsconfig.json` racine n'a que des `references` et `"files": []`), et hors du
dépôt `npx tsc` installe un paquet nommé `tsc@2.0.4` qui n'est pas TypeScript.
Toujours `-p tsconfig.app.json`, toujours depuis la racine du dépôt.

État au moment de la pause : **0 erreur TypeScript · 0 erreur de lint
(2 avertissements dans `src/lib/graph/edges.tsx`) · 794/794 tests · build ✓**.

---

## 2. Où lire quoi (dans cet ordre)

| Ordre | Fichier | Ce qu'il répond |
| --- | --- | --- |
| 1 | `README.md` | ce qu'est le produit, en une page |
| 2 | `DESIGN.md` (racine) | le contrat de design : jetons, typo, interdits |
| 3 | `docs/ROADMAP.md` | **ce qui reste à faire**, avec utilité et effort |
| 4 | `docs/ARCHITECTURE.md` | les magasins, les frontières, les flux |
| 5 | `docs/DESKTOP.md` · `docs/EDITOR-LAYOUT.md` | les deux mises en page arbitrées (bureau, page de texte) |
| 6 | `docs/PRESENTATION.md` · `docs/WALLS.md` | les cinq couches d'apparence, les 34 fonds, le verre |
| 7 | `docs/META-PROMPT-WEB.md` | le méta-prompt : refaire cette interface web ailleurs |

Chaque décision non évidente a sa trace écrite, avec son chiffre et sa raison.
Un refus documenté ne se re-discute pas : il se relit.

---

## 3. Ce qui est fini, et ce qui ne l'est pas

### Fini, vérifié

| Domaine | État |
| --- | --- |
| Coquille bureau | rail 88/264 px, en-tête collant, feuilles → boîtes centrées, colonne de filtres |
| Page de texte | une seule barre, aucun cadre, une seule mesure, côté des questions à 1180 px |
| Éditeur (Quill 2) | blocs, marques, surlignage, **couleur de texte**, **tableaux**, listes, cases, indentation, alignement, fichiers/étiquettes, recherche-remplacement, palette `Ctrl+K` |
| Apparence | 23 palettes, 34 fonds (SVG + photos), 8 presets d'accent + couleur libre + accent tiré de l'image, 6 signatures, 5 couches, fondu 0,8 s |
| Canevas | carte mentale, graphes, formes libres redimensionnables, habillage, barre flottante repliable |
| Apprentissage | questions ancrées, révision FSRS, Card Studio, fiches, apprentissage guidé |
| Données | quota surveillé, sauvegarde/restauration, export Markdown rangé par projet/vault |
| Cloud | Supabase + Stripe, **client** écrit et typé |

### Ce qui reste, par ordre de rentabilité

Le détail est dans `docs/ROADMAP.md` ; voici le résumé qui compte :

1. **Tester sur un vrai téléphone** — le clavier mobile, le `contenteditable`
   d'iOS et les gestes ne sont validés qu'en jsdom. C'est **le** angle mort.
2. **FSRS réel** — `src/lib/scheduler.ts` est une approximation maison
   (intervalles fixes) ; `ts-fsrs` est déjà dans les dépendances et n'est pas
   branché. Les tests décrivent le comportement actuel, pas le bon.
3. **Édition d'une question** — on peut supprimer, pas corriger ; une faute de
   frappe coûte l'historique de révision de la carte.
4. **Limite quotidienne de nouvelles cartes** et **annuler la dernière
   évaluation** — deux petits garde-fous qui décident si une session de 60
   cartes est supportable.
5. **Images dans les notes** — le manque le plus visible pour un cours pris en
   photo ; demande IndexedDB et une politique de compression.
6. **Cloud branché de bout en bout** — les Edge Functions et les RPC existent,
   le parcours d'abonnement n'a jamais été exercé pour de vrai.
7. **Historique de versions**, **plan de la note**, indicateur « enregistré ».

---

## 4. Les règles à ne pas réapprendre à ses dépens

Elles ont toutes coûté un aller-retour :

- **Aucune couleur en dur.** Tout passe par `src/index.css` (`@layer base`).
- **`bg-accent/20` ne fait rien** sur une variable : il faut la fonction `alpha`
  de `tailwind.config.ts` (`color-mix`). Sans elle, l'utilitaire disparaît
  silencieusement du CSS produit.
- **Les jetons sont de vraies couleurs**, pas des triplets HSL — sinon
  `@property … <color>` ne peut pas les animer, et le fondu de 0,8 s meurt.
- **Le calcul d'apparence se fait en JavaScript**, une fois, en style en ligne.
  Une règle CSS `[data-paper]` serait écrasée : le réglage deviendrait
  silencieusement inopérant.
- **Un côté n'existe que s'il reste de la place pour le texte.** 340 px de
  panneau à 840 px laissent 300 px de texte : ce n'est plus une page.
- **Trois surfaces, une mesure.** Titre, barre et corps partagent
  `calc(var(--reading-width) + 114px)` — sinon la barre déborde du texte.
- **Un enfant de flex ne rétrécit pas sans `min-width: 0`.** C'est ce qui
  poussait le compteur de mots hors de l'écran.
- **jsdom ne calcule aucune mise en page.** Une largeur se vérifie en **lisant
  `index.css`** dans un test, ou à l'œil. Ne jamais prétendre l'avoir testée.
- **Une palette change aussi le fond.** Elle pose `--bg`, donc la teinte de
  l'écran ; avec un fond image, elle change la teinte du verre et le voile
  calculé. Ce n'est pas un effet, c'est la conséquence du mélange.
- **`pnpm` only.** `npm install` casse le dépôt.
- **`git` d'abord, `gh` pour la PR.** Jamais de fusion sans instruction
  explicite.

---

## 5. Repartir proprement

La branche `arena/9a8e44d4-einnnote` (50 commits) a été **fusionnée dans `main`
le 29 octobre 2026**, avec l'accord explicite du propriétaire du dépôt. Pour la
suite :

```bash
git switch main
git pull
git switch -c feat/<sujet>        # une branche par sujet, courte
# … travailler, tester les quatre commandes, commiter avec le pourquoi …
gh pr create --base main --fill
```

Le dépôt pèse lourd (`wallpapers/sources/` ≈ 51 Mo, `public/walls/` ≈ 11 Mo) :
c'est de l'historique de travail, pas une erreur — ne pas le réécrire, et ne pas
y ajouter d'images non optimisées.

---

## 6. Si la reprise est faite par un agent

Colle `docs/META-PROMPT-WEB.md` : il porte le contrat d'exécution, les chiffres
réels, la méthode et la définition de fini. Puis dis-lui de lire, dans l'ordre,
`DESIGN.md`, `docs/ROADMAP.md` et `docs/ARCHITECTURE.md` **avant** d'écrire une
ligne.

Deux demandes à lui faire formuler d'emblée, parce qu'elles évitent les
malentendus :

1. **« Prouve-le par une sortie de commande. »** Un « c'est fait » sans
   `tsc`/`vitest`/`build` ne vaut rien.
2. **« Dis ce que tu n'as pas pu vérifier. »** Ici, tout ce qui est visuel :
   aucun navigateur n'est disponible dans l'environnement de travail.

---

## 7. Une phrase pour retrouver le fil

Einnote est une application de notes qui servent à **apprendre** : le texte
qu'on écrit devient la question qu'on se repose. Tout le design en découle —
papier chaud plutôt que blanc pur, une encre douce, un seul accent, deux
familles de caractères, et une apparence qui se compose en cinq couches plutôt
qu'un thème qu'on subit. Si une décision future contredit cette phrase, c'est la
décision qu'il faut revoir.
