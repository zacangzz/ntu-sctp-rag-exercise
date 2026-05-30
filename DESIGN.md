---
name: Lumina Research Laboratory
colors:
  surface: '#f9f9fe'
  surface-dim: '#dad9df'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f9'
  surface-container: '#eeedf3'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c20'
  on-surface-variant: '#434750'
  inverse-surface: '#2f3035'
  inverse-on-surface: '#f0f0f6'
  outline: '#747781'
  outline-variant: '#c4c6d2'
  surface-tint: '#3c5d9d'
  primary: '#3c5d9d'
  on-primary: '#ffffff'
  primary-container: '#5676b8'
  on-primary-container: '#000515'
  inverse-primary: '#aec6ff'
  secondary: '#525e79'
  on-secondary: '#ffffff'
  secondary-container: '#d4dfff'
  on-secondary-container: '#57637e'
  tertiary: '#795900'
  on-tertiary: '#ffffff'
  tertiary-container: '#977108'
  on-tertiary-container: '#090500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#214584'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#bac6e5'
  on-secondary-fixed: '#0f1b33'
  on-secondary-fixed-variant: '#3b4760'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#efc058'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f9f9fe'
  on-background: '#1a1c20'
  surface-variant: '#e2e2e7'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 25px
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm-caps:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  telemetry-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  sidebar-collapsed: 72px
  max-content-width: 1200px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system evolves the "Deep Space Cyberpunk" aesthetic into a "Clean Laboratory" environment. It maintains the high-tech, pipeline-focused personality of a high-performance RAG (Retrieval-Augmented Generation) cockpit but shifts the emotional response from "Midnight Cockpit" to "Advanced Scientific Research Facility."

The design style is a refined **Light-Mode Glassmorphism**. It utilizes a surgical, technical environment characterized by clinical precision, high-contrast typography, and ethereal frosted glass surfaces. The brand identity is sophisticated and airy, trading the heavy neon glows of the night for the subtle, diffused light of a sunlit, high-tech workspace.

**Key Stylistic Pillars:**
- **Surgical Precision:** Clean lines, generous whitespace, and sharp geometric scales.
- **Ethereal Depth:** Use of backdrop blurs and semi-transparent layers to suggest physical material without weight.
- **Accented Utility:** Steel blue and muted amber are used strictly for data visualization, status, and interactive feedback, ensuring the UI feels like a functional tool rather than a decorative interface.

## Colors

The color palette is anchored in a neutral, professional foundation. The transition from high-saturation neon to a more academic palette emphasizes stability and precision.

- **Primary & Secondary:** The Steel Blue (`#5676b8`) and Slate Blue (`#6b7793`) have been chosen to provide a calm, trustworthy atmosphere. They function as the "high-performance" signals within the research environment, used for primary actions and navigational anchors.
- **Tertiary Accent:** A functional Amber (`#e0b24c`) is used sparingly for highlighting critical data points, warnings, or specialized "Gold Standard" results in the RAG pipeline.
- **Surface Strategy:** Backgrounds utilize a "clean slate" approach. Main workspace areas use the neutral base, while interactive panels utilize a "frosted glass" effect (`rgba(255, 255, 255, 0.7)`) with a `20px` backdrop blur.
- **Typography Contrast:** Text follows a strict hierarchy of deep charcoal and slate tones. Avoid pure black to maintain the sophisticated, laboratory feel.

## Typography

This design system exclusively uses **Outfit** for its geometric, high-tech character. The hierarchy is built on clarity and structural efficiency.

- **Headlines:** Large headers use a tighter letter-spacing to feel "engineered" and precise.
- **Data Labels:** Use `label-sm-caps` for structural headers like "INFERENCE PARAMETERS" or "SOURCE NODES" to create a distinct visual break from prose.
- **Technical Readouts:** While the primary UI is Outfit, technical telemetry and code blocks should utilize a monospaced font like **JetBrains Mono** to maintain the pipeline-focused personality.
- **Mobile Scaling:** For mobile devices, `display-lg` should scale down to `24px` to maintain comfortable readability in tight viewports.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed to provide constant access to system controls, while the main workspace is a fluid container centered within a maximum width of `1200px`.

- **Grid:** Use a 12-column grid for complex data views. Gutters are fixed at `24px` to maintain white space "breathing room."
- **Sidebar:** On desktop, the sidebar is a wide frosted panel. Below `900px`, it collapses into a slim vertical bar (`72px`) showing only icons.
- **Rhythm:** Vertical spacing relies on a strict 8px baseline. Use `stack-lg` (`32px`) to separate major logical sections like "Chat Interface" from "Pipeline Observability."

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than heavy shadows.

- **Base Layer:** The light neutral background.
- **Surface Layer:** Frosted glass panels (`rgba(255, 255, 255, 0.7)`) with a `20px` backdrop blur. These panels use a very subtle `1px` border (`rgba(0, 0, 0, 0.05)`) to define their edges.
- **Interactive Depth:** When a card or button is hovered, use a "Lift and Glow" effect: a subtle `translateY(-2px)` combined with a soft, wide-dispersion shadow tinted with the primary blue accent color.
- **No Heavy Shadows:** Avoid deep black shadows. The goal is to feel like light is passing through surfaces, not being blocked by them.

## Shapes

The shape language is "Functional Geometric." It uses a variety of corner radii to denote different levels of container nesting.

- **Primary Widgets (`8px`):** Used for buttons, input fields, and standard cards.
- **Content Panels (`16px`):** Used for large workspace containers and chat bubbles.
- **System Wrappers (`24px`):** Used for the main sidebar and outermost application containers.
- **Pill Shapes:** Reserved strictly for status badges, progress bars, and toggle switches.

## Components

### 1. Action Buttons
- **Primary:** Solid steel blue (`#5676b8`) background with white text. On hover, the button should appear to "incandesce" with a soft blue shadow.
- **Ghost:** Transparent background with a `1px` border of `border-subtle`. Used for secondary actions like "Export" or "View Source."

### 2. Glass Cards
Standard containers for document previews and metadata. They must feature a `backdrop-filter: blur(20px)` and a thin, semi-transparent border. This ensures they remain legible even if there are subtle background gradients or overlapping elements.

### 3. Pipeline Nodes & Lines
Nodes are styled as high-contrast circles with a white center and a `2px` primary-colored border. The connection lines between nodes in the RAG pipeline should be light grey, turning into a solid primary steel blue as the process completes.

### 4. Input Fields
Inputs use a solid white background to pop against the neutral base. Focus states should be indicated by a `2px` primary-colored border and a soft glow, never a default browser outline.

### 5. Chat Interface
- **Assistant Responses:** Distinguished by a `4px` solid steel blue left-border and a very faint blue tint (`rgba(86, 118, 184, 0.02)`) in the bubble background.
- **User Prompts:** Styled as clean, frosted glass bubbles with dark slate text.
- **Source Citations:** Monospaced "chips" that expand into a monospace laboratory-style text viewer.