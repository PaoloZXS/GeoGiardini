---
name: Verde Giardino
colors:
  surface: '#f8faf8'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f2'
  surface-container: '#eceeec'
  surface-container-high: '#e6e9e7'
  surface-container-highest: '#e1e3e1'
  on-surface: '#191c1b'
  on-surface-variant: '#42493e'
  inverse-surface: '#2e3130'
  inverse-on-surface: '#eff1ef'
  outline: '#72796e'
  outline-variant: '#c2c9bb'
  surface-tint: '#3b6934'
  primary: '#154212'
  on-primary: '#ffffff'
  primary-container: '#2d5a27'
  on-primary-container: '#9dd090'
  inverse-primary: '#a1d494'
  secondary: '#4a6549'
  on-secondary: '#ffffff'
  secondary-container: '#ccebc7'
  on-secondary-container: '#506b4f'
  tertiary: '#00440e'
  on-tertiary: '#ffffff'
  tertiary-container: '#005e17'
  on-tertiary-container: '#75d974'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcf0ae'
  primary-fixed-dim: '#a1d494'
  on-primary-fixed: '#002201'
  on-primary-fixed-variant: '#23501e'
  secondary-fixed: '#ccebc7'
  secondary-fixed-dim: '#b0cfad'
  on-secondary-fixed: '#07200b'
  on-secondary-fixed-variant: '#334d33'
  tertiary-fixed: '#94f990'
  tertiary-fixed-dim: '#78dc77'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005313'
  background: '#f8faf8'
  on-background: '#191c1b'
  surface-variant: '#e1e3e1'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  edge-margin: 20px
  touch-target-min: 48px
---

## Brand & Style

The design system is centered around the concept of "Nurturing Growth." It aims to evoke feelings of tranquility, reliability, and organic connection. The target audience includes home gardeners and hobbyists who may not be tech-savvy, requiring a UI that feels as natural and unforced as a garden path.

The design style is **Modern Tactile**. It blends clean, functional layouts with soft, organic elements. By utilizing generous white space and high-contrast typography, the system ensures maximum legibility. The aesthetic is friendly and approachable, avoiding complex nested menus in favor of flat, accessible hierarchies that mimic the simplicity of nature.

## Colors

The palette is rooted in botanical tones to reinforce the brand's connection to gardening. 

- **Primary (Forest):** Used for key branding, primary buttons, and deep structural elements to provide a grounded feel.
- **Secondary (Sage):** A desaturated, calming green used for secondary actions, background washes, and decorative accents.
- **Tertiary (Leaf):** A vibrant, energetic green reserved for success states, growth indicators, and "active" plant statuses.
- **Neutral:** A high-contrast mix of pure white backgrounds and very light grey surfaces (mint-tinted) to ensure content remains the hero and eye strain is minimized during outdoor use.

## Typography

This design system utilizes **Plus Jakarta Sans** for its friendly, rounded terminals and exceptional legibility at various scales. The typeface balances a modern geometric structure with a soft, inviting personality.

Headlines use a tighter letter-spacing and heavier weights to create a strong visual anchor on mobile screens. Body text is set with generous line heights to ensure readability for users who may be viewing the app in bright, outdoor sunlight. Label styles are clear and punchy, helping users navigate complex plant care schedules at a glance.

## Layout & Spacing

The design system employs a **Fluid Mobile-First Grid**. 

- **Grid System:** A 4-column layout for mobile devices with a 20px outer margin and 16px gutters.
- **Rhythm:** An 8px linear scale governs all spatial relationships. 
- **Accessibility:** All interactive elements maintain a minimum 48x48px touch target to accommodate users who may be working with gloves or in varying physical conditions.
- **Adaptation:** On larger screens (tablets), the layout transitions to an 8-column grid with a maximum content width of 720px to maintain a focused, "journal-like" experience.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** rather than heavy shadows, maintaining a clean and modern appearance.

- **Level 0 (Base):** The primary background color (White).
- **Level 1 (Cards):** Light Grey surfaces (#F5F7F5) with subtle 1px "Sage" borders to define boundaries without adding visual weight.
- **Level 2 (Modals/Overlays):** These use very soft, diffused ambient shadows (4% opacity Forest Green tint) to suggest they are floating above the garden workspace.
- **Depth Cues:** Active states for buttons and plant cards use a slight inset shadow or a shift in color saturation to provide tactile feedback during interaction.

## Shapes

The shape language is **Organic and Friendly**. 

All primary components (Cards, Buttons, Inputs) use a 0.5rem (8px) corner radius to feel soft and safe. Interactive elements that represent growth—such as "Add Plant" buttons or progress chips—utilize fully rounded (pill-shaped) ends to evoke the form of seeds and smooth stones. This consistent curvature reinforces the non-technical, approachable nature of the app.

## Components

- **Primary Action Buttons:** Solid Forest Green with White text. Large padding (16px vertical) and pill-shaped for high visibility.
- **Plant Cards:** Large-format cards with a 1:1 image ratio for the plant. Use Level 1 elevation with a Sage border. Title text is Headline-MD.
- **Status Chips:** Small, rounded badges used to indicate plant health or sunlight needs. Success states (Healthy) use Leaf Green; warning states (Needs Water) use a soft terracotta.
- **Input Fields:** Soft Sage outlines that thicken and darken to Forest Green on focus. Labels are always visible above the field for clarity.
- **Progress Indicators:** Linear bars with rounded ends. The track is Sage, and the fill is Leaf Green, representing the "growth" of a task or plant stage.
- **Navigation:** A simple bottom tab bar with large, clear icons representing a watering can (Tasks), a leaf (My Garden), and a magnifying glass (Discover).
- **Weather Widget:** A specialized surface component with high-contrast icons to display local gardening conditions at the top of the home screen.