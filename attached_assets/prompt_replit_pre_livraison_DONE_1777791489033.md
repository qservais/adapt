# PROMPT REPLIT — PRÉ-LIVRAISON COMPLÈTE — madebydone.be

Tu es Replit AI.

## Mission

Avant la mise en production d'un projet web, effectuer un audit complet et implémenter **tout le socle technique, SEO, tracking, performance, sécurité HTTP et légal** nécessaire à une livraison professionnelle.

Ce prompt couvre :

1. **SEO technique** — meta, OpenGraph, Twitter Cards, sitemap, robots.txt, canonical, JSON-LD, lang
2. **Favicon** — génération complète à partir du logo, avec double fail-safe anti-Replit
3. **Tracking** — GTM, dataLayer, événements GA4
4. **Accessibilité de base** — alt, labels, headings
5. **Performance & Core Web Vitals** — images, vidéos, fonts, cibles LCP/CLS/INP
6. **Sécurité HTTP** — CSP, HSTS, headers de sécurité essentiels
7. **Vérifications techniques** — HTTPS, liens morts, 404, formulaires
8. **Pages légales** — mentions légales, confidentialité, cookies
9. **Footer** — liens légaux, copyright, crédit madebydone.be
10. **Nettoyage Replit** — suppression de toute trace visible et invisible de Replit

---

## Règle de prudence absolue

Avant toute modification :
- utilise la documentation et les sources officielles les plus récentes disponibles ;
- inspecte le code, les routes, le footer, les formulaires, les scripts tiers, le consentement cookies, l'analytics et les intégrations existantes ;
- n'implémente que ce dont tu es **certain à 100 %** ;
- si un outil n'est pas détecté dans le projet, **ne le mentionne pas comme actif** dans les politiques ;
- **ne casse jamais le responsive existant** — le responsive est géré avant cette étape.

---

## Règle de ré-audit complet

**Tu audites TOUT, y compris ce qui semble déjà fait.**

Le projet a pu être partiellement finalisé, mais tu ne dois faire **aucune confiance aveugle** à l'existant :
- un sitemap peut exister mais être obsolète ou incorrect ;
- un robots.txt peut exister mais bloquer des pages publiques ;
- un favicon peut être présent mais être celui de Replit déguisé ;
- un GTM peut être injecté mais sans dataLayer ni événements ;
- des balises meta peuvent exister mais être dupliquées ou erronées.

Pour **chaque étape du prompt**, applique ce protocole :

1. **Inspecter** l'état actuel (présent ? conforme ? à jour ?)
2. **Diagnostiquer** : ✅ Conforme / ⚠️ Partiel / ❌ Absent ou incorrect
3. **Agir** selon le diagnostic :
   - ✅ Conforme → ne rien toucher, mentionner dans le récap "déjà en place, conforme"
   - ⚠️ Partiel → compléter / corriger sans tout refaire
   - ❌ Absent ou incorrect → implémenter proprement
4. **Journaliser** chaque décision dans le récapitulatif final

**Tu ne dois jamais écraser un travail existant conforme.** Tu ne dois jamais non plus le présumer conforme sans l'avoir inspecté.

---

## Règle absolue : ZÉRO placeholder visible, ZÉRO trace Replit

### Aucun placeholder sur le site

**Il est strictement interdit d'afficher un texte de type `[À COMPLÉTER]`, `[PLACEHOLDER]`, `[À CONFIRMER]` ou tout texte entre crochets sur le site visible par l'utilisateur.**

Quand une information manque (adresse, forme juridique, BCE, hébergeur, etc.) :
1. **D'abord**, chercher l'information dans tout le projet : code source, fichiers de config, variables d'environnement, composants, textes existants, footer, header, contact, etc.
2. **Si l'information est trouvable** : l'utiliser directement.
3. **Si l'information est introuvable** : **ne pas afficher la ligne du tout**. Omettre silencieusement le champ. Ne jamais afficher un champ vide ou un placeholder.
4. **Dans le récapitulatif technique final** (qui n'est PAS visible sur le site) : lister toutes les informations manquantes que le client devra fournir pour compléter les pages. Ce récapitulatif est destiné à l'agence, pas au visiteur.

Exemples concrets :
- Si l'adresse est inconnue → ne pas afficher la ligne "Adresse : ..." du tout
- Si la forme juridique est inconnue → ne pas afficher la ligne "Forme juridique : ..." du tout
- Si le numéro BCE est inconnu → ne pas afficher la ligne "BCE : ..." du tout
- Si l'hébergeur est inconnu → écrire une formulation générique comme "Ce site est hébergé par une infrastructure cloud européenne." sans nommer de prestataire

Le site livré doit avoir l'air **terminé et professionnel** à 100 %, même si certaines informations sont incomplètes en coulisse.

### Zéro trace de Replit

**Toute mention, référence, lien, fichier, commentaire, meta tag, ou indice visible ou invisible lié à Replit doit être supprimé ou masqué.**

Le site livré ne doit **jamais** laisser deviner qu'il a été construit ou hébergé sur Replit.

#### Nettoyage obligatoire :

**1. Fichiers à supprimer ou masquer du déploiement :**
- `.replit`
- `replit.nix`
- `.replit.dev`
- tout fichier `*.replit*`
- tout dossier `.config/replit/`
- si ces fichiers sont nécessaires au fonctionnement de Replit, ne pas les supprimer mais s'assurer qu'ils ne sont **jamais servis publiquement** (pas dans `/public/`, pas accessibles via URL)

**2. Code source — scanner et nettoyer :**
- Supprimer tout commentaire contenant "replit", "Replit", "REPLIT" dans le code
- Supprimer tout `console.log` ou debug mentionnant Replit
- Vérifier les `package.json`, `README.md`, fichiers de config : retirer les mentions Replit
- Vérifier les variables d'environnement : si des variables contiennent "REPLIT" dans leur nom (ex: `REPLIT_DB_URL`, `REPLIT_SLUG`), s'assurer qu'elles ne fuient pas côté client

**3. HTML / Head — scanner et nettoyer :**
- Supprimer tout `<meta>` tag injecté par Replit
- Supprimer tout `<script>` Replit (analytics, badges, devtools)
- Supprimer tout `<link>` vers des ressources Replit
- Vérifier qu'aucun header HTTP n'expose Replit (ex: `X-Replit-*`)
- Supprimer le badge "Made with Replit" / "Built on Replit" s'il existe

**4. Pages légales — hébergement :**
- **Ne JAMAIS écrire "Replit, Inc." comme hébergeur**
- **Ne JAMAIS écrire l'adresse de Replit (55 2nd Street, San Francisco)**
- **Ne JAMAIS mettre un lien vers replit.com**
- Pour la section hébergement des mentions légales, utiliser une formulation neutre :

```
Ce site est hébergé par une infrastructure cloud sécurisée.
Pour toute question technique, contactez l'adresse email de contact du site ou l'agence madebydone.be.
```

Ou si un vrai hébergeur tiers est identifié (ex: domaine chez OVH, Cloudflare, etc.), mentionner celui-ci.

**5. Vérification finale Replit :**
Après toutes les modifications, effectuer une recherche globale (case-insensitive) dans tout le projet pour les termes :
- `replit`
- `Replit`
- `REPLIT`
- `.replit`
- `repl.co`
- `repl.dev`
- `replit.com`
- `replit.app`

Chaque occurrence trouvée doit être soit supprimée, soit justifiée comme techniquement nécessaire au fonctionnement (et dans ce cas, s'assurer qu'elle n'est jamais exposée publiquement).

Ajouter dans la checklist finale :
- [ ] Aucune mention de Replit visible sur le site
- [ ] Aucune mention de Replit dans le code source côté client
- [ ] Aucun fichier Replit accessible publiquement
- [ ] Section hébergement des mentions légales sans Replit

---

# PARTIE 1 — SEO TECHNIQUE

## Étape 1.1 — Audit SEO du projet

Analyse le projet et vérifie/liste :

### A. Balises meta existantes
Pour **chaque page/route** du projet, vérifier :
- `<title>` — unique, descriptif, 50-60 caractères
- `<meta name="description">` — unique, 150-160 caractères
- `<meta name="viewport">` — présent et correct
- `<meta charset="UTF-8">`
- `<html lang="fr">` (ou la langue du site) — **obligatoire**
- `<link rel="canonical" href="...">` — **sur chaque page**, URL absolue

### B. OpenGraph (og:)
Vérifier/ajouter sur chaque page :
- `og:title`
- `og:description`
- `og:type` (website / article selon la page)
- `og:url` — URL canonique absolue
- `og:image` — image 1200×630 minimum
- `og:image:width` + `og:image:height`
- `og:locale` (ex: `fr_BE`)
- `og:site_name`

### C. Twitter Cards
Vérifier/ajouter :
- `twitter:card` → `summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### D. Image OpenGraph
**Méthode : capture d'écran de la page d'accueil.**
- Prendre une capture d'écran de la page d'accueil du site
- La redimensionner/cropper en **1200×630 pixels**
- La sauvegarder dans `/public/og-image.jpg` (ou équivalent selon le framework)
- Référencer cette image dans les balises `og:image` et `twitter:image` avec une **URL absolue**
- Si la capture échoue, créer un placeholder avec le logo centré sur un fond de la couleur principale du site et laisser un commentaire `<!-- TODO: remplacer par une vraie image OG -->`

### E. Canonical URLs
- Chaque page doit avoir un `<link rel="canonical">` avec l'URL absolue complète
- Pas de trailing slash incohérent
- Même protocole partout (https)
- Pas de paramètres inutiles dans les canonicals

---

## Étape 1.2 — Sitemap dynamique

Générer un **sitemap.xml dynamique** basé sur les routes réelles du projet.

### Exigences
- Lister toutes les routes publiques du site
- Exclure les routes techniques (`/api/*`, `/admin/*`, `/auth/*`, pages légales optionnellement)
- Format XML standard avec `<urlset>`, `<url>`, `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`
- La page d'accueil a `priority` 1.0
- Les pages principales ont `priority` 0.8
- Les pages secondaires ont `priority` 0.6
- `<lastmod>` = date du jour de génération si pas de date dynamique disponible
- Le sitemap doit être accessible à `/sitemap.xml`
- Si le framework le permet, générer le sitemap dynamiquement (route API ou build-time)
- Sinon, générer un fichier statique

---

## Étape 1.3 — robots.txt

Générer un **robots.txt** avec des règles personnalisées.

```
User-agent: *
Allow: /

# Bloquer les routes techniques
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /_next/
Disallow: /.replit
Disallow: /replit.nix

# Sitemap
Sitemap: https://[DOMAINE]/sitemap.xml
```

### Règles
- Adapter les `Disallow` aux routes techniques réellement présentes dans le projet
- Ne pas bloquer les pages publiques
- Ne pas bloquer les assets (images, CSS, JS) — Google en a besoin pour le rendu
- Le fichier doit être accessible à `/robots.txt`
- Remplacer `[DOMAINE]` par le vrai domaine détecté dans le projet. Si le domaine final n'est pas encore configuré, utiliser l'URL de déploiement actuelle et laisser un commentaire dans le code uniquement (pas visible sur le site)

---

## Étape 1.4 — Structured Data (JSON-LD)

Ajouter un bloc **JSON-LD** dans le `<head>` de la page d'accueil.

### Schema minimum : Organization ou LocalBusiness

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[NOM COMMERCIAL]",
  "description": "[DESCRIPTION COURTE]",
  "url": "https://[DOMAINE]",
  "logo": "https://[DOMAINE]/logo.png",
  "telephone": "[TÉLÉPHONE]",
  "email": "[EMAIL]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[ADRESSE]",
    "addressLocality": "[VILLE]",
    "postalCode": "[CODE POSTAL]",
    "addressCountry": "BE"
  },
  "sameAs": []
}
```

### Règles
- Utiliser `LocalBusiness` si le client a une adresse physique, sinon `Organization`
- Remplir avec les infos détectées dans le projet
- **Si un champ est introuvable, ne pas l'inclure dans le JSON-LD** plutôt que de laisser un placeholder — un JSON-LD partiel mais correct vaut mieux qu'un JSON-LD complet avec des fausses valeurs
- Ajouter les liens `sameAs` si des réseaux sociaux sont détectés dans le footer/header
- Valider mentalement la structure JSON-LD (pas de virgules trailing, etc.)

---

## Étape 1.5 — HTTPS

Vérifier que :
- Toutes les URLs internes utilisent `https://`
- Aucun mixed content (ressources chargées en http sur une page https)
- Les redirections http → https sont en place si le framework le permet
- Les URLs dans le sitemap, canonical, og:url, JSON-LD utilisent toutes `https://`

---

# PARTIE 2 — FAVICON (DOUBLE FAIL-SAFE ANTI-REPLIT)

## RÈGLE CRITIQUE : le favicon Replit par défaut doit être éliminé

**Le favicon par défaut de Replit (logo Replit, icône "R", ou toute variante) ne doit JAMAIS rester sur le site livré.** C'est un problème récurrent et récalcitrant. Le prompt applique un **double fail-safe** pour garantir son élimination totale.

---

## Étape 2.1 — Phase 1 : Purge préventive (AVANT toute génération)

Avant de générer quoi que ce soit, **purger intégralement** tous les favicons et références existants :

### A. Supprimer tous les fichiers favicon dans tout le projet

Lancer une recherche exhaustive et supprimer :

```bash
# Recherche exhaustive de tous les fichiers favicon
find . -type f \( \
  -iname "favicon*" -o \
  -iname "apple-touch-icon*" -o \
  -iname "android-chrome*" -o \
  -iname "mstile*" -o \
  -iname "safari-pinned-tab*" -o \
  -iname "site.webmanifest" -o \
  -iname "manifest.json" -o \
  -iname "browserconfig.xml" \
\) -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*"
```

Dossiers à inspecter (liste exhaustive) :
- `/public/`
- `/public/favicons/`
- `/public/icons/`
- `/static/`
- `/assets/`
- `/src/assets/`
- `/src/public/`
- `/app/` (pour Next.js App Router — favicon.ico peut être dans `/app/favicon.ico`)
- racine du projet

### B. Détection spécifique du favicon Replit

Le favicon Replit a plusieurs signatures. Vérifier pour chaque fichier favicon trouvé :
- **Nom de fichier contenant** : `replit`, `repl`
- **Taille suspecte** : les favicons Replit font souvent exactement 5430, 15406, ou 25214 bytes — à vérifier si un favicon générique reste
- **Hash MD5** des favicons Replit connus — si possible, comparer

Si un favicon ne peut pas être identifié avec certitude comme étant celui du client, **le supprimer par sécurité** et le régénérer à partir du logo client.

### C. Nettoyer tous les points d'injection

**1. `<head>` HTML :**
- Supprimer **toutes** les balises suivantes dans tous les fichiers HTML/layout :
  - `<link rel="icon" ...>`
  - `<link rel="shortcut icon" ...>`
  - `<link rel="apple-touch-icon" ...>`
  - `<link rel="mask-icon" ...>`
  - `<link rel="manifest" ...>`
  - `<meta name="msapplication-TileImage" ...>`
  - `<meta name="msapplication-config" ...>`

**2. Fichiers de configuration framework :**
- **Next.js** : vérifier `app/layout.tsx`, `app/favicon.ico`, `pages/_document.tsx`, `next.config.js`
- **Vite** : vérifier `index.html`, `vite.config.js`
- **React / CRA** : vérifier `public/index.html`, `public/manifest.json`
- **Astro** : vérifier `src/layouts/*.astro`
- **Nuxt** : vérifier `nuxt.config.ts`, `app.vue`
- **SvelteKit** : vérifier `src/app.html`

**3. Injections automatiques du framework :**
- Certains frameworks injectent automatiquement un favicon si un fichier `favicon.ico` existe à un emplacement précis. **S'assurer qu'aucun fichier par défaut ne traîne** à ces emplacements :
  - Next.js App Router : `/app/favicon.ico` (injecté automatiquement dans `<head>`)
  - Next.js Pages Router : `/public/favicon.ico`
  - Vite : `/public/favicon.ico`
  - CRA : `/public/favicon.ico`

---

## Étape 2.2 — Phase 2 : Détecter le vrai logo du client

Le logo du client doit être trouvé **dans le site lui-même**, pas dans les assets Replit. Suivre cette cascade de détection **dans cet ordre de priorité** :

### Priorité 1 — Logo dans le header/navbar
- Inspecter le composant header/navbar du site
- Chercher un `<img>`, `<svg>`, ou `<picture>` qui sert de logo
- Si c'est un `<img src="...">` : noter le chemin du fichier source
- Si c'est un `<svg>` inline : extraire le SVG complet
- Si c'est un composant (ex: `<Logo />`, `<SiteLogo />`) : remonter jusqu'au fichier source

### Priorité 2 — Logo dans le footer
- Si le header ne contient pas de logo identifiable, vérifier le footer
- Même logique : `<img>`, `<svg>`, composant

### Priorité 3 — Fichier logo dans les assets
- Chercher dans ces dossiers (dans l'ordre) :
  - `/public/logo.*` (svg, png, jpg, webp)
  - `/public/images/logo.*`
  - `/src/assets/logo.*`
  - `/src/assets/images/logo.*`
  - `/assets/logo.*`
  - `/images/logo.*`
- Prendre la version de meilleure qualité (SVG > PNG > JPG)

### Priorité 4 — Recherche globale
- Si rien n'est trouvé aux priorités 1-3, faire une recherche dans tout le projet :
  ```bash
  find . -iname "*logo*" -type f \( -name "*.svg" -o -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) | head -20
  ```
- Exclure les fichiers dans `node_modules/`, `.git/`, `dist/`, `build/`

### Priorité 5 — Logo texte uniquement
Si le site n'utilise **aucun logo graphique** mais seulement un texte stylisé (ex: `<h1 class="logo">MonSite</h1>` ou `<span class="brand">NomDuClient</span>`) :
- Identifier le texte utilisé comme logo
- Identifier la font et la couleur utilisées
- Générer un favicon à partir de la **première lettre ou des initiales** du nom, en utilisant :
  - la couleur primaire du site comme fond
  - du texte blanc (ou la couleur contrastante du site)
  - la font du logo si possible, sinon une font system bold (Arial Black, sans-serif bold)

### Ce qui ne doit JAMAIS servir de source :
- Le favicon actuel du projet (potentiellement celui de Replit)
- Un fichier `favicon.ico` ou `favicon.png` déjà présent sans vérification qu'il correspond au client
- Une image/icône par défaut d'un framework ou template
- Le logo Replit sous quelque forme que ce soit

---

## Étape 2.3 — Phase 3 : Générer les favicons

À partir du logo détecté à l'étape 2.2, générer **tous** les fichiers suivants :

| Fichier | Taille | Usage |
|---------|--------|-------|
| `favicon.ico` | contient 16×16 et 32×32 | Navigateurs classiques |
| `favicon-16x16.png` | 16×16 | Balise link |
| `favicon-32x32.png` | 32×32 | Balise link |
| `apple-touch-icon.png` | 180×180 | iOS Safari |
| `android-chrome-192x192.png` | 192×192 | Android / PWA |
| `android-chrome-512x512.png` | 512×512 | Android / PWA splash |

### Méthode de génération

**Si le logo est un SVG :**
```javascript
const sharp = require('sharp');

// Convertir le SVG en PNG haute résolution d'abord
const svgBuffer = fs.readFileSync('path/to/logo.svg');

// Générer chaque taille
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svgBuffer, { density: 300 })  // haute densité pour SVG
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`public/${name}`);
}
```

**Si le logo est un PNG/JPG :**
```javascript
for (const { name, size } of sizes) {
  await sharp('path/to/logo.png')
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`public/${name}`);
}
```

**Si le logo est du texte uniquement (Priorité 5) :**
```javascript
// Générer un SVG avec les initiales
const initials = 'AB'; // extraire du nom du client
const bgColor = '#4338CA'; // couleur primaire du site
const svgText = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="${bgColor}"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, sans-serif" font-weight="900" font-size="280" fill="white">
    ${initials}
  </text>
</svg>`;

const svgBuffer = Buffer.from(svgText);
// Puis générer toutes les tailles avec sharp comme ci-dessus
```

**Génération du favicon.ico :**
```javascript
// favicon.ico nécessite le format ICO — utiliser png-to-ico ou to-ico si disponible
// Sinon, simplement copier le favicon-32x32.png comme favicon.ico (accepté par les navigateurs modernes)
fs.copyFileSync('public/favicon-32x32.png', 'public/favicon.ico');
```

### Règles de génération
- `fit: 'contain'` = le logo entier est visible, pas coupé
- Fond transparent par défaut
- Si le logo est trop allongé horizontalement (ratio > 2:1), utiliser plutôt un **symbole**, une **icône** ou les **initiales** plutôt que le logo complet écrasé
- Vérifier visuellement que le favicon 16×16 est lisible — si le logo est trop détaillé, simplifier en utilisant les initiales

---

## Étape 2.4 — Phase 4 : Balises HTML, manifest et CACHE-BUSTING

**Supprimer toutes les balises favicon existantes** dans le `<head>`, puis ajouter les nouvelles balises **avec un paramètre de cache-busting** pour forcer les navigateurs à recharger le favicon (le cache du favicon est particulièrement agressif).

### Méthode de cache-busting

Générer un timestamp ou un hash court à la génération :

```javascript
const cacheBust = Date.now().toString(36); // ex: "lxyz12ab"
// ou mieux, un hash du contenu du fichier favicon pour invalider seulement si le fichier change
```

### Balises à ajouter

```html
<!-- Favicons — cache-busted -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=CACHEBUST">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=CACHEBUST">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=CACHEBUST">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=CACHEBUST">
<link rel="manifest" href="/site.webmanifest?v=CACHEBUST">
<meta name="theme-color" content="#XXXXXX">
```

Remplacer `CACHEBUST` par la vraie valeur générée. Le paramètre `?v=` n'affecte pas le fichier servi mais force le navigateur à ignorer son cache.

### Fichier `/public/site.webmanifest` :

```json
{
  "name": "Nom du site",
  "short_name": "NomCourt",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#XXXXXX",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

### Règles
- Remplacer `#XXXXXX` par la vraie couleur primaire détectée dans le CSS/design system du projet
- Remplacer `"Nom du site"` et `"NomCourt"` par les vraies valeurs trouvées dans le projet (title, header, config, etc.)
- Ne jamais laisser de valeur entre crochets dans le code déployé
- Ne pas dupliquer les balises — supprimer les anciennes avant d'ajouter les nouvelles

---

## Étape 2.5 — Phase 5 : Vérification post-génération (DOUBLE FAIL-SAFE)

Après génération, effectuer **deux niveaux de vérification** :

### Vérification niveau 1 — Fichiers et balises
- [ ] Le fichier `/public/favicon.ico` existe et n'est PAS le favicon Replit
- [ ] Le fichier `/public/apple-touch-icon.png` montre le logo du client
- [ ] Ouvrir mentalement chaque fichier généré : correspond-il au logo/identité du client ?
- [ ] Les balises `<link>` dans le `<head>` pointent vers les bons fichiers avec `?v=` cache-bust
- [ ] Aucune ancienne balise favicon ne traîne dans le `<head>`
- [ ] Le `site.webmanifest` est valide et accessible

### Vérification niveau 2 — Recherche finale anti-Replit
Lancer une dernière recherche globale :

```bash
# 1. Aucun fichier favicon inconnu ne doit rester
find . -type f \( -iname "favicon*" -o -iname "apple-touch-icon*" -o -iname "android-chrome*" \) \
  -not -path "./node_modules/*" -not -path "./.git/*"
# → Vérifier que cette liste ne contient QUE les fichiers générés à l'étape 2.3

# 2. Aucune balise favicon résiduelle avec un mauvais chemin
grep -rn "rel=\"icon\"" --include="*.html" --include="*.tsx" --include="*.jsx" --include="*.astro" --include="*.vue" .
# → Chaque occurrence doit pointer vers les nouveaux fichiers avec ?v=CACHEBUST

# 3. Recherche anti-Replit spécifique au favicon
grep -rn -i "replit" --include="*.html" --include="*.ico" --include="*.png" .
# → Zéro résultat côté client
```

### Vérification niveau 3 — Simulation runtime
Si possible, lancer un build et servir le site localement, puis :
- [ ] Ouvrir la console → Network → filtrer `favicon` : vérifier que seuls les bons fichiers sont chargés
- [ ] Vérifier que le favicon affiché dans l'onglet est bien celui du client (si besoin, ouvrir en navigation privée pour contourner le cache)

---

# PARTIE 3 — GTM & TRACKING

## Étape 3.1 — Installation de Google Tag Manager

Intégrer le snippet GTM dans le projet.

### Dans le `<head>` (le plus haut possible) :

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

### Juste après `<body>` :

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->
```

### Règles
- `GTM-XXXXXXX` est un placeholder — laisser un commentaire `<!-- TODO: remplacer GTM-XXXXXXX par l'ID réel du conteneur GTM -->`
- Si le framework utilise un layout/template global (ex: `_app.tsx`, `layout.tsx`, `index.html`), intégrer là
- Si un GTM existe déjà, le signaler et ne pas dupliquer
- S'assurer que le snippet est chargé sur **toutes les pages**

## Étape 3.2 — DataLayer de base

Initialiser le dataLayer et préparer un tracking minimal. L'objectif n'est pas un tracking avancé mais simplement de **préparer la structure** pour que les événements de base remontent dans GTM/GA4 dès la mise en production.

### Initialisation (avant le snippet GTM) :

```html
<script>
  window.dataLayer = window.dataLayer || [];
</script>
```

### Événements de base à implémenter :

**1. Soumission de formulaire — `form_submit`**

Sur chaque formulaire du site, au moment de la soumission réussie, ajouter un simple push :

```javascript
window.dataLayer.push({
  event: 'form_submit',
  form_name: 'contact'  // adapter au nom réel : 'contact', 'devis', 'newsletter', etc.
});
```

- Détecter les formulaires du projet et ajouter le push dans le callback de succès
- Adapter `form_name` à ce que le formulaire fait réellement
- C'est tout — pas besoin de plus de paramètres pour le tracking de base

**2. Clics téléphone et email — `cta_click`**

Sur les liens `tel:` et `mailto:`, ajouter un push au clic :

```javascript
window.dataLayer.push({
  event: 'cta_click',
  click_type: 'phone' // ou 'email'
});
```

- Scanner le projet pour les `<a href="tel:...">` et `<a href="mailto:...">`
- Ajouter un event listener `click` simple
- Ne pas casser le comportement natif du lien

### Implémentation simple

Pas besoin d'un fichier utilitaire séparé si le projet est petit. Ajouter les `dataLayer.push()` directement là où les événements se produisent :
- dans le handler `onSubmit` du formulaire
- en `onClick` sur les liens tel/mailto

Si le projet a **3+ formulaires ou beaucoup de liens tel/mailto**, créer un petit helper :

```javascript
// tracking.js
export function trackEvent(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}
```

### Récapitulatif tracking à produire

Après implémentation, lister dans le récapitulatif technique :
- les formulaires détectés et leur `form_name`
- les liens tel/mailto détectés
- les fichiers modifiés

---

# PARTIE 4 — ACCESSIBILITÉ DE BASE

## Étape 4.1 — Audit et corrections

Scanner le projet et corriger :

### Images
- **Chaque `<img>` doit avoir un attribut `alt`**
- Si l'image est décorative : `alt=""`
- Si l'image est informative : `alt` descriptif et pertinent
- Les images de fond CSS n'ont pas besoin de `alt` mais si elles véhiculent du sens, ajouter un `aria-label` sur le conteneur

### Formulaires
- Chaque champ `<input>`, `<textarea>`, `<select>` doit avoir un `<label>` associé (via `for`/`id`) ou un `aria-label`
- Les boutons de soumission doivent avoir un texte explicite
- Les messages d'erreur doivent être liés au champ via `aria-describedby` si possible

### Structure des headings
- Vérifier qu'il y a **un seul `<h1>` par page**
- La hiérarchie doit être logique : h1 → h2 → h3 (pas de saut h1 → h3)
- Signaler les anomalies sans forcément les corriger si c'est un choix de design

### Navigation
- Le `<nav>` principal doit avoir un `aria-label` si plusieurs `<nav>` existent
- Les liens doivent avoir un texte explicite (pas de "cliquez ici" seul)
- Vérifier que le focus clavier fonctionne sur les éléments interactifs

### Règles
- **Ne pas casser le design** en ajoutant l'accessibilité
- Les corrections doivent être discrètes et non intrusives
- Signaler dans le récapitulatif les problèmes détectés et ceux corrigés

---

# PARTIE 5 — PERFORMANCE & CORE WEB VITALS

## Cibles Core Web Vitals à atteindre

Le site livré doit viser les seuils **"Good"** des Core Web Vitals de Google (valeurs mesurées en conditions réelles / field data) :

| Métrique | Bon | À améliorer | Mauvais |
|----------|-----|-------------|---------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5s – 4.0s | > 4.0s |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200ms – 500ms | > 500ms |

### Leviers principaux par métrique

**LCP — optimiser l'élément le plus grand au chargement :**
- Identifier l'élément LCP de la page d'accueil (hero image, titre, vidéo)
- Si c'est une image : utiliser `fetchpriority="high"`, format WebP, taille adaptée
- Précharger les ressources critiques avec `<link rel="preload">`
- Serveur rapide (TTFB < 600ms idéalement)
- Fonts : `font-display: swap` + preconnect (voir 5.4)

**CLS — éviter les décalages visuels :**
- `width` et `height` explicites sur **toutes** les images et vidéos
- Réserver l'espace pour les publicités et embeds (iframe Youtube, etc.)
- Ne pas injecter de contenu au-dessus du contenu existant sans user action
- `font-display: optional` ou `swap` avec fallback bien configuré pour limiter le FOUT/FOIT

**INP — optimiser la réactivité des interactions :**
- Limiter le JS bloquant le thread principal
- Éviter les gros handlers `onClick`/`onInput` synchrones
- Utiliser `requestIdleCallback` ou `setTimeout` pour découper les traitements lourds
- Limiter les re-renders inutiles (React : `useMemo`, `useCallback`, listes virtualisées au-delà de 100 items)
- Debounce/throttle sur les événements fréquents (scroll, resize, input)

### Mesure

Si `lighthouse` ou `web-vitals` est disponible dans l'environnement :
- Lancer un audit Lighthouse sur la page d'accueil et 2-3 pages clés
- Noter les scores Performance, Accessibility, Best Practices, SEO
- Joindre les résultats au récapitulatif final

Si pas d'outil disponible : signaler dans le récap les risques identifiés visuellement (images lourdes non lazy, fonts non optimisées, JS bloquant).

---

## Étape 5.1 — Compression et optimisation des images

### Audit des images
- Scanner **tous** les dossiers du projet contenant des images : `/public/`, `/assets/`, `/images/`, `/src/assets/`, `/uploads/`, et tout sous-dossier pertinent
- Lister toutes les images avec leur taille, format et dimensions
- Identifier les images problématiques :
  - **> 500KB** = critique, compression obligatoire
  - **200KB – 500KB** = à optimiser
  - **< 200KB** = acceptable, optimiser si facile
  - **Dimensions > 2000px** sur un côté = redimensionner (sauf si c'est l'image OG ou un fond plein écran)

### Compression obligatoire
Pour **chaque image du projet**, appliquer le traitement suivant :

**1. Conversion de format :**
- Convertir toutes les images PNG et JPG en **WebP** (meilleur rapport qualité/poids)
- Conserver l'original en fallback si le framework ne gère pas WebP nativement
- Les SVG restent en SVG (déjà optimisés vectoriellement)
- Les GIF animés restent en GIF ou sont convertis en WebP animé si supporté

**2. Redimensionnement :**
- Images de contenu (illustrations, photos) : max **1600px** sur le côté le plus long
- Images de hero/bannière : max **1920px** de large
- Thumbnails / cards : max **800px** de large
- Logos : max **400px** de large
- Image OG : exactement **1200×630px**
- Ne jamais upscaler une image plus petite que la cible

**3. Qualité de compression :**
- WebP : qualité **80** (excellent compromis qualité/poids)
- JPEG (fallback) : qualité **85**
- PNG (si conservation nécessaire, ex: logo avec transparence) : optimiser avec compression maximale sans perte

**4. Outil recommandé :**
```javascript
// Utiliser sharp (déjà dispo ou installable via npm)
const sharp = require('sharp');

// Exemple de compression image
await sharp('input.jpg')
  .resize(1600, null, { withoutEnlargement: true }) // max 1600px largeur, pas d'upscale
  .webp({ quality: 80 })
  .toFile('output.webp');

// Exemple pour PNG avec transparence
await sharp('logo.png')
  .resize(400, null, { withoutEnlargement: true })
  .webp({ quality: 85, alphaQuality: 90 })
  .toFile('logo.webp');
```

**5. Mise à jour des références :**
- Après conversion, mettre à jour **toutes** les références dans le code (composants, CSS, HTML)
- Si le framework supporte `<picture>` :
```html
<picture>
  <source srcset="/images/photo.webp" type="image/webp">
  <img src="/images/photo.jpg" alt="Description" loading="lazy" width="800" height="600">
</picture>
```
- Si le projet utilise un framework (Next.js, etc.) avec un composant Image optimisé, l'utiliser

**6. Suppression des originaux :**
- Une fois les versions optimisées en place et les références mises à jour, supprimer les originaux lourds pour économiser de l'espace
- Ne pas supprimer les originaux si le framework en a besoin pour le build

### Résultat attendu
Après optimisation, **aucune image du site ne devrait dépasser 200KB** sauf cas exceptionnel justifié (image hero plein écran haute qualité, max 400KB).

---

## Étape 5.2 — Compression et optimisation des vidéos

### Audit des vidéos
- Scanner le projet pour toutes les vidéos : `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`
- Lister chaque vidéo avec sa taille, durée, résolution et codec
- Identifier les vidéos problématiques :
  - **> 10MB** = critique, compression obligatoire
  - **5MB – 10MB** = à optimiser
  - **< 5MB** = acceptable pour une vidéo courte

### Compression obligatoire
Pour **chaque vidéo locale** du projet :

**1. Conversion de format :**
- Format cible : **MP4 (H.264)** — compatibilité universelle
- Si le navigateur cible est moderne et que le framework le permet, proposer aussi **WebM (VP9)** comme source alternative (meilleur compression)

**2. Redimensionnement :**
- Vidéos de fond / hero : max **1920×1080** (1080p)
- Vidéos de contenu intégré : max **1280×720** (720p)
- Vidéos décoratives courtes (loops, animations) : max **854×480** (480p)
- Ne jamais upscaler

**3. Paramètres de compression :**
```bash
# Compression MP4 avec ffmpeg
ffmpeg -i input.mp4 \
  -vcodec libx264 \
  -crf 28 \
  -preset slow \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -acodec aac -b:a 128k \
  -movflags +faststart \
  output.mp4

# Version WebM alternative (meilleure compression)
ffmpeg -i input.mp4 \
  -vcodec libvpx-vp9 \
  -crf 32 -b:v 0 \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -acodec libopus -b:a 128k \
  output.webm

# Vidéo décorative sans son (loop de fond)
ffmpeg -i input.mp4 \
  -vcodec libx264 \
  -crf 30 \
  -preset slow \
  -an \
  -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
  -movflags +faststart \
  output.mp4
```

**4. Options importantes :**
- `-movflags +faststart` : permet le streaming progressif (la vidéo commence avant d'être entièrement téléchargée)
- `-crf 28` (MP4) / `-crf 32` (WebM) : excellent compromis qualité/poids
- `-an` : supprimer l'audio pour les vidéos décoratives (gain de poids important)
- `-preset slow` : meilleure compression au prix d'un encodage plus lent

**5. Balises HTML optimisées :**
```html
<!-- Vidéo avec sources multiples -->
<video autoplay muted loop playsinline preload="metadata" poster="/images/video-poster.webp">
  <source src="/videos/hero.webm" type="video/webm">
  <source src="/videos/hero.mp4" type="video/mp4">
</video>
```

**6. Recommandation vidéos longues ou lourdes :**
- Si une vidéo dépasse **20MB** même après compression, recommander de l'héberger sur un service externe (YouTube, Vimeo, Bunny.net) et l'intégrer en embed
- Cela économise la bande passante et l'espace de stockage
- Signaler cette recommandation dans le récapitulatif

### Vérification disponibilité de ffmpeg
- Avant de compresser des vidéos, vérifier si `ffmpeg` est disponible dans l'environnement : `which ffmpeg`
- Si `ffmpeg` n'est pas disponible, signaler dans le récapitulatif les vidéos à compresser manuellement avec leurs paramètres recommandés
- Ne pas tenter d'installer ffmpeg si ce n'est pas disponible nativement

---

## Étape 5.3 — Attributs de chargement optimisés

### Images
- Ajouter `loading="lazy"` sur toutes les images **sauf** celles au-dessus de la ligne de flottaison (hero, header, logo)
- Ajouter `fetchpriority="high"` sur l'image LCP (hero principal) pour améliorer le LCP
- Ajouter `width` et `height` explicites sur chaque `<img>` pour éviter le layout shift (CLS)
- Ajouter `decoding="async"` sur les images non critiques

### Vidéos
- Ajouter `preload="metadata"` (pas `preload="auto"` — trop lourd)
- Ajouter `poster="..."` avec une image WebP légère extraite de la première frame
- Pour les vidéos décoratives : `autoplay muted loop playsinline`
- Réserver l'espace avec `width` et `height` ou un `aspect-ratio` CSS pour éviter le CLS

---

## Étape 5.4 — Fonts

- Vérifier que les fonts sont chargées avec `font-display: swap`
- Si des fonts sont chargées depuis Google Fonts, vérifier le `<link rel="preconnect">` vers `https://fonts.googleapis.com` et `https://fonts.gstatic.com` (crossorigin)
- Pour les fonts locales critiques, ajouter `<link rel="preload" as="font" type="font/woff2" crossorigin>`
- Signaler les fonts non utilisées
- Limiter le nombre de poids/styles chargés (idéalement 2-3 max par famille)

---

## Étape 5.5 — Récapitulatif performance

Après optimisation, produire un tableau récapitulatif :

```
| Fichier | Avant | Après | Réduction | Format |
|---------|-------|-------|-----------|--------|
| hero.jpg | 1.2MB | 180KB | -85% | → WebP |
| logo.png | 340KB | 45KB | -87% | → WebP |
| bg-video.mp4 | 25MB | 4.2MB | -83% | H.264 recompressé |
```

Ce tableau est inclus dans le récapitulatif technique final.

### Règles générales
- Ne pas dégrader visiblement la qualité — si une compression rend l'image floue ou pixelisée, augmenter la qualité
- Ne pas sur-optimiser les images déjà légères (< 50KB)
- Toujours vérifier le rendu visuel après compression
- Les optimisations lourdes (code splitting, tree shaking, etc.) ne font pas partie de ce prompt

---

# PARTIE 6 — SÉCURITÉ HTTP

## Règle de prudence sécurité

Ajouter des headers trop stricts peut casser le site (ex: CSP trop restrictive bloque GTM, fonts externes, images CDN). L'objectif est donc de **protéger sans casser**, avec une approche graduelle.

---

## Étape 6.1 — Headers de sécurité essentiels

Selon la plateforme de déploiement (Next.js, Express, Cloudflare, Netlify, Vercel, Replit), configurer ces headers HTTP :

### Headers obligatoires

**1. `Strict-Transport-Security` (HSTS)**
Force le navigateur à n'utiliser que HTTPS.
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
⚠️ Ne l'activer qu'une fois certain que le site fonctionne entièrement en HTTPS, sinon cela peut bloquer l'accès.

**2. `X-Content-Type-Options`**
Empêche le navigateur de deviner le type MIME.
```
X-Content-Type-Options: nosniff
```

**3. `X-Frame-Options`**
Empêche le site d'être intégré en iframe (protection anti-clickjacking).
```
X-Frame-Options: SAMEORIGIN
```
Ou utiliser `frame-ancestors` dans la CSP (plus moderne).

**4. `Referrer-Policy`**
Contrôle les informations envoyées dans l'en-tête Referer.
```
Referrer-Policy: strict-origin-when-cross-origin
```

**5. `Permissions-Policy`**
Désactive les API non utilisées (caméra, micro, géoloc, etc.).
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```
Adapter si le site a un besoin légitime d'une de ces API.

---

## Étape 6.2 — Content Security Policy (CSP)

**La CSP est l'étape la plus délicate.** Une CSP trop stricte casse le site. Adopter une approche **Report-Only puis Enforce**.

### Approche recommandée

**1. Démarrer en mode Report-Only :**
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; frame-src https://www.googletagmanager.com;
```

Ce mode journalise les violations sans les bloquer. Permet de détecter les ressources légitimes qui seraient bloquées par erreur.

**2. Adapter selon les scripts tiers détectés :**
- **GTM / GA4** : ajouter `https://www.googletagmanager.com` et `https://www.google-analytics.com`
- **Google Fonts** : ajouter `https://fonts.googleapis.com` (style) et `https://fonts.gstatic.com` (font)
- **YouTube embeds** : ajouter `https://www.youtube.com` en `frame-src`
- **Google Maps** : ajouter `https://maps.googleapis.com` et les domaines associés
- **reCAPTCHA** : ajouter `https://www.google.com/recaptcha/` et `https://www.gstatic.com`
- **Stripe / paiement** : ajouter les domaines Stripe selon leur doc
- **Hotjar / Clarity / outils d'analytics** : ajouter leurs domaines respectifs

**3. Passer en Enforce seulement après validation :**
Quand aucune violation légitime n'est journalisée depuis plusieurs jours, passer de `Content-Security-Policy-Report-Only` à `Content-Security-Policy`.

### Template CSP de départ (Report-Only)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com;
frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://player.vimeo.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self';
upgrade-insecure-requests;
```

### Règles CSP
- **Ne jamais activer une CSP stricte sans avoir testé en Report-Only avant**
- Adapter la CSP aux outils **réellement détectés** dans le projet, pas au template générique
- Si des scripts inline ou eval sont utilisés par le framework (souvent le cas en dev), garder `'unsafe-inline'` et `'unsafe-eval'` en attendant d'implémenter des nonces/hashes
- Documenter la CSP choisie dans le récapitulatif final

---

## Étape 6.3 — Implémentation selon la plateforme

### Next.js (next.config.js)
```javascript
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; ..." },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

### Express (Node.js)
Utiliser `helmet` (lib standard) :
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: { /* ... config CSP ... */ },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

### Netlify / Vercel
Via `_headers` (Netlify) ou `vercel.json` :
```
# _headers (Netlify)
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Replit (serveur Express custom)
Idem Express avec `helmet`.
Si Replit sert le site via un serveur par défaut (ex: simple static), envisager un petit serveur Express custom pour appliquer les headers.

---

## Étape 6.4 — Vérification finale sécurité HTTP

Une fois les headers configurés, tester :
- [ ] Ouvrir DevTools → Network → cliquer sur la requête principale → vérifier les headers de réponse
- [ ] Utiliser un outil externe si dispo (ex: `securityheaders.com`) pour scorer le site (cible : A ou A+)
- [ ] Vérifier que le site fonctionne normalement (aucun script bloqué, aucune erreur CSP en console)
- [ ] Documenter dans le récapitulatif : headers appliqués, CSP en mode Report-Only ou Enforce, outils tiers whitelistés

---

# PARTIE 7 — VÉRIFICATIONS TECHNIQUES

## Étape 7.1 — Page 404

- Vérifier si une page 404 personnalisée existe
- Si elle n'existe pas, en créer une :
  - cohérente avec le design du site (header/footer existants)
  - message clair : "Page introuvable"
  - lien de retour vers l'accueil
  - pas de style par défaut du framework visible
- Si elle existe, vérifier qu'elle est fonctionnelle et cohérente

## Étape 7.2 — Liens morts et redirections

- Scanner les liens internes de la navigation et du footer
- Vérifier qu'aucun lien ne pointe vers une route inexistante
- Signaler les liens externes qui semblent cassés ou suspects
- Si des routes ont changé, proposer des redirections

## Étape 7.3 — Formulaires

- Vérifier que chaque formulaire a :
  - une validation côté client (champs requis, format email, etc.)
  - un message de confirmation après envoi réussi
  - un message d'erreur en cas d'échec
  - une protection anti-spam si pertinent (honeypot, captcha, rate limiting)
- Signaler les formulaires qui envoient vers nulle part ou dont l'action n'est pas configurée

---

# PARTIE 8 — PAGES LÉGALES

## Règle de prudence juridique

Le but n'est **pas** de prétendre offrir une immunité juridique absolue.
Le but est de :
- renforcer la transparence du site ;
- cadrer l'usage du site et des contenus ;
- rappeler que le client doit disposer des droits nécessaires sur les contenus fournis ;
- limiter autant que possible l'exposition du prestataire ;
- documenter la collecte de données personnelles et l'usage des cookies.

Ces pages doivent être **génériques mais crédibles**, rédigées en français propre, simple, professionnel.

---

## Étape 8.1 — Audit du projet avant écriture des pages légales

Analyser le projet et dresser la liste **réelle** de ce qui est détecté :

### A. Informations entreprise/site déjà présentes
- nom commercial ;
- raison sociale ;
- forme juridique ;
- BCE / numéro d'entreprise ;
- numéro de TVA ;
- adresse ;
- email ;
- téléphone ;
- directeur de publication / responsable ;
- hébergeur / plateforme / nom de domaine si identifiable ;
- pays principal visé ;
- langue(s) du site.

### B. Collectes de données réellement présentes
Repérer si le site contient :
- formulaire de contact ;
- formulaire de devis ;
- réservation / prise de rendez-vous ;
- newsletter ;
- compte utilisateur ;
- paiement ;
- upload de fichiers ;
- chat widget ;
- pixel marketing ;
- Google Tag Manager ;
- Google Analytics ;
- Meta Pixel ;
- LinkedIn Insight Tag ;
- Hotjar / Microsoft Clarity / autre session replay ;
- embeds YouTube / Vimeo ;
- Google Maps ;
- reCAPTCHA / Cloudflare Turnstile ;
- CRM (HubSpot, etc.) ;
- outils email / automation ;
- outils de consentement cookies.

### C. Cookies et traceurs
Distinguer :
- cookies strictement nécessaires ;
- cookies de mesure d'audience ;
- cookies fonctionnels ;
- cookies publicitaires / marketing ;
- contenus tiers déposant potentiellement des traceurs.

### D. Structure existante du footer
Vérifier si les liens suivants existent déjà :
- mentions légales ;
- confidentialité ;
- cookies ;
- gestion des cookies ;
- copyright ;
- crédit agence.

---

## Étape 8.2 — Créer les pages nécessaires

Créer uniquement si absent, sinon compléter / corriger la version existante.

### Pages à prévoir
1. `/mentions-legales`
2. `/politique-de-confidentialite` ou `/confidentialite`
3. `/politique-de-cookies` ou `/cookies`
4. si un CMP ou une logique maison existe : action/lien `Gérer mes cookies`

### Exigence de cohérence
Les textes doivent refléter **ce que le site fait vraiment**.
Exemples :
- pas de mention de newsletter si aucune newsletter n'existe ;
- pas de mention de paiement si aucun paiement n'existe ;
- pas de mention de Meta Pixel si aucun script Meta n'est détecté ;
- pas de mention de vidéo embarquée si le site n'en utilise pas.

Si des intégrations sont ambiguës mais probables, **ne pas les mentionner sur le site**. Les signaler uniquement dans le récapitulatif technique final destiné à l'agence.

---

## Étape 8.3 — Contenu attendu pour chaque page

### 1) Mentions légales

Créer une page standard avec sections courtes et lisibles.

#### Sections minimales

**Éditeur du site**
Pour chaque champ ci-dessous, **chercher la valeur dans le projet** (config, footer, contact, header, composants, variables d'env). Si la valeur est trouvée, l'afficher. **Si elle est introuvable, ne pas afficher la ligne du tout.** Ne jamais écrire de texte entre crochets.

Champs à chercher et afficher si trouvés :
- Nom commercial
- Raison sociale
- Forme juridique
- Adresse complète
- Email
- Téléphone
- Numéro BCE
- Numéro de TVA
- Responsable de publication

**Hébergement**
**Ne JAMAIS mentionner Replit.** Utiliser systématiquement :
```
Ce site est hébergé sur une infrastructure cloud sécurisée.
```
Si un vrai hébergeur tiers est identifiable (Cloudflare, OVH, etc.), le mentionner à la place.

**Objet du site**
Décrire sobrement la fonction du site :
- présentation de services ;
- prise de contact ;
- réservation ;
- collecte de demandes ;
- vente en ligne si applicable ;
- information commerciale.

**Propriété intellectuelle**
Inclure un texte standard couvrant :
- structure du site, textes, éléments graphiques, logos, photos, vidéos, illustrations, code, marques, base de données si pertinent.

Le texte doit rappeler que :
- ces éléments sont protégés par les droits de propriété intellectuelle ;
- toute reproduction non autorisée peut être interdite ;
- les contenus appartenant à des tiers restent la propriété de leurs titulaires respectifs ;
- les utilisateurs doivent disposer des droits nécessaires pour tout contenu qu'ils transmettent.

**Responsabilité sur les contenus fournis par le client**
Section explicite indiquant que :
- le client qui fournit des contenus garantit disposer des droits nécessaires ;
- il garantit que les contenus ne portent pas atteinte aux droits de tiers ;
- il reste responsable des informations, visuels, textes et médias qu'il fournit ou valide ;
- le prestataire ne peut être tenu responsable des contenus fournis par le client.

**Droit de retrait / suspension**
Clause standard indiquant que l'éditeur ou le prestataire technique peut retirer, suspendre ou désactiver tout contenu manifestement illicite.

**Usage autorisé du site**
Bloc interdisant :
- l'usage à des fins illégales ;
- la tentative d'intrusion ou de perturbation ;
- l'envoi de spam ;
- l'usurpation d'identité ;
- l'exploitation non autorisée des contenus ;
- l'introduction de contenus malveillants.

**Limitation de responsabilité**
Bloc mesuré indiquant que :
- les informations sont fournies à titre indicatif ;
- l'éditeur ne garantit pas l'absence totale d'erreur ou d'interruption ;
- cette limitation s'applique dans les limites du droit applicable.

**Liens externes**
Mention que le site peut renvoyer vers des services tiers non maîtrisés.

**Droit applicable**
- Droit belge applicable ;
- Juridictions de l'arrondissement du siège social.

---

### 2) Politique de confidentialité

Structure attendue :

**Identité du responsable du traitement**
Utiliser les informations détectées. Si le rôle exact du prestataire doit être distingué, utiliser une formulation prudente.

**Données collectées**
Lister uniquement ce qui est réellement plausible.

**Finalités**
Exemples à n'utiliser que si pertinents :
- répondre aux demandes ;
- gérer un rendez-vous ou une réservation ;
- exécuter une commande ;
- assurer le suivi commercial ;
- améliorer le site ;
- mesurer l'audience ;
- assurer la sécurité ;
- respecter des obligations légales.

**Bases juridiques**
Associer les bases juridiques usuelles :
- consentement ;
- exécution précontractuelle ou contractuelle ;
- intérêt légitime ;
- obligation légale.

**Destinataires / sous-traitants**
Lister de manière générique mais honnête les catégories de destinataires détectés (ex: "prestataire d'hébergement", "outil de mesure d'audience"). **Ne pas inventer de noms. Si un nom exact n'est pas certain, utiliser la catégorie générique sans crochets ni placeholder.**

**Durées de conservation**
Durées génériques prudentes.

**Droits des personnes**
Au minimum : accès, rectification, effacement, limitation, opposition, retrait du consentement, réclamation auprès de l'APD.

**Transferts hors UE**
Si des outils américains sont détectés, formulation prudente.

**Sécurité**
Rappeler les mesures raisonnables sans promettre une sécurité absolue.

**Mise à jour**
Date de dernière mise à jour.

---

### 3) Politique de cookies

Structure attendue :

**Définition**
Expliquer ce qu'est un cookie.

**Catégories utilisées**
N'utiliser que les catégories pertinentes :
- strictement nécessaires ;
- fonctionnels ;
- mesure d'audience ;
- marketing/publicitaires ;
- contenus tiers.

**Tableau des cookies**
Structure lisible avec : catégorie, finalité, base (consentement ou nécessité), durée indicative, prestataire si identifiable.

**Consentement**
- Les cookies non strictement nécessaires ne sont pas obligatoires ;
- Un refus doit rester possible ;
- Pas de formulation trompeuse.

Si aucune bannière n'existe alors que des cookies non nécessaires sont détectés, le signaler dans le récapitulatif.

---

# PARTIE 9 — FOOTER & NAVIGATION

## Étape 9.1 — Liens légaux dans le footer

Ajouter les liens légaux de manière discrète et propre :
- Mentions légales
- Confidentialité
- Cookies
- Gérer mes cookies (si pertinent)

Conserver le design existant. Ne pas casser le responsive.

## Étape 9.2 — Crédit madebydone.be

Appliquer la logique suivante **sans doublon de copyright** :

### Règles absolues
1. **NE PAS** ajouter une seconde ligne commençant par `©` si une ligne copyright existe déjà.
2. Si le footer contient déjà `© {année} {Client}. Tous droits réservés.` : garder cette ligne intacte.

### Méthode A — Préférée
Transformer la ligne existante en :
`© {année} {Client}. Tous droits réservés. • madebydone.be`

- `madebydone.be` = lien vers `https://madebydone.be`
- `target="_blank" rel="noopener noreferrer"`
- séparateur `•` discret

### Méthode B — Si la ligne principale ne peut pas être modifiée
Ajouter juste en dessous une ligne **sans `©`** :
`Site par madebydone.be`

Style discret : `text-xs`, opacité plus faible, hover plus visible.

### Validation footer
Après modification, le footer doit contenir :
- une seule occurrence de `©` maximum ;
- un crédit visible mais discret ;
- les liens légaux ;
- aucun doublon.

---

# PARTIE 10 — CONTRAINTES DE RÉDACTION

### Interdictions
- ne pas inventer de numéro BCE, TVA, adresse, DPO ou hébergeur ;
- ne pas écrire des affirmations factuelles non vérifiées ;
- ne pas prétendre que le site est "entièrement conforme juridiquement" ;
- ne pas copier-coller une politique qui mentionne des outils absents du projet ;
- ne pas écrire une clause manifestement abusive ;
- ne pas transformer la page en CGV complètes si le site n'en a pas besoin ;
- **ne jamais afficher de texte entre crochets, de placeholder ou de "à compléter" sur le site visible** ;
- **ne jamais mentionner Replit, Replit Inc., replit.com ou toute référence à Replit**.

### Obligations
- **omettre silencieusement** les champs dont l'information est introuvable plutôt que d'afficher un placeholder ;
- garder une rédaction humaine, claire et crédible ;
- adapter le texte au type de projet ;
- signaler dans le récapitulatif technique (destiné à l'agence, pas au visiteur) les informations manquantes ;
- signaler toute incohérence détectée.

---

# PARTIE 11 — LIVRABLES ET CHECKLIST FINALE

## Livrables attendus

1. Les pages légales créées ou mises à jour
2. Les liens footer vers ces pages
3. Le crédit `madebydone.be` correctement intégré
4. Le sitemap.xml généré
5. Le robots.txt généré
6. Les favicons générés et les balises HTML associées (avec cache-busting)
7. Le site.webmanifest
8. Le JSON-LD intégré
9. Le snippet GTM intégré
10. Le fichier de tracking (dataLayer) créé
11. Les balises meta/OG/Twitter Cards complétées
12. L'image OG générée
13. La page 404 créée ou vérifiée
14. Les corrections d'accessibilité appliquées
15. Les images compressées et converties en WebP
16. Les vidéos compressées (ou signalées avec paramètres recommandés)
17. Le tableau récapitulatif avant/après des médias optimisés
18. Les headers de sécurité HTTP configurés (HSTS, CSP Report-Only, etc.)
19. Le rapport Core Web Vitals (si outil disponible) ou les risques identifiés

## Checklist de contrôle qualité

À la fin de l'exécution, vérifier et cocher :

### Ré-audit
- [ ] Chaque étape a été évaluée : ✅ Conforme / ⚠️ Partiel / ❌ Absent
- [ ] Aucun travail existant conforme n'a été écrasé
- [ ] Aucun travail existant défaillant n'a été laissé en l'état

### SEO
- [ ] `<title>` unique sur chaque page
- [ ] `<meta description>` unique sur chaque page
- [ ] `<html lang="fr">` présent
- [ ] Canonical URL sur chaque page
- [ ] OpenGraph complet sur chaque page
- [ ] Twitter Cards complètes
- [ ] Image OG 1200×630 générée
- [ ] JSON-LD intégré sur la page d'accueil
- [ ] sitemap.xml accessible et valide
- [ ] robots.txt accessible et correct
- [ ] Toutes les URLs en HTTPS

### Favicon (double fail-safe)
- [ ] **Phase 1 effectuée** : purge préventive de tous les favicons existants
- [ ] **Ancien favicon Replit supprimé** (vérifié par recherche exhaustive)
- [ ] Logo source identifié (header, footer, assets, ou initiales générées)
- [ ] Tous les fichiers favicon générés à partir du vrai logo (16, 32, 180, 192, 512)
- [ ] favicon.ico présent et correspond au logo client
- [ ] apple-touch-icon présent et correspond au logo client
- [ ] site.webmanifest créé et référencé
- [ ] theme-color défini avec la couleur primaire du site
- [ ] Anciennes balises `<link rel="icon">` supprimées
- [ ] **Cache-busting appliqué** (`?v=` sur chaque balise favicon)
- [ ] **Phase 5 effectuée** : vérification niveau 1, 2 et 3 (fichiers, balises, recherche anti-Replit, simulation runtime si possible)
- [ ] Aucune trace du favicon Replit dans `/public/`, `/app/`, ni dans le `<head>`

### Tracking
- [ ] Snippet GTM intégré (head + body)
- [ ] dataLayer initialisé
- [ ] Événement form_submit sur chaque formulaire
- [ ] Événement cta_click sur les liens tel/mailto
- [ ] GTM-XXXXXXX signalé dans le récapitulatif

### Accessibilité
- [ ] Attributs alt sur toutes les images
- [ ] Labels sur tous les champs de formulaire
- [ ] Hiérarchie des headings cohérente (un seul h1)
- [ ] Navigation accessible au clavier

### Performance & Core Web Vitals
- [ ] Toutes les images scannées et listées avec leur poids
- [ ] Images converties en WebP (ou format optimisé)
- [ ] Images redimensionnées selon les seuils (1600px contenu, 1920px hero, 800px cards)
- [ ] **Aucune image > 200KB** (sauf hero justifié max 400KB)
- [ ] Références mises à jour dans le code après conversion
- [ ] Vidéos compressées (H.264/VP9, CRF 28-32)
- [ ] Vidéos décoratives sans audio (`-an`)
- [ ] Vidéos > 20MB signalées pour hébergement externe
- [ ] `loading="lazy"` sur les images sous le fold
- [ ] `fetchpriority="high"` sur l'image LCP
- [ ] `width` et `height` explicites sur toutes les images (anti-CLS)
- [ ] `preload="metadata"` + `poster` sur les vidéos
- [ ] `font-display: swap` sur les fonts
- [ ] `preconnect` pour les fonts externes
- [ ] Lighthouse score noté (si outil dispo) ou risques CWV identifiés
- [ ] Tableau récapitulatif avant/après inclus dans le rapport

### Sécurité HTTP
- [ ] `Strict-Transport-Security` configuré
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options` ou `frame-ancestors` configuré
- [ ] `Referrer-Policy` configuré
- [ ] `Permissions-Policy` configuré (caméra, micro, géoloc désactivés si non utilisés)
- [ ] CSP en mode Report-Only activée (whitelist des outils tiers détectés)
- [ ] Site testé : aucun script légitime bloqué
- [ ] Headers visibles dans DevTools → Network

### Technique
- [ ] Page 404 personnalisée et fonctionnelle
- [ ] Liens internes vérifiés (aucun lien mort)
- [ ] Formulaires avec validation + message de confirmation
- [ ] Aucun mixed content HTTP/HTTPS

### Légal
- [ ] Pages légales accessibles
- [ ] Footer mis à jour
- [ ] Aucun doublon copyright
- [ ] Mentions légales cohérentes
- [ ] Confidentialité cohérente avec formulaires et scripts détectés
- [ ] Cookies cohérents avec les traceurs détectés
- [ ] **Aucun texte entre crochets / placeholder visible sur le site**
- [ ] Aucune promesse juridique absolue

### Nettoyage Replit
- [ ] Aucune mention de Replit visible sur le site
- [ ] Aucune mention de Replit dans le code source côté client
- [ ] Aucun fichier Replit accessible publiquement
- [ ] Section hébergement des mentions légales sans Replit
- [ ] Recherche globale "replit" / "repl.co" / "repl.dev" effectuée — zéro résultat côté client

### Récapitulatif final
- [ ] Routes créées listées
- [ ] Fichiers modifiés listés
- [ ] Scripts/outils détectés listés
- [ ] Décisions de ré-audit listées (conforme / partiel / absent par étape)
- [ ] **Informations manquantes listées** (destiné à l'agence, pas visible sur le site)
- [ ] Points de vigilance signalés
- [ ] Build OK

---

## Bonus intelligent si la structure du projet le permet

Si le projet est bien structuré, créer un mini système réutilisable avec :
- un composant `LegalPageLayout` ;
- un helper ou fichier de configuration `site.config` ;
- des constantes centralisées dans `site.config` pour toutes les infos (nom, société, BCE, TVA, adresse, email, téléphone, responsable, outils tiers, date de mise à jour) — les champs sans valeur ne doivent tout simplement pas être rendus dans le HTML.

Mais :
- ne sur-engineer pas ;
- fais simple ;
- n'introduis pas une usine à gaz.

---

## Note de prudence interne

Quand une vraie validation d'avocat / DPO externe est nécessaire, l'indiquer dans le compte-rendu final de manière sobre, sans bloquer l'implémentation.

Exemples de cas à signaler :
- e-commerce avancé ;
- santé ;
- données sensibles ;
- mineurs ;
- recrutement ;
- vidéosurveillance ;
- transferts internationaux complexes ;
- profiling marketing avancé ;
- espace membre ;
- marketplace.
