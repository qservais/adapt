# ADAPT by LMJ — PATCH 3 : SPÉCIFICATION UX/UI TECHNIQUE COMPLÈTE
## Chaque écran, chaque composant, chaque animation, chaque état

Ce document est la spec UX/UI technique exhaustive de l'application. Il décrit EXACTEMENT comment chaque écran doit être construit, pixel par pixel, état par état, animation par animation. Donne ce document à Replit AI APRÈS les patchs 1 et 2.

**Stack :** React Native (Expo) + react-native-reanimated + expo-haptics + expo-linear-gradient + react-native-svg + @react-navigation/native

**Design direction :** Dark athletic premium. Fond quasi-noir, accents néon cyan/violet, typographie sport moderne. L'app doit donner l'impression d'un outil haut de gamme utilisé par des athlètes sérieux — pas un jouet, pas un formulaire médical. Chaque interaction doit être satisfaisante, rapide, tactile.

---

## 0 — INSTALLATION DES DÉPENDANCES

Avant d'implémenter quoi que ce soit dans ce patch, installer les dépendances suivantes si elles ne sont pas déjà présentes :

```bash
# Animations
npx expo install react-native-reanimated react-native-gesture-handler

# Haptics
npx expo install expo-haptics

# Gradients
npx expo install expo-linear-gradient

# SVG (pour timer circulaire, graphes, arc score)
npx expo install react-native-svg

# Polices
npx expo install expo-font @expo-google-fonts/dm-sans

# Icons
npx expo install @expo/vector-icons

# Navigation (si pas déjà installé)
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack

# Safe area
npx expo install react-native-safe-area-context react-native-screens

# Date picker
npx expo install @react-native-community/datetimepicker

# Confetti (pour PRs et milestones)
npm install react-native-confetti-cannon

# Async storage (pour cache offline)
npx expo install @react-native-async-storage/async-storage
```

Ajouter le plugin reanimated dans `babel.config.js` :
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // DOIT être en dernier
  };
};
```

---

## 1 — THEME GLOBAL & DESIGN TOKENS

Créer un fichier `src/theme/index.ts` qui exporte TOUS les tokens de design. Chaque composant de l'app DOIT importer ses valeurs depuis ce fichier. Aucune couleur, taille de police ou espacement ne doit être écrit en dur dans les composants.

```typescript
// src/theme/index.ts

export const colors = {
  bg: {
    primary: '#0A0A0A',
    card: '#141414',
    input: '#1E1E1E',
    elevated: '#252525',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  accent: {
    cyan: '#00F0FF',
    violet: '#A855F7',
    gradient: ['#00F0FF', '#A855F7'] as const,
  },
  mode: {
    performance: '#3B82F6',
    normal: '#22C55E',
    adapt: '#F59E0B',
    recovery: '#EF4444',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#666666',
    inverse: '#0A0A0A',
  },
  border: '#2A2A2A',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  gold: '#FFD700',
  badge: {
    locked: '#333333',
    lockedText: '#555555',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const fonts = {
  heading: 'DMSans_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemibold: 'DMSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',  // fallback: use Platform.select for system monospace
};

export const fontSize = {
  hero: 48,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  caption: 14,
  small: 12,
  tiny: 10,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glowStrong: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
};

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  score: 1500,
  spring: { damping: 15, stiffness: 150 },
  springBouncy: { damping: 10, stiffness: 200 },
};

// Helper pour obtenir la couleur d'un mode
export const getModeColor = (mode: string) => {
  return colors.mode[mode as keyof typeof colors.mode] || colors.accent.cyan;
};

// Helper pour obtenir la couleur de fond d'un mode (20% opacité)
export const getModeBgColor = (mode: string) => {
  const color = getModeColor(mode);
  return color + '33'; // 20% opacity en hex
};
```

---

## 2 — COMPOSANTS DE BASE RÉUTILISABLES

Chaque composant ci-dessous doit être créé dans `src/components/ui/` et réutilisé partout dans l'app.

### 2.1 GradientButton (Bouton CTA principal)

```typescript
// src/components/ui/GradientButton.tsx
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'large' | 'medium';  // large = 56px, medium = 48px
  icon?: React.ReactNode;     // Icône optionnelle à gauche du label
}

// Specs visuelles :
// - LinearGradient colors={['#00F0FF', '#A855F7']} start={x:0,y:0} end={x:1,y:1}
// - Hauteur : 56px (large) ou 48px (medium)
// - Border-radius : 16px
// - Texte : #0A0A0A, bold (DMSans_700Bold), 16px
// - Padding horizontal : 24px
// - fullWidth : width '100%'
// - Shadow : shadowColor '#00F0FF', shadowOpacity 0.3, shadowRadius 20
// - Press animation : scale 0.97 via useAnimatedStyle + withSpring
// - Haptics : Haptics.impactAsync(ImpactFeedbackStyle.Medium) on press
// - Disabled : opacity 0.4, pas de press
// - Loading : remplacer le texte par un ActivityIndicator color="#0A0A0A"
```

### 2.2 SecondaryButton

```typescript
// Specs visuelles :
// - Fond : transparent
// - Bordure : 1px solid #2A2A2A
// - Hauteur : 56px (large) ou 48px (medium)
// - Border-radius : 16px
// - Texte : #FFFFFF, medium (DMSans_500Medium), 16px
// - Press : bordure passe à rgba(0, 240, 255, 0.5), scale 0.98
// - Disabled : opacity 0.4
```

### 2.3 TextButton (lien)

```typescript
// Specs visuelles :
// - Fond : transparent, pas de bordure
// - Texte : #00F0FF, medium, 16px
// - Press : opacity 0.6
// - Variante "danger" : texte #EF4444
```

### 2.4 Card

```typescript
// src/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  pressable?: boolean;
  onPress?: () => void;
  glowOnPress?: boolean;   // Bordure cyan au press
  mode?: string;            // Si défini, bordure gauche colorée selon le mode
  style?: ViewStyle;
}

// Specs visuelles :
// - Fond : #141414
// - Bordure : 1px solid #2A2A2A
// - Border-radius : 20px
// - Padding : 20px
// - Si pressable + glowOnPress : au press, bordure transition vers rgba(0,240,255,0.3)
// - Si mode : border-left 3px solid getModeColor(mode), border-radius ajusté
// - Shadow : shadows.card
```

### 2.5 Input

```typescript
// src/components/ui/Input.tsx
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardType;
  secureTextEntry?: boolean;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Specs visuelles :
// - Label : au-dessus, 14px, #A0A0A0, DMSans_500Medium
// - Container input :
//   - Fond : #1E1E1E
//   - Bordure : 1px solid #2A2A2A
//   - Border-radius : 14px
//   - Hauteur : 52px (simple ligne), auto (multiline)
//   - Padding horizontal : 16px
//   - Texte : #FFFFFF, 16px, DMSans_400Regular
//   - Placeholder : #666666
// - Focus : bordure #00F0FF, shadow glow subtil (shadowColor cyan, opacity 0.15, radius 10)
// - Error : bordure #EF4444, message d'erreur en dessous (12px, #EF4444)
// - Disabled : opacity 0.5, pas d'édition
// - leftIcon : positionné à gauche avec paddingLeft 44px sur l'input
// - rightIcon : positionné à droite avec paddingRight 44px
```

### 2.6 AdaptSlider (Slider custom pour le check-in)

C'est LE composant le plus important de l'app. Il doit être ultra-satisfaisant à utiliser.

```typescript
// src/components/ui/AdaptSlider.tsx
interface AdaptSliderProps {
  value: number;              // 1-5
  onValueChange: (val: number) => void;
  minLabel: string;           // ex: "Très mal"
  maxLabel: string;           // ex: "Parfaitement"
  step?: number;              // default 1
  min?: number;               // default 1
  max?: number;               // default 5
}

// Specs visuelles DÉTAILLÉES :
//
// TRACK :
// - Hauteur : 8px
// - Fond (non rempli) : #2A2A2A
// - Fond (rempli) : LinearGradient ['#00F0FF', '#A855F7']
// - Border-radius : 4px (track complet)
// - Le remplissage va de gauche à la position du thumb
//
// THUMB :
// - Cercle 32×32px
// - Fond : #FFFFFF
// - Bordure : 3px solid #00F0FF
// - Shadow : shadowColor '#00F0FF', shadowOpacity 0.4, shadowRadius 12
// - Au drag : scale 1.15 (withSpring), shadow radius augmente à 20
// - Au release : retour à scale 1.0
//
// VALEUR AFFICHÉE :
// - Sous le slider, centrée
// - Taille : 32px, police mono (JetBrainsMono), couleur #00F0FF
// - Format : "3 / 5"
// - Animation : quand la valeur change, le chiffre fait un scale 1.0→1.2→1.0 rapide (200ms)
//
// LABELS MIN/MAX :
// - En dessous du slider, aux extrémités
// - Taille : 12px, couleur #666666, DMSans_400Regular
// - minLabel à gauche, maxLabel à droite
//
// HAPTICS :
// - À chaque changement de step : Haptics.selectionAsync()
// - Implémentation : utiliser PanGestureHandler de react-native-gesture-handler
//   ou le Slider natif customisé avec react-native-reanimated
//
// DOTS INDICATEURS (optionnel mais recommandé) :
// - 5 petits dots (6×6px) espacés régulièrement sur le track
// - Dot actif : #00F0FF
// - Dot inactif : #444444
// - Le dot correspondant à la valeur actuelle est plus gros (10×10px)
//
// LAYOUT COMPLET DU SLIDER :
// ┌────────────────────────────────┐
// │                                │
// │  Très mal            Parfait   │  ← labels min/max, 12px, gris
// │                                │
// │  ○───○───●════○───○            │  ← track avec dots et thumb
// │          ◉                     │     (● = dot actif, ◉ = thumb)
// │                                │
// │          3 / 5                 │  ← valeur, 32px, mono, cyan
// │                                │
// └────────────────────────────────┘
```

### 2.7 ModeBadge

```typescript
// src/components/ui/ModeBadge.tsx
interface ModeBadgeProps {
  mode: 'performance' | 'normal' | 'adapt' | 'recovery';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;  // slide-up + glow à l'apparition
}

// Specs visuelles :
// - Forme : pill (border-radius full)
// - Fond : getModeColor(mode) avec 20% opacité
// - Texte : getModeColor(mode) à 100%, uppercase, bold
// - Tailles :
//   - small : paddingH 10, paddingV 4, fontSize 10
//   - medium : paddingH 16, paddingV 6, fontSize 12
//   - large : paddingH 20, paddingV 8, fontSize 14
// - Si animated : apparaît avec translateY(20)→0 + opacity(0)→1, durée 400ms, spring
```

### 2.8 SkeletonLoader (Shimmer)

```typescript
// src/components/ui/SkeletonLoader.tsx
// Afficher pendant le chargement à la place d'un spinner basique.
// Chaque écran a sa propre configuration de skeleton.

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Specs visuelles :
// - Fond : #1E1E1E
// - Animation shimmer : LinearGradient animé qui translate de gauche à droite
//   - Colors : ['#1E1E1E', '#2A2A2A', '#1E1E1E']
//   - Animation : translateX de -width à +width, durée 1500ms, loop infini, easing linear
// - Border-radius : 12px par défaut
// - Utiliser expo-linear-gradient + Animated API
//
// Skeleton pour la Home :
// ┌─────────────────────────────┐
// │ [████████████] [██]         │  ← titre + avatar
// │                             │
// │ ┌─────────────────────────┐ │
// │ │ [████████████████████]  │ │  ← carte score (120px height)
// │ │ [████████]              │ │
// │ └─────────────────────────┘ │
// │                             │
// │ ┌─────────────────────────┐ │
// │ │ [████████████████████]  │ │  ← carte séance (100px height)
// │ │ [██████████]            │ │
// │ └─────────────────────────┘ │
// │                             │
// │ [██████████████]            │  ← streak
// └─────────────────────────────┘
```

### 2.9 CircularTimer (Timer repos)

```typescript
// src/components/ui/CircularTimer.tsx
interface CircularTimerProps {
  totalSeconds: number;        // ex: 90
  onComplete: () => void;      // callback quand le timer finit
  onSkip: () => void;          // callback quand on skip
  autoStart?: boolean;
}

// Specs visuelles :
// - Taille : 200×200px
// - Cercle de fond : stroke #2A2A2A, strokeWidth 8
// - Arc de progression : stroke gradient (utiliser un SVG linearGradient)
//   - Départ : #00F0FF
//   - Fin : #A855F7
//   - L'arc se VIDE progressivement (part de 100% et descend vers 0%)
//   - Animation : useSharedValue qui descend de totalSeconds à 0
// - 10 dernières secondes : l'arc passe à #EF4444 (rouge)
// - 3 dernières secondes : vibration Haptics.impactAsync(Light) à chaque seconde
// - 0 seconde : vibration Haptics.notificationAsync(Success), auto-dismiss
//
// Contenu au centre du cercle :
// - Secondes restantes en gros (40px, mono, blanc)
// - Label "REPOS" en dessous (12px, gris)
//
// Bouton "PASSER" :
// - En dessous du cercle
// - TextButton cyan
// - Au tap : Haptics.impactAsync(Light), appelle onSkip
//
// Layout :
// ┌─────────────────────────────┐
// │                             │
// │       ╭─── ─── ───╮        │
// │      │             │       │
// │      │     72      │       │  ← secondes, 40px, mono
// │      │   REPOS     │       │  ← label, 12px, gris
// │      │             │       │
// │       ╰─── ─── ───╯        │
// │                             │
// │        [ PASSER ]           │  ← TextButton cyan
// │                             │
// └─────────────────────────────┘
```

### 2.10 ScoreCircle (Affichage du score ADAPT)

```typescript
// src/components/ui/ScoreCircle.tsx
interface ScoreCircleProps {
  score: number;               // 0-100
  mode: string;
  animated?: boolean;          // true = animation compteur
  size?: 'small' | 'large';   // small = Home, large = résultat check-in
}

// PETITE VERSION (Home, 120×120px) :
// - Cercle de fond : stroke #2A2A2A, strokeWidth 6
// - Arc rempli : stroke getModeColor(mode), strokeWidth 6
// - Le remplissage correspond au score (score/100 * 360°)
// - Au centre : score en 28px, mono, getModeColor(mode)
// - En dessous du score : "/100" en 12px, gris
//
// GRANDE VERSION (résultat check-in, 200×200px) :
// - Cercle de fond : stroke #2A2A2A, strokeWidth 8
// - Arc rempli : stroke getModeColor(mode), strokeWidth 8
// - Shadow glow autour de l'arc : shadowColor getModeColor(mode), opacity 0.3, radius 20
// - Au centre : score en 48px (hero), mono, getModeColor(mode)
// - En dessous : "/100" en 16px, gris
// - Sous le cercle : "Score ADAPT" en 14px, gris
//
// ANIMATION (si animated=true) :
// - Le chiffre du score monte de 0 à la valeur finale
// - Durée : 1500ms, easing Easing.out(Easing.cubic)
// - L'arc SVG se dessine simultanément de 0° à l'angle final
// - Utiliser useSharedValue + useDerivedValue + withTiming
// - Le chiffre affiché = Math.round(animatedValue.value)
```

### 2.11 Stepper (pour charge +/- 2.5kg)

```typescript
// src/components/ui/Stepper.tsx
interface StepperProps {
  value: number;
  onValueChange: (val: number) => void;
  step: number;                // ex: 2.5
  min?: number;
  max?: number;
  unit?: string;               // ex: "kg"
  label?: string;              // ex: "Charge utilisée"
}

// Specs visuelles :
// - Layout horizontal : [ - ]  valeur  [ + ]
// - Boutons -/+ :
//   - Cercle 48×48px
//   - Fond : #1E1E1E
//   - Bordure : 1px solid #2A2A2A
//   - Icône : "-" ou "+" en 24px, blanc
//   - Press : fond passe à #252525, scale 0.95, Haptics.impactAsync(Light)
//   - Disabled (min/max atteint) : opacity 0.3
// - Valeur au centre :
//   - Taille : 28px, mono, blanc
//   - Unit : 16px, gris, à droite de la valeur
//   - Format : "82.5 kg"
//   - Quand la valeur change : mini scale bounce (1.0→1.05→1.0, 150ms)
// - Label (optionnel) : au-dessus, 14px, gris
//
// Layout :
//   Charge utilisée
//  [ - ]    82.5 kg    [ + ]
```

### 2.12 ProgressBar

```typescript
// src/components/ui/ProgressBar.tsx
interface ProgressBarProps {
  progress: number;    // 0.0 à 1.0
  height?: number;     // default 4
  gradient?: boolean;  // true = gradient cyan→violet, false = couleur simple
  color?: string;      // si pas gradient
}

// Specs visuelles :
// - Track fond : #2A2A2A
// - Track rempli : LinearGradient ['#00F0FF', '#A855F7'] (si gradient) ou color
// - Border-radius : height / 2
// - Animation : la largeur du remplissage anime de 0 à progress avec withTiming(300ms)
```

### 2.13 Toast / Banner de notification in-app

```typescript
// src/components/ui/Toast.tsx
interface ToastProps {
  message: string;
  icon?: string;       // emoji ou icône
  type: 'badge' | 'pr' | 'info' | 'error';
  duration?: number;   // default 3000ms
  onDismiss: () => void;
}

// Specs visuelles :
// - Position : haut de l'écran, sous la status bar
// - Apparition : slide down (translateY -100 → 0) + fade in, spring animation
// - Disparition : slide up + fade out après duration
// - Fond :
//   - badge : LinearGradient ['#00F0FF', '#A855F7']
//   - pr : fond #FFD700 (or)
//   - info : fond #141414 avec bordure #2A2A2A
//   - error : fond #EF4444 20% avec bordure #EF4444
// - Contenu : [icon] + message, texte 14px, bold
//   - badge/pr : texte noir (#0A0A0A)
//   - info : texte blanc
//   - error : texte #EF4444
// - Border-radius : 16px
// - Margin horizontal : 20px
// - Padding : 16px
// - Haptics : notificationAsync(Success) pour badge/pr, Warning pour error
// - Tap pour dismiss
```

---

## 3 — ÉCRANS DÉTAILLÉS

### 3.1 Splash Screen

```
// Affiché au lancement de l'app pendant le chargement des fonts et de l'auth

// Specs :
// - Fond plein écran : #0A0A0A
// - Logo ADAPT centré : texte "ADAPT" en 40px, bold, blanc
//   avec "by LMJ" en 16px, #A0A0A0, en dessous
// - Sous le logo : ActivityIndicator color="#00F0FF"
// - Durée max : 3 secondes, puis redirect vers login ou home
```

### 3.2 Écran Login

```
┌─────────────────────────────────┐
│                                 │
│         (espace, ~80px)         │
│                                 │
│           ADAPT                 │  ← 40px, bold, blanc
│          by LMJ                 │  ← 16px, #A0A0A0
│                                 │
│         (espace, ~40px)         │
│                                 │
│  Adresse e-mail                 │  ← label 14px gris
│  ┌─────────────────────────┐    │
│  │ julien@gmail.com        │    │  ← Input component
│  └─────────────────────────┘    │
│                                 │
│  Mot de passe                   │
│  ┌─────────────────────────┐    │
│  │ ••••••••          [👁]  │    │  ← Input avec toggle visibility
│  └─────────────────────────┘    │
│                                 │
│  Mot de passe oublié ?          │  ← TextButton, aligné droite
│                                 │
│  [████ SE CONNECTER ████████]   │  ← GradientButton fullWidth
│                                 │
│  ─────── ou ───────             │  ← Séparateur discret
│                                 │
│  [    CRÉER UN COMPTE    ]      │  ← SecondaryButton fullWidth
│                                 │
└─────────────────────────────────┘

// Notes :
// - KeyboardAvoidingView pour que le form remonte quand le clavier s'ouvre
// - Error state : Input avec bordure rouge + message en dessous
// - Loading state : GradientButton avec spinner
// - Animation d'entrée : logo fade-in (300ms), puis form slide-up (400ms, staggered)
```

### 3.3 Écran Register

```
┌─────────────────────────────────┐
│ ← Retour                       │
│                                 │
│  Créer un compte                │  ← h1, blanc
│  Rejoins ADAPT by LMJ          │  ← caption, gris
│                                 │
│  Prénom                         │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Adresse e-mail                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Mot de passe                   │
│  ┌─────────────────────────┐    │
│  │                  [👁]   │    │
│  └─────────────────────────┘    │
│  (min. 8 caractères)            │  ← caption, gris
│                                 │
│  Confirmer le mot de passe      │
│  ┌─────────────────────────┐    │
│  │                  [👁]   │    │
│  └─────────────────────────┘    │
│                                 │
│  [████ CRÉER MON COMPTE ███]    │  ← GradientButton
│                                 │
│  J'ai déjà un compte            │  ← TextButton
│                                 │
└─────────────────────────────────┘

// Validation en temps réel :
// - Email : regex, bordure verte si valide, rouge si invalide
// - Password : min 8 chars, indicateur force (faible/moyen/fort) avec barre colorée
// - Confirm password : check match, bordure rouge si ≠
```

### 3.4 Onboarding Flow (écrans séquentiels)

L'onboarding est une série de 7 écrans en stack navigation. Chaque écran a la même structure de base :

```
┌─────────────────────────────────┐
│  ← Retour    Étape X sur 7     │  ← header
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  │  ← ProgressBar gradient
│                                 │
│                                 │
│       [CONTENU SPÉCIFIQUE]      │
│                                 │
│                                 │
│                                 │
│  [████████ SUIVANT █████████]   │  ← GradientButton fixé en bas
│         (safe area)             │
└─────────────────────────────────┘
```

**Écran 1 — Genre :**
```
│  Tu es :                        │  ← h2, blanc, centré
│                                 │
│  ┌─────────────┐ ┌────────────┐ │
│  │             │ │            │ │
│  │     ♂       │ │     ♀      │ │  ← Deux grosses cartes 50/50
│  │   Homme     │ │   Femme    │ │     Hauteur : 160px
│  │             │ │            │ │     Sélectionné : bordure cyan
│  └─────────────┘ └────────────┘ │     + fond cyan 10% + glow
│                                 │     Non sélectionné : fond #141414
                                       Icône : 40px, emoji ou icône
                                       Texte : 18px, bold
                                       Haptics on select
```

**Écran 2 — Date de naissance :**
```
│  Ta date de naissance           │  ← h2
│  Pour personnaliser ton         │  ← caption gris
│  expérience                     │
│                                 │
│  ┌─────────────────────────┐    │
│  │   DateTimePicker natif   │   │  ← mode="date", display="spinner" (iOS)
│  │   (wheel picker iOS      │   │     ou display="default" (Android)
│  │    ou calendar Android)  │   │     maximumDate = today
│  └─────────────────────────┘    │     locale = "fr-FR"
│                                 │
│  Tu as 24 ans                   │  ← Âge calculé, 16px, cyan
```

**Écran 3 — Profil physique :**
```
│  Ton profil physique            │  ← h2
│                                 │
│  Poids (kg)                     │
│  ┌─────────────────────────┐    │
│  │ 75                      │    │  ← Input, keyboardType="decimal-pad"
│  └─────────────────────────┘    │
│                                 │
│  Taille (cm)                    │
│  ┌─────────────────────────┐    │
│  │ 180                     │    │  ← Input, keyboardType="number-pad"
│  └─────────────────────────┘    │
│                                 │
│  Ces infos sont optionnelles    │  ← caption gris
│  mais recommandées.             │
```

**Écran 4 — Niveau fitness :**
```
│  Ton niveau                     │  ← h2
│                                 │
│  ┌─────────────────────────┐    │
│  │  🌱  Débutant            │    │  ← Card sélectionnable
│  │  Moins d'1 an de pratique│    │     Hauteur : 80px
│  └─────────────────────────┘    │     Icône + titre + description
│                                 │     Sélectionné : bordure cyan + bg cyan 10%
│  ┌─────────────────────────┐    │
│  │  💪  Intermédiaire       │    │
│  │  1–3 ans de pratique     │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔥  Avancé              │    │
│  │  3+ ans de pratique      │    │
│  └─────────────────────────┘    │
```

**Écran 5 — Objectif principal :**
```
│  Ton objectif principal         │  ← h2
│                                 │
│  ┌────────────┐ ┌─────────────┐ │
│  │ 🏆         │ │ ❤️           │ │  ← Grille 2×2
│  │ Performance│ │ Santé       │ │     Cards 50/50
│  └────────────┘ └─────────────┘ │     Même style que le genre
│  ┌────────────┐ ┌─────────────┐ │
│  │ 💎         │ │ 🔄          │ │
│  │ Esthétique │ │ Remise en   │ │
│  │            │ │ forme       │ │
│  └────────────┘ └─────────────┘ │
```

**Écran 6 — Fréquence + blessures :**
```
│  Ton entraînement               │  ← h2
│                                 │
│  Combien de fois par semaine ?  │
│                                 │
│  [ - ]       3       [ + ]      │  ← Stepper, valeur grande (28px, cyan)
│          fois/semaine           │  ← caption gris
│                                 │
│  Blessures actuelles            │
│  ┌─────────────────────────┐    │
│  │ Ex: douleur épaule      │    │  ← Input multiline, optionnel
│  │ droite, genou fragile   │    │
│  └─────────────────────────┘    │
│                                 │
│  (optionnel)                    │  ← caption gris
```

**Écran 7 — Code coach :**
```
│  Ton coach                      │  ← h2
│                                 │
│  Si tu as un coach, entre       │  ← body, gris
│  son code d'invitation.         │
│                                 │
│  ┌─────────────────────────┐    │
│  │ A B C 1 2 3             │    │  ← Input, 6 chars, auto-uppercase
│  └─────────────────────────┘    │     letterSpacing 8, textAlign center
│                                 │     fontSize 24, mono
│                                 │
│  [████████ LIER MON COACH ██]   │  ← GradientButton (si code rempli)
│                                 │
│  ou                             │
│                                 │
│  [  Continuer sans coach  ]     │  ← SecondaryButton
│                                 │
│  Tu pourras lier un coach       │  ← caption gris
│  plus tard depuis ton profil.   │
```

### 3.5 Home Dashboard

Deux états : check-in fait / check-in à faire. Voir wireframes détaillés dans le patch 1, section 4.4.

**Ajouts techniques pour ce patch :**

```typescript
// Structure du composant HomeScreen
const HomeScreen = () => {
  // États
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState(null);
  const [session, setSession] = useState(null);
  const [streak, setStreak] = useState(0);
  const [lastSession, setLastSession] = useState(null);
  const [todayPRs, setTodayPRs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.cyan} />}
        contentContainerStyle={{ padding: spacing.screenPadding }}
      >
        {loading ? <HomeSkeleton /> : (
          <>
            <HomeHeader name={user.first_name} />
            {checkin ? <ScoreCard checkin={checkin} /> : <CheckinCTA streak={streak} />}
            {checkin ? <SessionCard session={session} /> : <SessionLocked />}
            {todayPRs.length > 0 && <PRBanner prs={todayPRs} />}
            <StreakBanner streak={streak} checkinDone={!!checkin} />
            {lastSession && <LastSessionMini session={lastSession} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
```

**HomeHeader :**
```
│  Bonjour Julien          [👤]  │
│  Mer. 19 mars                  │

// - "Bonjour" + prénom : h1 (28px), blanc, bold
// - Date : caption (14px), gris, sous le nom
// - Avatar : cercle 40×40 en haut à droite
//   - Si pas de photo : initiales sur fond gradient cyan→violet
//   - Tap → navigue vers Profil
// - Format date : "Lun. 17 mars" — utiliser toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
```

**CheckinCTA (check-in à faire) :**
```
│  ┌─────────────────────────────┐ │
│  │                             │ │  ← Card, fond #141414
│  │  Ton check-in du matin     │ │     bordure 1px #2A2A2A
│  │                             │ │
│  │  30 secondes pour adapter   │ │  ← body, gris
│  │  ta séance d'aujourd'hui   │ │
│  │                             │ │
│  │  [█ FAIRE MON CHECK-IN ██] │ │  ← GradientButton fullWidth
│  │                             │ │     Animation pulse : opacity
│  └─────────────────────────────┘ │     0.85→1.0, loop, 2s
│                                  │

// Animation pulse sur le bouton :
// useEffect avec withRepeat(withSequence(withTiming(0.85, {duration:1000}), withTiming(1, {duration:1000})))
```

**SessionLocked :**
```
│  ┌─────────────────────────────┐ │
│  │  🔒                         │ │  ← Card, fond #141414, opacity 0.6
│  │  Séance verrouillée         │ │
│  │  Fais ton check-in pour     │ │  ← body, gris
│  │  débloquer ta séance        │ │
│  └─────────────────────────────┘ │
```

**ScoreCard (check-in fait) :**
```
│  ┌─────────────────────────────┐ │
│  │  ✓ CHECK-IN FAIT            │ │  ← Badge vert "✓" + texte
│  │                             │ │
│  │       [ScoreCircle]         │ │  ← ScoreCircle size="small"
│  │         74/100              │ │
│  │                             │ │
│  │    ┌──────────┐             │ │
│  │    │  NORMAL  │             │ │  ← ModeBadge size="medium"
│  │    └──────────┘             │ │
│  └─────────────────────────────┘ │
```

**SessionCard :**
```
│  ┌─────────────────────────────┐ │
│  │  💪 SÉANCE DU JOUR          │ │  ← Card pressable
│  │  Force Haut du Corps        │ │     mode border-left
│  │  ~55 min · 8 exercices      │ │
│  │                             │ │
│  │  [████ DÉMARRER ████████]   │ │  ← GradientButton fullWidth
│  └─────────────────────────────┘ │

// Si le coach a modifié la séance :
// Afficher un petit badge "Mise à jour par ton coach" en haut de la carte, texte cyan
```

**StreakBanner :**
```
│  🔥 6 jours consécutifs        │  ← Si checkin fait : texte vert/cyan
│                                 │
│  🔥 6 jours — ne brise pas !   │  ← Si checkin PAS fait : texte orange warning

// - Icône flamme 🔥 + texte
// - Si streak = 0 : ne pas afficher
// - Si check-in fait : "🔥 [N] jours consécutifs" en vert #22C55E
// - Si check-in pas fait et streak > 0 : "🔥 [N] jours — ne brise pas la série !" en orange #F59E0B
// - Font size : 14px, DMSans_600SemiBold
```

### 3.6 Check-in Flow

**Navigation :** Présenté comme un modal stack (modal presentation sur iOS, slide up sur Android) au-dessus de la Home. Le back swipe ferme le modal entier.

**Transition entre slides :** Slide horizontal (comme un carrousel). Utiliser `@react-navigation/native-stack` avec `animation: 'slide_from_right'`.

**Structure de chaque slide :**
```
┌─────────────────────────────────┐
│  ← (back)    Étape 1 sur 7     │
│  ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  │  ← ProgressBar, hauteur 3px
│                                 │
│                                 │
│     Comment tu as dormi ?       │  ← h2 (22px), blanc, centré
│                                 │
│                                 │
│     [    AdaptSlider     ]      │  ← Composant AdaptSlider
│                                 │
│     Très mal      Parfaitement  │
│                                 │
│           3 / 5                 │
│                                 │
│                                 │
│                                 │
│  [████████ SUIVANT █████████]   │  ← fixé en bas, 20px margin bottom
└─────────────────────────────────┘

// Le bouton "Suivant" est disabled si aucune valeur n'est sélectionnée (tous les sliders
// commencent à la valeur null, pas à 3 — l'utilisateur doit toucher le slider au moins une fois)
// Exception : si on veut simplifier, on peut pré-sélectionner 3 comme valeur par défaut
```

**Slide Douleur (optionnel, après motivation) :**
```
│  Douleur localisée              │  ← h2
│                                 │
│  ┌─────────────────────────┐    │
│  │  J'ai une douleur       │    │  ← Toggle switch iOS/Android natif
│  │  articulaire ou         │    │     Couleur on : #EF4444 (rouge)
│  │  localisée         [🔴] │    │
│  └─────────────────────────┘    │
│                                 │
│  (Si toggle ON, afficher :)     │
│                                 │
│  Décris ta douleur              │
│  ┌─────────────────────────┐    │
│  │ Genou droit,            │    │  ← Input multiline
│  │ douleur au mouvement    │    │
│  └─────────────────────────┘    │
│                                 │
│  Intensité                      │
│  ┌─────────────────────────┐    │
│  │ [AdaptSlider 1-10]      │    │  ← Slider 1-10 (pas 1-5)
│  │ Légère      Intense     │    │
│  └─────────────────────────┘    │
│                                 │
│  ⚠️ Ceci forcera ta séance      │  ← Texte warning rouge/orange
│  en mode RECOVERY et alertera   │
│  ton coach.                     │
```

**Slide Cycle menstruel (UNIQUEMENT si gender=female ET cycle_tracking=true) :**
```
│  Phase du cycle                 │  ← h2
│                                 │
│  ┌───────────┐ ┌──────────────┐ │
│  │ Menstruelle│ │ Folliculaire │ │  ← 4 cartes sélectionnables
│  │    🔴      │ │     🟡       │ │     2×2 grid
│  └───────────┘ └──────────────┘ │     Sélection unique
│  ┌───────────┐ ┌──────────────┐ │     Style identique aux
│  │ Ovulatoire│ │   Lutéale    │ │     cartes genre/objectif
│  │    🟢      │ │     🔵       │ │
│  └───────────┘ └──────────────┘ │
│                                 │
│  [  Passer cette étape  ]       │  ← SecondaryButton (optionnel)
```

**Écran résultat check-in :**
```
┌─────────────────────────────────┐
│  ← Check-in                    │
│                                 │
│        ✓ Check-in fait          │  ← Texte vert avec checkmark
│                                 │
│      [  ScoreCircle LARGE  ]    │  ← ScoreCircle animated=true
│           74/100                │     size="large"
│         Score ADAPT             │
│                                 │
│                                 │
│    Mode séance du jour :        │  ← caption gris
│                                 │
│       ┌──────────────┐          │
│       │   NORMAL     │          │  ← ModeBadge size="large"
│       │ Charge       │          │     animated=true
│       │ nominale     │          │
│       └──────────────┘          │
│                                 │
│                                 │
│  [████ VOIR MA SÉANCE ██████]   │  ← GradientButton fullWidth
│                                 │
└─────────────────────────────────┘

// Animations dans l'ordre :
// 1. "Check-in fait" fade-in (200ms)
// 2. ScoreCircle animation compteur (1500ms) — arc + chiffre
// 3. ModeBadge slide-up (400ms) — apparaît après le score
// 4. Bouton fade-in (300ms) — apparaît en dernier
// Total : ~2.5 secondes avant que le bouton soit visible et tapable
// Pendant ce temps, Haptics.notificationAsync(Success) au moment où le score finit d'animer
```

### 3.7 Session Overview

```
┌─────────────────────────────────┐
│  ← Retour                      │
│                                 │
│  ┌──────────┐                   │
│  │ NORMAL   │  Force Haut      │  ← ModeBadge + titre h1
│  └──────────┘  du Corps        │
│                                 │
│  ~55 min · 8 exercices          │  ← caption gris
│                                 │
│  💬 "Focus contrôle             │  ← Note coach (si existe)
│  excentrique aujourd'hui"       │     Fond #1E1E1E, border-left cyan
│                                 │
│  ── Échauffement ──             │  ← Section header, 14px, gris
│                                 │
│  ┌─ [gif] Rotations épaules    │  ← Mini GIF 40×40 + nom
│  │  60 sec                     │     + durée/reps, caption gris
│  ├─ [gif] Band pull-apart      │
│  │  2 × 15                     │
│  └─────────────────────────────│
│                                 │
│  ── Bloc principal ──           │  ← Section header
│                                 │
│  ┌─ [gif] Développé couché     │
│  │  4 × 8-10 · 80kg           │  ← nom + séries×reps + charge
│  ├─ [gif] Rowing barre         │
│  │  4 × 10 · 60kg             │
│  ├─ [gif] Développé militaire  │
│  │  3 × 10 · 40kg             │
│  │  ...                        │
│  └─────────────────────────────│
│                                 │
│  [████ DÉMARRER LA SÉANCE ██]   │  ← GradientButton, fixé en bas
│                                 │
└─────────────────────────────────┘

// Notes techniques :
// - ScrollView pour la liste d'exercices
// - Le bouton "Démarrer" est fixé en bas (position absolute ou dans un container séparé)
// - Chaque exercice est un row pressable → tap ouvre un bottom sheet avec détails + GIF grande
// - La charge affichée est la charge ADAPTÉE au mode (pas la charge nominale)
//   ex: mode ADAPT → 80kg × 0.75 = 60kg
```

### 3.8 Session Exercise (exercice en cours)

```
┌─────────────────────────────────┐
│  ✕ Quitter         3 / 8       │  ← Bouton quit + compteur
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  │  ← ProgressBar (3/8 = 37.5%)
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │    [GIF EXERCICE]       │    │  ← ExerciseDemo component
│  │      180 × 180          │    │     tap pour agrandir
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  DÉVELOPPÉ COUCHÉ BARRE         │  ← h1 (22px), blanc, bold, centré
│  Série 2 sur 4                  │  ← caption (14px), gris, centré
│                                 │
│  ┌────────────┐ ┌─────────────┐ │
│  │     10     │ │   80 kg     │ │  ← Deux "pills" info
│  │    REPS    │ │  CHARGE     │ │     Fond #1E1E1E, radius 16
│  └────────────┘ └─────────────┘ │     Valeur 24px bold
│                                 │     Label 10px gris uppercase
│                                 │
│  Charge utilisée :              │  ← label 14px gris
│  [ - ]    80.0 kg    [ + ]      │  ← Stepper component
│                                 │
│       (🏆 PR ! en gold si       │  ← Indicateur PR conditionnel
│        charge > record)         │
│                                 │
│  💬 "Contrôle la descente       │  ← Note coach, si existe
│   sur 3 sec"                    │     bulle fond #1E1E1E
│                                 │
│  [██ SÉRIE TERMINÉE ✓ ████████] │  ← GradientButton, texte vert ✓
│                                 │
└─────────────────────────────────┘

// Comportement au tap "SÉRIE TERMINÉE" :
// 1. Haptics.impactAsync(Medium)
// 2. Checkmark animation : scale 0→1.2→1.0 avec spring
// 3. Enregistrer la charge utilisée pour cette série
// 4. Si PAS dernière série → afficher CircularTimer (repos)
// 5. Si dernière série de cet exercice → transition vers exercice suivant
// 6. Si dernier exercice → transition vers SessionComplete

// Bouton "✕ Quitter" :
// - Ouvre un Alert/Modal de confirmation
// - "Ta progression sera sauvegardée. Quitter ?"
// - [Annuler] [Quitter] → si quitter : sauvegarder progression et revenir à Home
```

**État timer repos (entre les séries) :**
```
┌─────────────────────────────────┐
│  ✕ Quitter         3 / 8       │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  │
│                                 │
│  DÉVELOPPÉ COUCHÉ BARRE         │  ← Titre reste visible
│  Série 2 terminée ✓             │  ← Confirmation série
│                                 │
│                                 │
│       ╭──────────────╮          │
│      │               │         │
│      │      72       │         │  ← CircularTimer component
│      │    REPOS      │         │
│      │               │         │
│       ╰──────────────╯          │
│                                 │
│          [ PASSER ]             │
│                                 │
│  Prochaine série :              │  ← Preview de la série suivante
│  Série 3 · 10 reps · 80kg      │     caption gris
│                                 │
└─────────────────────────────────┘

// Le timer démarre automatiquement
// L'écran entier est dédié au repos — pas d'input
// Animation : le cercle se vide progressivement
// Les 10 dernières secondes : cercle rouge, plus gros texte
// À 0 : vibration + auto-transition vers la série suivante
```

### 3.9 Session Complete

```
┌─────────────────────────────────┐
│                                 │
│         (confetti si PR)        │  ← react-native-confetti-cannon
│                                 │
│        ✅ Séance terminée !     │  ← h1, blanc, centré
│                                 │
│  ┌─────────────────────────┐    │
│  │  ⏱ Durée totale  58 min│    │  ← Card résumé
│  │  💪 Exercices     8 / 8 │    │     Fond #141414
│  │  🏋️ Mode         NORMAL │    │
│  └─────────────────────────┘    │
│                                 │
│  (Si PRs battus :)              │
│  ┌─────────────────────────┐    │
│  │  🏆 NOUVEAUX RECORDS !  │    │  ← Card dorée (#FFD700 15%)
│  │                         │    │     bordure #FFD700
│  │  Développé couché : 85kg│    │
│  │  (ancien : 80kg)        │    │
│  └─────────────────────────┘    │
│                                 │
│  (Si badges débloqués :)        │
│  ┌─────────────────────────┐    │
│  │  🎖️ Badge débloqué !    │    │  ← Card gradient
│  │  💪 10 séances           │    │
│  └─────────────────────────┘    │
│                                 │
│  [██ DONNER MON FEEDBACK ██]    │  ← GradientButton
│                                 │
└─────────────────────────────────┘

// Animations d'entrée (séquencées) :
// 1. ✅ "Séance terminée" fade in + scale (300ms)
// 2. Card résumé slide up (400ms)
// 3. Card PRs slide up (400ms) — avec confetti simultané
// 4. Card badges slide up (400ms)
// 5. Bouton feedback fade in (300ms)
// Haptics.notificationAsync(Success) au moment du ✅
```

### 3.10 Feedback Screen

```
┌─────────────────────────────────┐
│  Feedback                       │
│                                 │
│  Force Haut du Corps            │  ← Titre séance
│  58 min · NORMAL                │  ← Résumé, caption + ModeBadge
│                                 │
│  Comment tu as vécu cette       │  ← h2
│  séance ?                       │
│                                 │
│  1 ────────────●──────────── 10 │  ← Slider RPE 1-10
│              RPE : 7            │     Couleur dynamique :
│                                 │     1-4 vert, 5-7 cyan, 8-10 rouge
│                                 │
│  ┌─────────┐┌──────────┐┌─────┐│
│  │  Trop   ││  Bien    ││Trop ││  ← 3 pills sélection unique
│  │ facile  ││ calibrée ││dur  ││     Fond #1E1E1E
│  └─────────┘└──────────┘└─────┘│     Sélectionné : cyan bg + border
│                                 │     Haptics on select
│                                 │
│  Note (optionnel)               │
│  ┌─────────────────────────┐    │
│  │ Épaule droite un peu    │    │  ← Input multiline
│  │ sensible...             │    │     max 500 chars
│  └─────────────────────────┘    │
│                                 │
│  [██ VALIDER MON FEEDBACK ██]   │  ← GradientButton
│                                 │
└─────────────────────────────────┘

// Après validation :
// - Écran de confirmation rapide (1.5 secondes) :
//   "🎉 Super séance ! 7 jours consécutifs !"
//   Puis auto-navigate vers Home
// - Si un badge a été débloqué par le feedback → Toast badge
```

### 3.11 Stats / Historique

```
┌─────────────────────────────────┐
│  Stats                     [📊] │  ← h1 + icône recap hebdo
│                                 │
│  ┌─── Résumé de la semaine ───┐ │
│  │ ┌──────┐┌──────┐┌────────┐│ │
│  │ │ 3/3  ││  72  ││  6.8   ││ │  ← 3 mini cards
│  │ │Séanc.││Score ││  RPE   ││ │     Valeur 22px bold
│  │ │ ↑+1  ││ ↑4.2 ││ ↓-0.5  ││ │     Delta : vert ↑ / rouge ↓
│  │ └──────┘└──────┘└────────┘│ │
│  └────────────────────────────┘ │
│                                 │
│  ── Calendrier ──               │
│  ┌────────────────────────────┐ │
│  │  < Mars 2025 >            │ │  ← Navigation mois
│  │  Lu Ma Me Je Ve Sa Di     │ │
│  │  ·  ·  ·  ·  ·  ·  ·     │ │  ← Jours : petits cercles
│  │  ·  ·  ·  ·  ·  ·  ·     │ │     🟢 complétée
│  │  ·  ·  ·  ·  ·  ·  ·     │ │     🟠 adapt
│  │  ·  ·  ·  ·  ·  ·  ·     │ │     🔴 recovery
│  │  ·  ·  ·  ·  ·  ·  ·     │ │     ⚫ manquée
│  └────────────────────────────┘ │     ⚪ repos/futur
│                                 │
│  ── Score ADAPT 30 jours ──     │
│  ┌────────────────────────────┐ │
│  │   ╱╲  ╱╲                  │ │  ← Graphe ligne
│  │  ╱  ╲╱  ╲    ╱╲           │ │     SVG ou chart-kit
│  │ ╱        ╲  ╱  ╲          │ │     Gradient fill sous la ligne
│  │╱          ╲╱    ╲         │ │     Couleur : cyan
│  └────────────────────────────┘ │
│                                 │
│  ── Records personnels ──       │
│  ┌────────────────────────────┐ │
│  │ Développé couché  85kg NEW│ │  ← Liste scrollable
│  │ 19 mars 2025              │ │     "NEW" badge si < 7 jours
│  ├────────────────────────────┤ │
│  │ Squat barre      105kg   │ │
│  │ 17 mars 2025              │ │
│  └────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘

// Notes techniques :
// - Calendrier : composant custom ou react-native-calendars
//   avec day rendering custom pour les cercles colorés
// - Graphe : react-native-svg Path pour la ligne + LinearGradient pour le fill
//   OU react-native-chart-kit avec customisation
// - Tap sur un jour du calendrier → bottom sheet avec détails
//   (score, mode, RPE, exercices faits)
// - Le bouton 📊 en haut à droite navigue vers le Weekly Recap
```

### 3.12 Messagerie

```
┌─────────────────────────────────┐
│  Messages              [Coach]  │  ← h1 + nom du coach
│                                 │
│  (espace scroll)                │
│                                 │
│       ┌──────────────────┐      │
│       │ Comment tu te    │      │  ← Bulle reçue (gauche)
│       │ sens pour demain?│      │     Fond #1E1E1E
│       └──────────────────┘      │     Radius : 16 (top-left 4)
│       17:10                     │     Timestamp 10px gris
│                                 │
│  ┌──────────────────┐           │
│  │ Super, prêt pour │           │  ← Bulle envoyée (droite)
│  │ la séance !      │           │     Fond gradient subtil
│  └──────────────────┘           │     (cyan 15% → violet 15%)
│                  17:15  ✓✓      │     Radius : 16 (top-right 4)
│                                 │     ✓✓ = lu (bleu si lu)
│                                 │
│  ┌──────────────────────────┐   │
│  │ [Message...]       [➤]  │   │  ← Input bar fixée en bas
│  └──────────────────────────┘   │     Fond #1E1E1E
│                                 │     Bouton envoi : cercle cyan
└─────────────────────────────────┘     Disabled si input vide

// Empty state (pas de coach) :
// - Grande icône bulle grisée (64px)
// - "Lie un coach pour accéder à la messagerie"
// - [GradientButton "Lier un coach"] → navigue vers Profil

// Empty state (coach lié, pas de messages) :
// - Icône bulle + vague
// - "Pas encore de messages"
// - "Envoie un premier message à ton coach !"

// FlatList inversée pour le scroll automatique en bas
// KeyboardAvoidingView pour que l'input remonte avec le clavier
```

### 3.13 Profil

```
┌─────────────────────────────────┐
│  Mon profil                     │  ← h1
│                                 │
│  ┌──────────────────────────┐   │
│  │  [Avatar]  Julien Martin │   │  ← Avatar 60×60 + nom
│  │           julien@mail.com│   │     email en caption gris
│  │           [Modifier]     │   │     TextButton cyan
│  └──────────────────────────┘   │
│                                 │
│  ── Informations ──             │  ← Section header 12px uppercase gris
│  ┌──────────────────────────┐   │
│  │  Genre          Homme    │   │  ← Rows lecture seule
│  │  Naissance   15/03/2001  │   │     Label gauche, valeur droite
│  │  Âge              24 ans │   │     Fond #141414 par row
│  │  Poids           75.0 kg │   │     Séparateurs #2A2A2A
│  │  Taille           180 cm │   │     Tap → édition inline
│  │  Niveau     Intermédiaire│   │     ou navigue vers edit screen
│  │  Objectif    Performance │   │
│  │  Fréquence    3×/semaine │   │
│  └──────────────────────────┘   │
│                                 │
│  ── Mon coach ──                │
│  ┌──────────────────────────┐   │
│  │  Coach Loïc    [Délier]  │   │  ← Si coach lié
│  └──────────────────────────┘   │
│  OU                             │
│  ┌──────────────────────────┐   │
│  │  [ A B C 1 2 3 ] [Lier] │   │  ← Si pas de coach : input + bouton
│  └──────────────────────────┘   │
│                                 │
│  ── Mes badges ──               │  ← Section avec les 4-5 derniers
│  ┌──────────────────────────┐   │     badges débloqués en row
│  │  👣 🎯 🔥 💪  [Voir tout]│   │     Tap "Voir tout" → écran badges
│  └──────────────────────────┘   │
│                                 │
│  ── Préférences ──              │  ← Uniquement si femme
│  ┌──────────────────────────┐   │
│  │  Suivi cycle    [toggle] │   │
│  └──────────────────────────┘   │
│                                 │
│  ── Données de santé ──         │
│  ┌──────────────────────────┐   │
│  │  Apple Health [Connecter]│   │  ← ou "✓ Synchronisé"
│  └──────────────────────────┘   │
│                                 │
│  ── Notifications ──            │
│  ┌──────────────────────────┐   │
│  │  Rappel check-in [toggle]│   │
│  │  Rappel séance   [toggle]│   │
│  │  Messages coach  [toggle]│   │
│  │  Alertes streak  [toggle]│   │
│  │  Récap hebdo     [toggle]│   │
│  └──────────────────────────┘   │
│                                 │
│  ── Compte ──                   │
│  ┌──────────────────────────┐   │
│  │  [Se déconnecter]        │   │  ← SecondaryButton
│  │  Supprimer mon compte    │   │  ← TextButton danger (rouge)
│  │  Version 1.0.0           │   │  ← Caption gris
│  └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘

// Section style :
// - Headers sections : 12px, uppercase, letterspacing 1, gris #666666, marginTop 32
// - Containers : fond #141414, radius 16, pas de border
// - Rows : height 52px, padding horizontal 16, separator 1px #2A2A2A
// - Labels : 16px, blanc
// - Valeurs : 16px, gris #A0A0A0, alignées à droite
// - Toggles : Switch natif avec trackColor={{ true: '#00F0FF', false: '#2A2A2A' }}
//   thumbColor="#FFFFFF"
```

### 3.14 Badges Screen

```
┌─────────────────────────────────┐
│  ← Retour    Mes badges        │
│              3 / 19 débloqués   │  ← Compteur, caption cyan
│                                 │
│  ── Spécial ──                  │
│  ┌────┐ ┌────┐ ┌────┐          │  ← Grille 3 colonnes
│  │ 👣 │ │ 🎯 │ │ ✨ │          │     Débloqué : fond coloré
│  │Prem.│ │C'est│ │Sem.│         │     Verrouillé : fond #333, gris
│  │ pas │ │parti│ │comp│         │     
│  └────┘ └────┘ └────┘          │
│                                 │
│  ── Streak ──                   │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │ 🔥 │ │ ⚡ │ │ 💎 │          │
│  │  7  │ │ 14 │ │ 30 │         │
│  │jours│ │jours│ │jours│        │
│  └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐                  │
│  │ 🏆 │ │ 👑 │                  │
│  │ 60 │ │ 100│                  │
│  └────┘ └────┘                  │
│                                 │
│  ── Séances ──                  │
│  (...)                          │
│                                 │
│  ── Records ──                  │
│  (...)                          │
│                                 │
└─────────────────────────────────┘

// Chaque badge :
// - Taille : (screenWidth - 40 - 24) / 3 (3 colonnes avec 12px gap)
// - Hauteur : identique à la largeur (carré)
// - Débloqué :
//   - Fond : catégorie couleur 15% opacity
//   - Icône : 32px, centré en haut
//   - Nom : 11px, bold, blanc, centré, 2 lignes max
//   - Date : 9px, gris, en bas
//   - Bordure : 1px solid catégorie couleur 30%
// - Verrouillé :
//   - Fond : #1E1E1E
//   - Icône : 32px, gris (grayscale ou emoji grisé)
//   - Nom : 11px, #555555
//   - Cadenas 🔒 petit en overlay
//   - Tap → bottom sheet avec condition de déblocage
```

---

## 4 — TAB BAR (NAVIGATION BOTTOM)

```typescript
// Configuration exacte de la tab bar

const tabBarOptions = {
  tabBarStyle: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    height: Platform.OS === 'ios' ? 88 : 64,  // Extra height pour safe area iOS
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabBarActiveTintColor: '#00F0FF',
  tabBarInactiveTintColor: '#666666',
  tabBarLabelStyle: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    marginTop: 2,
  },
};

// Icônes :
// Accueil : Ionicons "home-outline" (inactif) / "home" (actif)
// Séance : MaterialCommunityIcons "dumbbell" (toujours)
// Stats : Ionicons "stats-chart-outline" / "stats-chart"
// Messages : Ionicons "chatbubble-outline" / "chatbubble"
//   + badge rouge si unread > 0 (cercle 8×8 rouge en haut à droite de l'icône)
// Profil : Ionicons "person-outline" / "person"

// Indicateur actif : petit dot cyan (6×6) sous l'icône active
// Implémentation : custom tabBarIcon avec un View conditionnel
```

---

## 5 — ANIMATIONS GLOBALES — RÉCAPITULATIF TECHNIQUE

| Animation | Composant | Technique | Durée | Easing |
|-----------|-----------|-----------|-------|--------|
| Score compteur | ScoreCircle | useSharedValue + withTiming | 1500ms | Easing.out(cubic) |
| Score arc SVG | ScoreCircle | useSharedValue + useDerivedValue | 1500ms | Easing.out(cubic) |
| Bouton press | GradientButton | useAnimatedStyle + withSpring | ~200ms | spring(damping:15) |
| Slider step | AdaptSlider | Haptics.selectionAsync | instant | — |
| Bouton press haptic | GradientButton | Haptics.impactAsync(Medium) | instant | — |
| Mode badge apparition | ModeBadge | translateY + opacity + withSpring | 400ms | spring(damping:12) |
| Série terminée check | SessionExercise | scale 0→1.2→1.0 + withSpring | 400ms | springBouncy |
| Timer countdown | CircularTimer | useSharedValue decrement | continu | linear |
| Timer vibration | CircularTimer | Haptics.impactAsync(Light) | à 3,2,1,0 | — |
| Confetti | SessionComplete | react-native-confetti-cannon | 3000ms | — |
| Toast slide | Toast | translateY + opacity + withSpring | 300ms in, 300ms out | spring |
| Badge unlock | BadgeCard | scale 0→1.1→1.0 + withSpring | 500ms | springBouncy |
| PR indicator pulse | SessionExercise | opacity 0.5→1.0 loop | 1000ms | linear repeat |
| Skeleton shimmer | SkeletonLoader | translateX + LinearGradient | 1500ms | linear repeat |
| Check-in slide | CheckinFlow | slide_from_right (navigation) | 350ms | default |
| Pull to refresh | HomeScreen | RefreshControl tintColor cyan | native | native |
| Valeur slider bounce | AdaptSlider | scale 1→1.2→1 | 200ms | spring |

---

## 6 — GESTION DES ÉTATS D'ERREUR — SPECS VISUELLES

Chaque écran qui fait un appel réseau doit gérer 3 états. Voici les specs visuelles exactes :

**État loading (skeleton) :**
- Utiliser SkeletonLoader avec la forme des éléments de l'écran
- Pas de spinner basique sauf sur les boutons (ActivityIndicator)
- Timeout : si loading > 5 secondes, afficher le state error

**État error :**
```
│                                 │
│          ⚠️                     │  ← Icône 48px, rouge
│                                 │
│   Une erreur est survenue       │  ← h3 (18px), blanc
│                                 │
│   Vérifie ta connexion          │  ← body (16px), gris
│   et réessaie.                  │
│                                 │
│   [████ RÉESSAYER ██████████]   │  ← SecondaryButton
│                                 │

// Variante réseau :
// Message : "Problème de connexion. Vérifie ton réseau."
// Variante timeout :
// Message : "Le serveur met trop de temps à répondre."
// Variante check-in déjà fait :
// Message : "Tu as déjà fait ton check-in aujourd'hui. Modifiable jusqu'à 14h."
// + TextButton "Modifier mon check-in" (si avant 14h)
```

**État vide (empty state) :**
```
│                                 │
│          [emoji/icône]          │  ← 64px, centrée
│                                 │
│   [Titre contextuel]           │  ← h3 (18px), blanc
│                                 │
│   [Description]                │  ← body (16px), gris
│                                 │
│   [CTA Button contextuel]      │  ← GradientButton ou SecondaryButton
│                                 │
```

---

## 7 — RESPONSIVE & SAFE AREAS

```typescript
// Toujours utiliser SafeAreaView en racine de chaque écran
import { SafeAreaView } from 'react-native-safe-area-context';

// Layout de base pour chaque écran :
<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
  <ScrollView contentContainerStyle={{ padding: spacing.screenPadding }}>
    {/* contenu */}
  </ScrollView>
</SafeAreaView>

// Pour les écrans avec bouton fixé en bas :
<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
  <ScrollView contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 100 }}>
    {/* contenu scrollable */}
  </ScrollView>
  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.screenPadding, paddingBottom: spacing.xl, backgroundColor: colors.bg.primary }}>
    <GradientButton label="Action" onPress={...} fullWidth />
  </View>
</SafeAreaView>

// Status bar : toujours light content (texte blanc) sur fond sombre
import { StatusBar } from 'expo-status-bar';
<StatusBar style="light" />

// Keyboard avoiding :
import { KeyboardAvoidingView, Platform } from 'react-native';
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

---

## 8 — CHECKLIST UX/UI TECHNIQUE

- [ ] Fichier theme/index.ts créé avec tous les tokens
- [ ] GradientButton : gradient cyan→violet, press animation, haptics
- [ ] SecondaryButton : transparent + bordure
- [ ] Card : fond #141414, bordure, radius 20
- [ ] Input : fond #1E1E1E, focus cyan, error rouge
- [ ] AdaptSlider : track gradient, thumb blanc glow, dots, valeur animée, haptics
- [ ] ModeBadge : pill colorée par mode, option animated
- [ ] SkeletonLoader : shimmer animé sur chaque écran
- [ ] CircularTimer : arc SVG, countdown, vibrations, bouton passer
- [ ] ScoreCircle : arc SVG + compteur animé, 2 tailles
- [ ] Stepper : boutons +/-, valeur animée, haptics
- [ ] ProgressBar : gradient, animation de remplissage
- [ ] Toast : 4 types (badge, pr, info, error), slide down/up
- [ ] Splash screen : fond noir, logo ADAPT
- [ ] Login : 2 inputs, gradient button, animation d'entrée
- [ ] Register : validation temps réel, indicateur force password
- [ ] Onboarding 7 écrans : genre, date naissance, physique, niveau, objectif, fréquence, code coach
- [ ] Home : 2 états (check-in fait / à faire), skeleton, pull-to-refresh
- [ ] Check-in : slides horizontales, sliders custom, douleur conditionnel, cycle conditionnel
- [ ] Résultat check-in : animation score compteur + arc + mode badge
- [ ] Session overview : liste exercices avec mini GIFs, bouton démarrer fixé
- [ ] Session exercice : GIF démo, pills reps/charge, stepper, note coach, PR indicator
- [ ] Timer repos : cercle SVG, countdown, vibrations, bouton passer
- [ ] Session complete : confetti si PR, cards résumé/PRs/badges
- [ ] Feedback : slider RPE couleur dynamique, 3 pills ressenti, note libre
- [ ] Stats : résumé hebdo, calendrier coloré, graphe score, liste PRs
- [ ] Messagerie : bulles gauche/droite, timestamps, read indicator, empty state
- [ ] Profil : toutes les sections, toggles, liaison coach, badges preview
- [ ] Badges screen : grille 3 colonnes, locked/unlocked, bottom sheet conditions
- [ ] Tab bar : 5 onglets, icônes, dot actif cyan, badge notif messages
- [ ] Toutes les animations du tableau section 5 implémentées
- [ ] Tous les états d'erreur avec message FR et bouton réessayer
- [ ] Tous les empty states avec icône + texte + CTA
- [ ] SafeAreaView sur chaque écran
- [ ] StatusBar style="light" partout
- [ ] KeyboardAvoidingView sur les écrans avec inputs
