# Code Formatting Guide

This project uses **Prettier** and **ESLint** to ensure consistent code style and quality across the codebase.

## 🛠 Tools Overview

### Prettier
- **Purpose**: Automatic code formatting
- **Config**: `.prettierrc`
- **Ignore**: `.prettierignore`
- **Plugin**: `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes)

### ESLint
- **Purpose**: Code quality and error detection
- **Config**: `.eslintrc.cjs`
- **Integration**: Works with Prettier to avoid conflicts

## 📦 Installation

All dependencies are already in `package.json`. Just run:

```bash
pnpm install
```

### Installed Packages

```json
{
  "prettier": "^3.2.5",
  "prettier-plugin-tailwindcss": "^0.5.11",
  "eslint": "^8.56.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-prettier": "^5.1.3"
}
```

## 🎯 Usage

### Command Line

```bash
# Format all files
pnpm run format

# Check formatting without changing files
pnpm run format:check

# Fix ESLint errors automatically
pnpm run lint:fix

# Check for ESLint errors
pnpm run lint
```

### VS Code (Recommended)

#### 1. Install Recommended Extensions

When you open the project, VS Code will prompt you to install recommended extensions:
- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **ES7+ React/Redux snippets** (`dsznajder.es7-react-js-snippets`)

Or install manually:
```bash
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
```

#### 2. Auto-Format on Save

The project includes `.vscode/settings.json` which enables:
- ✅ Format on save
- ✅ ESLint auto-fix on save
- ✅ Organize imports on save
- ✅ Tailwind class sorting

**It just works!** Save any file and it will auto-format.

#### 3. Manual Format

- **Format Document**: `Shift + Alt + F` (Windows/Linux) or `Shift + Option + F` (Mac)
- **Format Selection**: Select code and press format shortcut

## ⚙️ Configuration Details

### Prettier Rules (`.prettierrc`)

```json
{
  "semi": true,                    // Use semicolons
  "trailingComma": "es5",          // Trailing commas where valid in ES5
  "singleQuote": true,             // Use single quotes
  "printWidth": 100,               // Wrap lines at 100 characters
  "tabWidth": 2,                   // 2 spaces for indentation
  "useTabs": false,                // Use spaces, not tabs
  "arrowParens": "always",         // Always use parens in arrow functions
  "bracketSpacing": true,          // Spaces in object literals
  "endOfLine": "lf",               // Unix-style line endings
  "jsxSingleQuote": false,         // Double quotes in JSX
  "plugins": ["prettier-plugin-tailwindcss"]  // Sort Tailwind classes
}
```

### ESLint Rules (`.eslintrc.cjs`)

```javascript
{
  "rules": {
    "prettier/prettier": "error",        // Prettier violations are errors
    "@typescript-eslint/no-unused-vars": "warn",  // Warn on unused vars
    "@typescript-eslint/no-explicit-any": "warn"  // Warn on 'any' type
  }
}
```

## 📝 Formatting Examples

### Before Prettier

```tsx
// ❌ Inconsistent formatting
import React,{useState} from 'react'
import {Box,Button,Typography} from "@mui/material";

const MyComponent:React.FC=({name})=>{
const [count,setCount]=useState(0)

return <Box className="flex items-center gap-4 p-6 bg-white dark:bg-slate-800"><Typography variant="h5">{name}: {count}</Typography><Button onClick={()=>setCount(count+1)}>Increment</Button></Box>
}
```

### After Prettier

```tsx
// ✅ Clean, consistent formatting
import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

const MyComponent: React.FC = ({ name }) => {
  const [count, setCount] = useState(0);

  return (
    <Box className="flex items-center gap-4 bg-white p-6 dark:bg-slate-800">
      <Typography variant="h5">
        {name}: {count}
      </Typography>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </Box>
  );
};
```

### Tailwind Class Sorting

The `prettier-plugin-tailwindcss` automatically sorts Tailwind classes:

```tsx
// Before (random order)
<div className="p-4 text-white bg-blue-500 flex items-center rounded-lg shadow-md">

// After (sorted by Tailwind's recommended order)
<div className="flex items-center rounded-lg bg-blue-500 p-4 text-white shadow-md">
```

**Order**: Layout → Positioning → Display → Spacing → Sizing → Typography → Visual → Misc

## 🔧 Customization

### Change Prettier Settings

Edit `.prettierrc`:

```json
{
  "semi": false,           // Remove semicolons
  "singleQuote": false,    // Use double quotes
  "printWidth": 120        // Longer lines
}
```

Then run `npm run format` to reformat all files.

### Add ESLint Rules

Edit `.eslintrc.cjs`:

```javascript
{
  "rules": {
    "no-console": "warn",           // Warn on console.log
    "prefer-const": "error",        // Require const when possible
    "react-hooks/exhaustive-deps": "warn"  // Check hook dependencies
  }
}
```

## 🚫 Ignoring Files

### Ignore from Prettier

Add to `.prettierignore`:

```
# Don't format generated files
src/generated/
*.min.js
```

### Ignore from ESLint

Add to `.eslintrc.cjs`:

```javascript
{
  "ignorePatterns": ["dist", "build", "*.config.js"]
}
```

### Ignore Specific Lines

```tsx
// Disable Prettier for one line
// prettier-ignore
const uglyObject = {a:1,b:2,c:3}

// Disable ESLint for one line
const apiKey = 'secret'; // eslint-disable-line no-console

// Disable ESLint for next line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = unknownData;
```

## 🎨 Tailwind CSS IntelliSense

With the VS Code extension installed, you get:

- **Autocomplete**: Class name suggestions as you type
- **Hover Preview**: See CSS for Tailwind classes on hover
- **Syntax Highlighting**: Color-coded Tailwind classes
- **Linting**: Warnings for invalid/deprecated classes

Works in:
- `className="..."` props
- `class="..."` attributes (HTML)
- Template strings with class names

## 🐛 Troubleshooting

### Formatting Not Working in VS Code?

1. **Check Default Formatter**
   - Right-click in a file → "Format Document With..." → Choose "Prettier"
   - Or set in `.vscode/settings.json`: `"editor.defaultFormatter": "esbenp.prettier-vscode"`

2. **Check Prettier Extension is Installed**
   - Open Extensions panel (Ctrl+Shift+X)
   - Search for "Prettier"
   - Ensure it's installed and enabled

3. **Reload VS Code**
   - Press `Ctrl+Shift+P` → "Reload Window"

### ESLint Errors Not Showing?

1. **Check ESLint Extension is Installed**
2. **Check Output Panel**
   - View → Output → Select "ESLint" from dropdown
   - Look for error messages

3. **Restart ESLint Server**
   - Press `Ctrl+Shift+P` → "ESLint: Restart ESLint Server"

### Prettier and ESLint Conflicting?

This shouldn't happen because we use `eslint-config-prettier` which disables all ESLint formatting rules that conflict with Prettier.

If you see conflicts:
1. Make sure `plugin:prettier/recommended` is **last** in ESLint extends array
2. Run `npm install` to ensure all plugins are installed
3. Restart your editor

### Format on Save Not Working?

Check `.vscode/settings.json` contains:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 📋 Pre-commit Hooks (Optional)

To enforce formatting before commits, install Husky + lint-staged:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

Now every commit will auto-format changed files!

## ✅ Best Practices

1. **Always run `npm run format` before committing**
2. **Enable format-on-save in your editor**
3. **Don't fight the formatter** - let Prettier handle style
4. **Focus on code logic** - not formatting
5. **Use ESLint to catch bugs** - not style issues
6. **Keep Prettier config simple** - fewer rules = less debate

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server

# Formatting
npm run format           # Format all files with Prettier
npm run format:check     # Check if files are formatted

# Linting
npm run lint             # Check for ESLint errors
npm run lint:fix         # Fix ESLint errors automatically

# Build
npm run build            # Type-check and build for production
```

---

**Happy coding with consistent, beautiful code! ✨**
