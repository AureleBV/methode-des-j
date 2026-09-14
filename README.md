# Méthode des J · Planning de révisions

PWA de planning de révisions automatique basée sur la méthode des J (répétition espacée : J+1, J+3, J+7, J+15, J+30, J+60).

- Tu ajoutes un cours (matière, titre, date J0, difficulté, durée) : les révisions sont placées automatiquement.
- Lissage de la charge (max révisions/jour, temps max/jour, jours off, vacances), arrêt avant la date d'examen, révision la veille.
- Recalage automatique des révisions suivantes après un retard.
- Notes, liens et fichiers (PDF, photos, audio) attachés à chaque cours, stockés sur l'appareil.
- Vue du jour, calendrier mois/semaine, statistiques (streak, charge à venir).
- Notifications locales (Android / appli ouverte), rappel du soir, export `.ics` vers le calendrier du téléphone.
- Écran de verrouillage par code (code par défaut `1234`, à modifier dans Réglages).
- 100 % hors ligne, aucune donnée envoyée sur un serveur. Sauvegarde / restauration en JSON.

## Développement

Site statique sans build : ouvrir `index.html` via un serveur local, par exemple :

```bash
npx http-server . -p 8090 -c-1
```

Les icônes sont générées par `node gen-icons.js`.

---

## NutriPlate (dossier `nutriplate/`)

Application de nutrition et de perte de poids progressive (React + TypeScript + Dexie, PWA hors-ligne). Voir [`nutriplate/README.md`](nutriplate/README.md).
