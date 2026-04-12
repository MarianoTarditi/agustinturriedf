# Design System Strategy: Kinetic Noir

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Noir."** 

We are moving away from the "generic gym" aesthetic and toward a high-end, editorial fitness experience. This system focuses on the tension between deep, infinite shadows and electric, kinetic energy. It avoids the cluttered "template" look by utilizing intentional asymmetry, expansive negative space, and a typography scale that feels like a premium fashion or fitness journal.

The goal is to make the user feel the "calm before the sweat"—a professional, focused environment where the trainer is the architect of the athlete's transformation. We achieve this through "The Void" (deep black backgrounds) contrasted against "The Pulse" (vibrant violet accents).

---

## 2. Colors & Tonal Depth

### The Palette
- **Primary Background:** `surface` (#131313) / Deep Black (#000000)
- **Sectional Shift:** `secondary_container` (#3c4962) / Dark Blue (#0A192F)
- **The Pulse (Accents):** `primary` (#deb7ff) and `primary_container` (#7b2cbf)

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. We define space through **Chiaroscuro (light and dark contrast)**. To separate the Hero from the "Services" section, transition the background from `surface` to `surface_container_low`. The boundary is felt, not seen.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers of obsidian and tinted glass.
- **Base Layer:** `surface` (#131313) for the main page flow.
- **Elevated Cards:** Use `surface_container` (#1f1f1f) to create a subtle lift.
- **Interactive Elements:** Use `surface_container_high` (#2a2a2a) for hover states or nested information.

### The "Glass & Gradient" Rule
To inject "soul" into the minimalist dark theme, utilize **Vignetted Glassmorphism**. Floating navigation or high-priority CTA cards should use a `surface_container` color at 70% opacity with a `40px` backdrop-blur. 
*Signature Texture:* Apply a linear gradient from `primary_container` (#7b2cbf) to `on_primary_fixed_variant` (#680eac) for primary CTAs to simulate a glowing, neon energy.

---

## 3. Typography: Editorial Authority

We use a high-contrast pairing to balance raw power with clinical precision.

- **Display & Headlines (Space Grotesk):** This is our "Power" font. It is wide, modern, and aggressive. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero headlines to demand immediate attention.
- **Body & Labels (Inter):** Our "Precision" font. Inter provides the technical, trustworthy counterbalance to the aggressive headlines.
- **The Hierarchy Strategy:** 
    - Use `headline-lg` in all-caps for section titles to mimic premium editorial layouts.
    - Use `body-lg` (1rem) for descriptions, ensuring a line-height of 1.6 for maximum readability against the dark background.
    - Primary CTA labels should use `label-md` with `0.1em` letter-spacing to feel "designed."

---

## 4. Elevation & Depth

### The Layering Principle
Avoid "Material" style drop shadows. Depth is achieved via **Tonal Layering**. 
- To make a "Pricing Card" stand out, do not add a shadow; instead, place a `surface_container_highest` card on a `surface` background. The slight shift in grey-value creates a sophisticated, "matte" lift.

### Ambient Shadows
If a floating element (like a testimonial popup) requires a shadow, use a **Tonal Bloom**.
- **Shadow Property:** `0px 20px 40px rgba(123, 44, 191, 0.08)`. This adds a faint violet "aura" rather than a grey shadow, making the element feel like it is emitting light.

### The "Ghost Border" Fallback
If visual separation is needed in high-density areas, use a **Ghost Border**: `1px solid` using the `outline_variant` token at **15% opacity**. It should be barely perceptible—a whisper of a boundary.

---

## 5. Components

### Buttons: The Kinetic Triggers
- **Primary:** Gradient fill (`primary_container` to `primary`). No border. `rounded-md` (0.375rem). High-contrast `on_primary_container` text.
- **Secondary:** `surface_variant` background with a `primary` Ghost Border. 
- **Interaction:** On hover, the primary button should "glow" by increasing the shadow-blur of its Tonal Bloom.

### Imagery: The Dark Overlay Strategy
All photography must feel high-end and gritty. 
- Apply a `surface` (#131313) color overlay at 40-60% opacity. 
- Use a **Gradient Map** effect where the highlights of the photo lean toward `secondary` (#b9c7e4) and shadows lean toward `surface_container_lowest`.

### Cards & Lists: The Negative Space Rule
- **No Dividers:** Prohibit the use of horizontal lines between list items. 
- **Separation:** Use `40px` of vertical white space (Spacing Scale) or alternating background tones (`surface` vs `surface_container_low`) to define list boundaries.
- **Bio-Cards:** For the trainer's profile, use a large-scale image that "breaks" the card container (asymmetric overflow) to create a custom, non-templated feel.

### Specialized Component: The "Stat Pulse"
- Small chips or labels used for "10+ Years Experience" or "500+ Clients." Use `primary_fixed_dim` text on a `surface_container_highest` background with a full-round (`9999px`) corner.

---

## 6. Do’s and Don’ts

### Do:
- **Use Intentional Asymmetry:** Align text to the left while keeping a CTA button weighted to the right to create visual tension.
- **Embrace "The Void":** Allow large sections of pure #000000 to exist. It focuses the eye on the `primary` violet accents.
- **Use Micro-animations:** Have violet accents "pulse" or expand slightly when hovered.

### Don't:
- **No Pure White Text:** Use `on_surface` (#e2e2e2) for body text. Pure white (#FFFFFF) on pure black causes "halation" (visual buzzing) and eye strain.
- **No Default Borders:** Never use a solid, high-contrast border for a card. It flattens the "Noir" depth.
- **No Standard Grids:** Avoid the "3-column feature row." Try a 2/3 and 1/3 split to maintain the editorial feel.

### Accessibility Note:
Ensure all violet (`primary_container`) components have a contrast ratio of at least 4.5:1 against the `surface` background. Use `primary_fixed` for smaller text elements to ensure legibility.