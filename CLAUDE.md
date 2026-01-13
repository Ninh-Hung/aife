# appaihelp.com Frontend Guidelines

This document defines the coding standards, project structure, and patterns for the appaihelp.com frontend project.

## Project Overview

- **Domain:** appaihelp.com (Multi-service AI Platform)
- **Primary Tech Stack:** React, TypeScript (TSX), Tailwind CSS, MUI v5 (Material UI).

## Technical Requirements & Patterns

### 1. Component Architecture

- Use **Functional Components** with hooks.
- **Type Safety:** Always define TypeScript interfaces for props and data models. Place shared types in `src/types/`.
- **Naming:** Use PascalCase for components (e.g., `TranslateCard.tsx`) and camelCase for hooks and utilities.

### 2. Styling Strategy

- **Tailwind + MUI Integration:** - Always use `StyledEngineProvider` with `injectFirst` in the root.
  - Prioritize Tailwind for layout, spacing, and simple styling.
  - Use MUI for complex interactive components (Selects, Drawers, Modals, Sliders).
- **Dark Mode:** Implement dark mode using Tailwind's `dark:` classes synced with MUI's `ThemeProvider`.

### 3. Code Style Preferences

- Use **Lucide React** for iconography.
- Favor early returns and clean code principles.
- Use `clsx` or `tailwind-merge` for conditional class joining.

## UI/UX Standards

- **Aesthetics:** Minimalist, SaaS-style, clean borders, soft shadows, rounded-lg (8px-12px).
- **Primary Color:** Electric Blue (`#3B82F6`) for primary actions.
- **Sidebar:** Fixed width (260px), dark themed by default or synced with system.

## Command Scripts

- `npm run dev`: Start Vite development server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint checks.

## Key Files to Reference

- `src/theme.ts`: Unified MUI and Tailwind theme configuration.
- `src/App.tsx`: Main routing and providers.

### 4. Rules

- always apply responsive when generate screen
