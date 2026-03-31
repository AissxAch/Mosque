# Noor Mosque Static Website

Production-ready static mosque website built with HTML, CSS, and JavaScript only.

## Structure

```text
/project
  index.html
  /css/style.css
  /js/main.js
  /js/threeScene.js
  /models/mosque.glb
  /assets/images/
```

## Run (Live Server)

1. Open `project` in VS Code.
2. Start Live Server on `index.html`.
3. Ensure internet access for Google Fonts + Three.js CDN modules.

## Features Included

- Minimal Islamic-inspired UI (arches, spacing, symmetry)
- Neutral color palette (white, beige, soft green)
- Fully responsive, mobile-first layout
- Smooth scrolling and subtle section reveal animations
- Hero CTA button: **View Mosque in 3D**
- Prayer times rendered from static JSON data in `main.js`
- Announcements, lessons, contact, and footer sections
- 3D canvas section with loading spinner + fade-in
- Three.js GLB loader from `/models/mosque.glb`
- Ambient and directional lighting
- OrbitControls with rotate enabled and zoom/pan disabled
- Slow auto-rotation
- Resize + pixel-ratio performance handling
- Visibility-aware render loop optimization
- Accessibility basics (skip link, contrast, ARIA labels, alt text)

## Supported 3D Formats

The 3D loader now supports all of these model types:

- `.glb`
- `.gltf`
- `.obj`
- `.fbx`
- `.stl`

Optional texture support:

- `.jpg` texture file via `texturePath` in `js/main.js`

## Model Notes

- Place your optimized mosque model at:
  - `models/mosque.glb`
- Or switch `modelPath` in `js/main.js` to any supported format (for example `./models/mosque.fbx`).
- If your format does not embed materials, you can provide `./models/mosque.jpg` (or any JPG path) in `texturePath`.
- Recommended export profile:
  - Binary glTF (`.glb`)
  - Use mesh compression and texture size optimization
  - Keep final model size low for mobile performance

## Current Included Model

- The file `models/mosque.glb` currently uses a free placeholder model so the 3D section works immediately.
- Source: Khronos glTF Sample Models (DamagedHelmet, glTF-Binary).
- License and attribution details are listed in `ATTRIBUTION.md`.

## Built-in Fallback

If `models/mosque.glb` is missing, empty, or invalid, the site automatically renders a procedural mosque (dome + minarets) in `threeScene.js`, so the 3D section still works immediately.

## Performance Guidance

- Prefer compressed textures (`.jpg/.webp`) and low draw-call models.
- Keep `mosque.glb` lightweight for fast first render.
- Avoid heavy post-processing to maintain <3s load on average devices.
