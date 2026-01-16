# Repository Guidelines

## Project Structure & Module Organization
- `index.html` is the Vite entry point.
- `src/main.js` bootstraps the Vue app and global styles.
- `src/App.vue` contains the primary UI and solver workflow.
- `src/utils/permutations.js` houses permutation helpers used by the solver.
- `src/components/` contains Vue components (currently minimal).
- `src/assets/` and `public/` store static assets and icons.
- `src/App-v1.vue` appears to be a legacy variant; avoid editing unless intentional.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server for local development.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for verification.

## Coding Style & Naming Conventions
- Vue 3 Single File Components with `<script setup>` (see `src/App.vue`).
- JavaScript uses single quotes and semicolons; indentation is 4 spaces in the existing files.
- Prefer descriptive, domain-focused names (e.g., `applyTemplates`, `handleGenerate`).
- Styling is Tailwind CSS; add utility classes in templates rather than new CSS files.

## Testing Guidelines
- No automated test framework is configured yet.
- If you add tests, also add the corresponding `npm` scripts and document how to run them.
- Keep new test files close to source (e.g., `src/utils/__tests__/permutations.test.js`).

## Commit & Pull Request Guidelines
- Git history shows short, sentence-style messages (e.g., "updated README.md"); there is no strict convention.
- Prefer concise, imperative messages: "Add concatenation guard".
- PRs should include a clear description, steps to verify, and screenshots for UI changes.

## Configuration & Tooling Notes
- Build tool: Vite (`vite.config.js`).
- CSS pipeline: Tailwind + PostCSS (`tailwind.config.cjs`, `postcss.config.cjs`).
- Math evaluation uses `mathjs`; avoid adding heavy compute dependencies without a clear need.
