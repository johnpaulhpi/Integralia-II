# Algebrick: an apprenticeship in algebra

A card game for practising Algebra I, set in a lamp-lit builder's workshop. Every piece of algebra is a brick: a yellow stud is 1, a long green brick is x, a big blue plate is x², and red bricks are negative. An equation is two baseplates on a balance, and every move is a real algebra step: combining like terms, doing the same thing to both sides, distributing, factoring, the zero-product property, square roots, completing the square, the quadratic formula, evaluating functions, slope and graphing lines.

The **Explain the last step** button shows a diagram and a plain-language explanation of why each move works, and the win screen can walk through a whole solution step by step.

The whole game is one file, `index.html`. It needs no server, no installation and no build step to play.

## What it covers

- **The Foundations:** one-step and two-step equations, variables on both sides, distributing brackets, and inequalities (including the sign flip when you divide by a negative).
- **The Frames:** multiplying binomials, factoring (common factors, trinomials, differences of squares, leading coefficients above 1), solving quadratics by factoring, square roots, completing the square and the quadratic formula.
- **The Baseplate:** evaluating functions, rewriting ax + by = c as y = mx + b, finding the line through two points, and graphing a line from its equation.

The practice bench lets a student pick any one of these and repeat it, with free advice and nothing at stake.

## Put it online with GitHub Pages

1. Sign in to GitHub and create a new repository (for example `algebrick`). Make it **Public**.
2. On the new repository's page, click **Add file → Upload files**. Drag in everything from this folder: `index.html`, `README.md`, `.nojekyll` and the `src` folder. If you only want the game online, `index.html` on its own is enough. Click **Commit changes**.
3. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, then choose the branch **main** and the folder **/ (root)**, and click **Save**.
4. After a minute or two the game will be live at:

   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`

   (Refresh the Pages settings screen to see the link once it is ready.)

`.nojekyll` is a hidden, empty file that tells GitHub to serve the page exactly as it is. It is optional; if your computer hides it and it doesn't upload, the game still works.

## Play it without the internet

Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox or Safari). The game works offline; only the decorative fonts need an internet connection, and it falls back to standard fonts without one.

## Saved progress

The logbook of stamped builds is saved in each player's own browser (using the browser's local storage). Every student who opens the page keeps their own record on their own device, and nothing is sent anywhere.

## Changing the game

The readable source code is in `src`. `index.html` is built by stitching those files together, so edit the files in `src`, then rebuild:

```
cd src
python3 build.py
```

This rewrites `../index.html`. Upload (commit) the new `index.html` to GitHub and the site updates within a minute or two.

To check that the maths engine still solves everything correctly after a change (requires Node.js):

```
cd src
node test.js
```

It generates 200 random problems of every kind (more for families with several variants), solves each one using only the moves a player has, and checks every answer independently: solutions are substituted back into the original equation, inequalities are tested on both sides of the boundary, factorisations are multiplied back out, and lines are checked against their points. A healthy result ends with `fails 0`. You can pass a number to change how many are generated, for example `node test.js 50`.

### What each source file does

| File | Contents |
| --- | --- |
| `engine.js` | The mathematics: exact fractions, bricks, equations, and every move (Snap, Counterweight, Saw, Unbox, the Rectangle, the Pry Bar…) |
| `tex.js` | Typesets expressions: fractions, powers, roots, ± and inequality signs |
| `specimens.js` | Generates the problems for each family |
| `hints.js` | The built-in solver behind the Master Builder's advice |
| `art.js` | Bricks, card and tool icons, the Master Builder, lamps and pins (drawn in SVG) |
| `game1.js` | Card data, tools, rooms, puzzles, the Master Builder's lines, and pop-up windows |
| `game2.js` | The trial: plates, the baseplate grid, turns, cards, the tower race, and the factoring puzzle |
| `explain.js` | "Explain the last step": diagrams, figures and explanations |
| `game3.js` | Title screen, map, events, examiners, the practice bench, and start-up |
| `style.css` | All the visual styling |
| `shell.html` | The page skeleton the build fills in |
| `build.py` | Combines everything into `../index.html` |
| `test.js` | Automated maths checks |
