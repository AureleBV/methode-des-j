# NutriPlate

Application de nutrition et de perte de poids **progressive**, pensée pour les étudiants et les gens pressés : manger des repas qu'on aime, en quantité suffisante pour être rassasié, en restant dans un déficit calorique raisonnable. Pas de régime extrême, pas de culpabilisation.

100 % locale (IndexedDB), installable en PWA, hors-ligne. Aucun compte, aucun serveur.

## Fonctionnalités

- **Onboarding** : profil, objectif, matériel de cuisine (micro-ondes, poêle, Air Fryer, four), régime, goûts (adoré / ok / détesté / allergie) et détection douce de signaux de rapport compliqué à l'alimentation (mode douceur : pas de déficit poussé).
- **Objectifs** : métabolisme basal (Mifflin-St Jeor), dépense estimée, déficit modéré borné (jamais extrême, plancher de sécurité), protéines / glucides / lipides. Ajustement proposé après quelques semaines selon la tendance du poids moyen, l'adhérence et la faim.
- **Dashboard** non culpabilisant (« Objectif presque atteint 👍 »), eau, activité, poids, idées de repas pour la suite.
- **Journal** : recherche locale + Open Food Facts (isolé, cache, fallback), scan de code-barres (API BarcodeDetector, saisie manuelle sinon), favoris, repas enregistrés, aliments perso, portions, modification rapide des quantités.
- **Repas complets** : 46 recettes réalistes (pâtes bolo, poulet/riz, steak-frites Air Fryer, burger maison, wraps, pizza rapide, micro-ondes…) avec macros calculées depuis les ingrédients, temps, matériel, étapes, astuces « aliment plaisir ». Recherche libre (« moins de 600 kcal air fryer », « grosse faim »…).
- **Substitutions** : aliment détesté → remplaçants du même groupe (crudités → légumes cuits si détestées), option « aucun légume », macros recalculées.
- **Volume food** : indicateur de satiété estimé 🔥 (densité calorique, protéines, fibres, volume), présenté comme une estimation.
- **J'ai faim maintenant** : collations selon la faim (petite / moyenne / grosse) et ce qu'il reste dans la journée.
- **Je veux manger vite** : < 5 / 10 / 15 min. **Mode Air Fryer** : presets (frites, poulet, nuggets, légumes…), quantité / huile / température / temps, impact de l'huile sur les calories.
- **Semaine** : planning généré automatiquement (préférences, régime, matériel), remplacement par des repas équivalents (kcal, protéines, satiété). **Liste de courses** groupée par rayon, cochable.
- **Sport** : programmes Full Body A/B, maison A/B, marche, cardio ; suivi séries / reps / poids, comparaison avec la dernière séance.
- **Progrès** : poids du jour, moyenne 7 jours, 30 jours, depuis le début, graphique avec moyenne mobile, détection de plateau (checklist avant tout ajustement), proposition d'ajustement prudente (±100 kcal).
- Export / import JSON, mode sombre automatique.

### Phase 4 (personnalisation et services)

- **Profils multiples** sur un même appareil (chacun sa base, ses goûts, ses objectifs), avatar, couleur d'accent, rythme de perte (douce / modérée / soutenue), protéines par kg, créneaux et heures de repas.
- **Variantes d'aliments** : steak haché 5 / 10 / 15 / 20 %, lait écrémé / demi / entier, riz et pâtes blancs / complets, fromage blanc 0 / 3 / 8 %… L'app propose la version la plus légère mais tu choisis précisément ce que tu prends et peux fixer ton « habituel ».
- **Produits & prix** : marque, format, code-barres (Open Food Facts), prix relevés par magasin, prix moyen au kilo, moyenne communautaire via [Open Prices](https://prices.openfoodfacts.org). Liste de courses avec produit habituel, nombre de packs et budget estimé.
- **Où acheter** : commerces alimentaires autour de toi via OpenStreetMap / Overpass (sans clé), carte Leaflet, itinéraire dans l'app de cartes du téléphone.
- **Voix** : dicter un repas (« 150 g de poulet, 200 g de riz et une banane »), lecture des recettes en mode cuisine, annonces du chrono. Web Speech API du navigateur, aucun serveur NutriPlate.
- **Analyse photo** : modèle MobileNet dans le navigateur (gratuit, aucune image envoyée) ou, au choix, Gemini avec sa propre clé (offre gratuite Google, photos envoyées à Google). Dans les deux cas tu confirmes et ajustes.
- **Sport** : 18 programmes (Full body, Push/Pull/Legs, Upper/Lower, maison, HIIT avec chrono, abdos, mobilité, course débutant, vélo, natation…), bibliothèque de 50 exercices, création de programmes personnels.
- **Confidentialité** : page dédiée. Aucun compte, aucun cookie, aucun traceur ; les services externes ne reçoivent que le strict nécessaire, uniquement à l'usage.

## Stack

Vite 8 · React 19 · TypeScript strict · Tailwind CSS 4 · Dexie (IndexedDB) · react-router · Leaflet (OpenStreetMap) · TensorFlow.js (chargé à la demande) · Vitest · ESLint · vite-plugin-pwa.

## Architecture

```
src/
  domain/      calculs purs, testés (nutrition, satiété, préférences/substitutions, poids/plateau, planner)
  db/          schéma Dexie + seeds (aliments, recettes, collations, presets Air Fryer, programmes)
  services/    Open Food Facts, Open Prices, Overpass (OSM), voix (Web Speech), vision (MobileNet local / Gemini) — isolés, avec cache et erreurs typées
  lib/         hooks de lecture réactive, mutations (actions), formatage
  components/  UI réutilisable (boutons, sheet, chips, anneaux de progression…)
  features/    écrans : onboarding, home, meals, journal, plan, sport, progress, profile
```

Les macros des recettes ne sont jamais stockées : elles sont calculées à partir des ingrédients, donc toujours cohérentes avec la base d'aliments. Les valeurs de la base locale sont indicatives (tables publiques CIQUAL / USDA, arrondies) ; Open Food Facts permet d'ajouter un produit précis.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest
npm run lint
npm run typecheck
npm run build      # dist/ (PWA)
```

## Installer sur le téléphone (PWA)

Le workflow `.github/workflows/pages.yml` déploie le repo sur GitHub Pages à chaque push sur `main` :
`https://<utilisateur>.github.io/methode-des-j/nutriplate/`. À activer une fois dans le repo : Settings → Pages → Source : **GitHub Actions**.

Ensuite, ouvrir l'URL sur le téléphone :
- **Android (Chrome)** : menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

L'app fonctionne ensuite hors-ligne, en plein écran, et les données restent sur l'appareil. Le scan de code-barres nécessite Chrome sur Android (API BarcodeDetector) ; ailleurs, la saisie manuelle du code est proposée.

## Santé

NutriPlate n'est pas un dispositif médical. Les objectifs sont des estimations. En cas de doute, de pathologie, de grossesse ou de signes de trouble du comportement alimentaire, consulte un professionnel de santé.
