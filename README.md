# Rollover Typing Training

Client-side React SPA for focused drafting, spatial ideation, and constraint-driven argument development.

## Stack

- Vite + React + TypeScript
- Zustand for app state
- Tiptap for rich text editing and selection handling
- React Flow (XYFlow) for infinite canvas textlets
- Tailwind CSS for styling
- Framer Motion for transitions and liminal animations

## Run

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## UX Modules Included

- The Silence: full-screen atmospheric canvas with edge-reveal controls
- Toulmin Intercept: required Claim / Evidence / Warrant modal before drafting
- Spatial Textlets: highlight text in editor and detach into draggable canvas nodes
- SCAMPER Lenses: right dock toggles with prompt overlays and tinted contextual state
- Pull Paradigm: local random noun/verb/concept prompt from JSON for 5-second stimulus
- Liminal Triggers: ultra-low-opacity peripheral text with slow fade loops

## Data

- Random inspiration database: `public/pull-words.json`
