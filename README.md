# Kinetic Noir - Landing Page

Landing page profesional para Kinetic Noir, servicio de entrenamiento de fuerza personalizado.

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
- Modal "Próximamente" para inicio de sesión
- Integración con WhatsApp
- Envío de emails via Formspree
