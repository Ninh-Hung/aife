# appaihelp.com - Multi-service AI Platform

A scalable, modern web application built with React, TypeScript, Material UI, and Tailwind CSS. This platform provides AI-powered services including multi-language translation, code generation, and image creation.

## 🎯 Features

### Translation Service

- **AI-Powered Translation**: Translate text into multiple languages simultaneously
- **Custom AI Agents**: Create and manage translation agents with different personas and creativity levels
- **Multi-language Output**: View translations in a clean, organized grid layout
- **Language Detection**: Automatic source language detection
- **Copy Functionality**: Quick copy-to-clipboard for all translations

### Core Features

- **Dark/Light Mode**: Seamless theme switching with synced MUI and Tailwind styles
- **Responsive Design**: Mobile-first approach with beautiful UI across all devices
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Modern Stack**: Built with React 18, Vite, and latest web technologies

## 🛠 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Libraries**:
  - Material UI (MUI) v5
  - Tailwind CSS v3
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Styling**: Emotion (MUI) + Tailwind CSS
- **Code Quality**: ESLint + Prettier with auto-formatting

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Sidebar, Layout)
│   ├── translate/      # Translation-specific components
│   └── agents/         # Agent management components
├── contexts/           # React contexts (Theme, Auth, Agents)
├── features/           # Feature-based modules
│   └── translate/      # Translation feature
├── theme/              # MUI theme configuration
├── types/              # TypeScript type definitions
├── App.tsx             # Main app component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles and Tailwind directives
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

1. **Clone the repository**

   ```bash
   cd /Users/mac/Desktop/PERSONAL_PROJECT/ai/aife
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

### Code Formatting

This project uses **Prettier** and **ESLint** for automatic code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check

# Fix linting errors
npm run lint:fix
```

**VS Code users**: Install recommended extensions and formatting will happen automatically on save!

📖 See [FORMATTING_GUIDE.md](./FORMATTING_GUIDE.md) for detailed formatting configuration and usage.

## 🎨 Styling Configuration

### MUI + Tailwind Integration

The project uses a unique configuration where:

1. **StyledEngineProvider** with `injectFirst` ensures Tailwind classes take precedence
2. **Shared Theme Context** syncs dark/light mode between MUI's `ThemeProvider` and Tailwind's `dark` class
3. **Color Palette** is aligned across both systems for consistency

Example usage:

```tsx
// MUI component with Tailwind classes
<Button variant="contained" className="bg-indigo-600 hover:bg-indigo-700">
  Click Me
</Button>
```

### Theme Toggle

Dark/light mode is controlled via:

- `ThemeContext` - Manages theme state
- `syncTailwindDarkMode()` - Toggles `dark` class on `<html>` element
- `MuiThemeProvider` - Updates MUI component styles

## 🔧 Configuration Files

- **`vite.config.ts`**: Vite build configuration
- **`tailwind.config.js`**: Tailwind CSS customization
- **`tsconfig.json`**: TypeScript compiler options
- **`postcss.config.js`**: PostCSS plugins (Tailwind, Autoprefixer)
- **`.prettierrc`**: Prettier code formatting rules
- **`.eslintrc.cjs`**: ESLint linting and code quality rules
- **`.vscode/settings.json`**: VS Code editor settings (auto-format on save)

## 📦 Key Dependencies

```json
{
  "@mui/material": "^5.15.10",
  "react": "^18.2.0",
  "react-router-dom": "^6.22.0",
  "lucide-react": "^0.323.0",
  "tailwindcss": "^3.4.1"
}
```

## 🎯 Component Patterns

### Functional Components with Hooks

```tsx
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<Type>(initialValue);

  return <Box className="tailwind-classes">{/* Component content */}</Box>;
};
```

### Type-Safe Interfaces

All data models are defined in `src/types/index.ts`:

- `User` - User account information
- `Agent` - AI agent configuration
- `TranslationResult` - Translation output data
- `Language` - Language metadata

## 🌐 Available Routes

- `/` - Redirects to `/translate`
- `/translate` - Multi-language translation workspace
- `/dashboard` - Dashboard (Coming Soon)
- `/agents` - Agent management (Coming Soon)
- `/subscription` - Subscription management (Coming Soon)
- `/code` - Code generation (Coming Soon)
- `/image` - Image generation (Coming Soon)

## 🎨 Design Principles

1. **Component-First**: Reusable, composable components
2. **Type Safety**: Strict TypeScript throughout
3. **Responsive**: Mobile-first design approach
4. **Accessibility**: WCAG-compliant components from MUI
5. **Performance**: Code splitting and lazy loading ready
6. **Scalability**: Feature-based organization for easy expansion

## 🔐 Authentication (Completed)

The authentication system is fully integrated using `AuthContext`.

- **User Data**: Access user info via `useAuth()` hook.
- **Protected Routes**: Use the `ProtectedRoute` component to wrap private pages.
- **API Interceptor**: Axios instance is configured to automatically attach the Bearer Token to headers for all requests.

## 🚧 Development Roadmap

### Completed ✅

- [x] Project structure and configuration
- [x] Theme system (MUI + Tailwind)
- [x] Sidebar navigation
- [x] Translation workspace
- [x] Agent management drawer
- [x] Dark/light mode toggle
- [x] User profile widget

### Coming Soon 🔜

- [ ] Connect to actual translation API
- [ ] Code generation service
- [ ] Image generation service
- [ ] User dashboard
- [ ] Subscription management
- [ ] Real authentication system
- [ ] API integration
- [ ] User preferences storage

## 📝 License

This project is private and proprietary.

## 👥 Author

Senior Frontend Engineer & UI/UX Expert

---

**Built with ❤️ using React, TypeScript, MUI, and Tailwind CSS**
