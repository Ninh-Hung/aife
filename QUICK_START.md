# Quick Start Guide - appaihelp.com

## 🚀 Installation & Setup

```bash
# Navigate to project directory
cd /Users/mac/Desktop/PERSONAL_PROJECT/ai/aife

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will open at `http://localhost:3000` and automatically navigate to the Translation workspace.

## 📂 Complete File Structure

```
aife/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Main navigation sidebar
│   │   │   └── Layout.tsx           # App layout wrapper
│   │   ├── translate/
│   │   │   └── ResultCard.tsx       # Translation result card
│   │   └── agents/
│   │       └── AgentDrawer.tsx      # Agent creation/edit drawer
│   ├── contexts/
│   │   ├── ThemeContext.tsx         # Dark/light mode management
│   │   ├── AuthContext.tsx          # User authentication
│   │   └── AgentsContext.tsx        # AI agents state management
│   ├── features/
│   │   └── translate/
│   │       └── TranslationPage.tsx  # Main translation workspace
│   ├── theme/
│   │   └── theme.ts                 # MUI + Tailwind theme config
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   ├── App.tsx                       # Main app with routing
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Global styles + Tailwind
├── index.html                        # HTML template
├── vite.config.ts                    # Vite configuration
├── tailwind.config.js                # Tailwind configuration
├── tsconfig.json                     # TypeScript config
├── postcss.config.js                 # PostCSS config
└── package.json                      # Dependencies
```

## 🎨 Key Features Implemented

### 1. Sidebar Navigation (`src/components/layout/Sidebar.tsx`)

- Fixed sidebar with logo "appaihelp.com"
- Main navigation: Dashboard, My Agents, Subscription....
- Service navigation: Translation, Code Gen, Image Gen
- Dark/Light mode toggle
- User profile widget with avatar, name, email, and subscription badge

**Key Props:**
```tsx
interface SidebarProps {
  user: User;
}
```

### 2. Translation Workspace (`src/features/translate/TranslationPage.tsx`)

- Agent selector (MUI Select dropdown)
- "New Agent" button that opens the drawer
- Two-column layout:
  - **Left**: Source text input with language detection
  - **Right**: Grid of result cards (2 columns on desktop)
- Real-time translation status (pending, processing, completed, failed)

**Key Props:**
```tsx
interface TranslationPageProps {
  agents: Agent[];
  onCreateAgent: () => void;
}
```

### 3. Agent Management Drawer (`src/components/agents/AgentDrawer.tsx`)

Slides in from the right with the following form fields:
- **Agent Name**: Text input
- **Role/Persona**: Text input with helper text
- **System Prompt**: Multiline text field (8 rows)
- **Creativity Level**: Slider (0-100) with visual marks

**Form Validation:**
- Name required
- Role required
- System prompt required (min 20 characters)

**Key Props:**
```tsx
interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: CreateAgentInput) => Promise<void>;
}
```

### 4. Theme System (`src/contexts/ThemeContext.tsx` + `src/theme/theme.ts`)

**Features:**
- Syncs MUI `ThemeProvider` with Tailwind `dark` class
- Persists to `localStorage`
- Respects system preference on first load
- `StyledEngineProvider` with `injectFirst` for Tailwind precedence

**Usage:**
```tsx
import { useTheme } from './contexts/ThemeContext';

const MyComponent = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current mode: {mode}
    </button>
  );
};
```

### 5. Type-Safe Data Models (`src/types/index.ts`)

All interfaces defined:
- `User` - User account with subscription
- `Agent` - AI agent configuration
- `TranslationResult` - Translation output
- `Language` - Language metadata with flag emoji
- `CreateAgentInput` - Form input for new agents

**Example:**
```tsx
interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  creativityLevel: number; // 0-100
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🎯 Usage Examples

### Switching Theme

1. Look at the bottom of the sidebar
2. Click the Sun/Moon icon next to the mode label
3. Theme instantly switches across all components

## 🔧 Customization Guide

### Adding a New Language

Edit `src/types/index.ts`:
```tsx
export const SUPPORTED_LANGUAGES: Language[] = [
  // ... existing languages
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    flag: '🇹🇭'
  },
];
```

### Changing Color Palette

Edit `src/theme/theme.ts`:
```tsx
const lightPalette = {
  primary: {
    main: '#your-color', // Change primary color
  },
  // ...
};
```

Also update `tailwind.config.js` for consistency.

### Adding a New Service Route

1. Add route in `src/App.tsx`:
```tsx
<Route
  path="/new-service"
  element={<NewServicePage />}
/>
```

2. Add navigation item in `src/components/layout/Sidebar.tsx`:
```tsx
const serviceNavItems = [
  // ... existing services
  {
    id: 'new-service',
    label: 'New Service',
    path: '/new-service',
    Icon: YourIcon,
  },
];
```

## 🎨 Styling Best Practices

### Combining MUI + Tailwind

```tsx
// ✅ Good - MUI component with Tailwind utilities
<Button
  variant="contained"
  className="bg-indigo-600 hover:bg-indigo-700 rounded-lg"
>
  Click Me
</Button>

// ✅ Good - MUI Box with Tailwind layout
<Box className="flex items-center gap-4 p-6">
  <Typography>Content</Typography>
</Box>

// ❌ Avoid - Conflicting styles
<Button
  sx={{ backgroundColor: 'red' }} // MUI sx
  className="bg-blue-500"          // Tailwind (conflicts)
>
  Don't do this
</Button>
```

### Dark Mode Classes

```tsx
// ✅ Use Tailwind dark mode variants
<div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
  Automatically switches with theme
</div>
```

## 🐛 Troubleshooting

### Dark mode not working?

Check that:
1. `tailwind.config.js` has `darkMode: 'class'`
2. `syncTailwindDarkMode()` is called in ThemeContext
3. All dark mode classes use `dark:` prefix

### Tailwind classes not applying?

Ensure:
1. `StyledEngineProvider` has `injectFirst` prop
2. PostCSS is configured correctly
3. Import `./index.css` in `main.tsx`

### TypeScript errors?

Run:
```bash
pnpm run build
```
This will show all type errors. Fix them for type safety.

## 📦 Production Build

```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

Build output goes to `dist/` directory.

## 🎉 Next Steps

1. **Connect to Real APIs**: Replace mock data with actual API calls
2. **Add More Services**: Implement Code Generation and Image Generation
3. **Implement Auth**: Replace mock auth with Firebase/Auth0
4. **Add Tests**: Set up Jest + React Testing Library
5. **Deploy**: Deploy to Vercel, Netlify, or your preferred platform

---

**Happy Coding! 🚀**
