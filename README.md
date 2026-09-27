# Landingpage Opecode Monorepo

Este repositorio usa **npm workspaces** y orquesta dos apps:

- `agustinturriedf/landing` → Astro (puerto **3009**)
- `agustinturriedf/web` → Next.js (puerto **3010**)

## 🛠️ Instalación

Desde la raíz del repo:

```sh
npm install
```

## ▶️ Scripts (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Levanta **landing + web** en paralelo |
| `npm run dev:landing` | Levanta solo `agustinturriedf/landing` |
| `npm run dev:web` | Levanta solo `agustinturriedf/web` |

## 🌐 URLs esperadas en desarrollo

- Landing: `http://localhost:3009`
- Web: `http://localhost:3010`

## 📁 Estructura

```text
.
└── agustinturriedf/
    ├── landing/   # Astro app
    └── web/       # Next.js app
```
