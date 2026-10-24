# LSA DSCG — consignes de mise à jour

- Site statique (GitHub Pages) utilisé aussi comme application sur l'écran d'accueil.
- La bannière « Mise à jour disponible » (assets/app-nav.js) s'affiche quand `version.json` change.
- **À chaque modification livrée sur main, lancer `scripts/bump-version.sh "Phrase courte pour les étudiants"`** et inclure `version.json` dans le commit. La note est affichée dans la bannière : une phrase claire, sans jargon.
- Filet de sécurité : le workflow `.github/workflows/bump-version.yml` incrémente la version (note générique) si un push sur main n'a pas touché `version.json`.
