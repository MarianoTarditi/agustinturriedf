# AgustinTurriEDF - Landing Page

Landing page profesional para AgustinTurriEDF, servicio de entrenamiento de fuerza personalizado.

## 🚀 Tecnologías

- **Astro** - Framework web
- **Tailwind CSS** - Estilos
- **Formspree** - Envío de formularios

## 🛠️ Instalación

```sh
npm install
```

## ▶️ Comandos

| Command | Action |
|---------|--------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Construye el proyecto para producción |
| `npm run preview` | Previsualiza el build localmente |

## 📁 Estructura

```
/
├── public/
│   └── icons/           # Iconos SVG
├── src/
│   ├── components/      # Componentes Astro
│   │   ├── Hero.astro
│   │   ├── Navbar.astro
│   │   ├── Plans.astro
│   │   ├── Facilities.astro
│   │   ├── Testimonials.astro
│   │   ├── FAQ.astro
│   │   ├── Contact.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

## ✨ Funcionalidades

- Diseño responsive
- Navegación con scroll activo
- Formulario de contacto con validación
- FAQ interactivo
- Enlace de acceso privado hacia la app Next.js (`PUBLIC_APP_URL/login`)
- Integración con WhatsApp
- Envío de emails via Formspree
