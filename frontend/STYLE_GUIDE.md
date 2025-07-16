# UrbanGo Style Guide

## Color System

### Brand Colors
- **Brand Purple:** Use `text-brand`, `bg-brand`, `border-brand` classes
- **Accent Light Purple:** Use `text-accent`, `bg-accent`, `border-accent` classes

### Button Types
- Primary action: `.btn-brand`
- Secondary action: `.btn-accent`
- Outline style: `.btn-outline`
- Ghost/text button: `.btn-ghost`
- Icon button: `.btn-icon`

### Card Components
- Basic card: `.card`
- Service card: `.service-card` 

### Text Colors
- Brand purple text: `.text-brand`
- Accent purple text: `.text-accent`
- For hover states: `.hover:text-brand`, `.hover:text-accent`

### Background Colors
- Brand purple background: `.bg-brand`
- Accent purple background: `.bg-accent`
- For hover states: `.hover:bg-brand`, `.hover:bg-accent`

## CSS Guidelines

1. **NEVER use hardcoded hex colors** like `#8137e6` or `#a97bfd`
2. Always use the global CSS classes defined in `index.css`
3. For new components, extend the global CSS system in `index.css` first
4. Use Tailwind's @apply directive to create new reusable classes
5. Keep component styling consistent across the application

## Class Naming Convention

- Use descriptive, semantic names
- Prefer `btn-brand` over generic `btn-primary`
- Prefix component classes with their type (btn-, card-, input-, etc.)
- Use `-` for word separation, not camelCase
