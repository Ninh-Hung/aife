# Toast Notification System

This document explains how to use the global toast notification system in the appaihelp.com frontend.

## Overview

We've replaced static MUI Alert components with a global toast notification system using **notistack**. This provides a better, non-intrusive user experience for displaying success and error messages.

## Features

- **Global System**: Toast notifications can be triggered from anywhere in the app
- **Customized Design**: Minimalist styling with Lucide React icons
- **Responsive**: Top-right on desktop, top-center on mobile
- **Auto-dismiss**: Messages automatically disappear after 4 seconds
- **Duplicate Prevention**: Same messages won't stack up
- **Automatic API Error Handling**: Axios interceptor automatically shows toasts for unhandled API errors

## How to Use Toast Notifications

### Basic Usage

Import the `useNotification` hook in your component:

```typescript
import { useNotification } from '../hooks/useNotification';

const MyComponent = () => {
  const { success, error, warning, info } = useNotification();

  const handleAction = async () => {
    try {
      await someApiCall();
      success('Operation completed successfully!');
    } catch (err) {
      error('Something went wrong');
    }
  };

  return (
    <button onClick={handleAction}>Do Something</button>
  );
};
```

### Available Methods

The `useNotification` hook provides the following methods:

#### `success(message: string, options?)`
Shows a green success toast with a check icon.

```typescript
success('API key created successfully!');
```

#### `error(message: string, options?)`
Shows a red error toast with an alert triangle icon.

```typescript
error('Failed to save changes');
```

#### `warning(message: string, options?)`
Shows a yellow warning toast with an alert circle icon.

```typescript
warning('Your session will expire soon');
```

#### `info(message: string, options?)`
Shows a blue info toast with an info icon.

```typescript
info('New features are available');
```

#### `notify(message: string, options?)`
Generic method for custom toast configurations.

```typescript
notify('Custom message', {
  variant: 'success',
  autoHideDuration: 6000
});
```

#### `close(key?)`
Closes a specific notification or all notifications.

```typescript
const key = success('Saving...');
// Later...
close(key);
```

### Advanced Options

You can customize toast behavior with options:

```typescript
success('Changes saved', {
  autoHideDuration: 6000, // 6 seconds instead of default 4
  preventDuplicate: false  // Allow duplicate messages
});
```

## Examples from the Codebase

### Example 1: API Key Management (src/pages/ApiKeyManagement.tsx)

```typescript
export const ApiKeyManagement: React.FC = () => {
  const { success, error } = useNotification();

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      success('API key copied to clipboard');
    } catch (err) {
      error('Failed to copy API key');
    }
  };

  // ... more code
};
```

### Example 2: Subscription Management (src/pages/SubscriptionPage.tsx)

```typescript
export const SubscriptionPage: React.FC = () => {
  const { success, error } = useNotification();

  const handleCancelSubscription = async () => {
    try {
      const result = await cancelSubscription();
      if (result.success) {
        success('Subscription cancelled successfully');
        await fetchAllData();
      } else {
        error(result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  // ... more code
};
```

## Automatic API Error Handling

The axios interceptor automatically shows error toasts for unhandled API errors. This means:

- **4xx/5xx errors** that aren't caught by try-catch blocks will automatically show error toasts
- **401 errors** are excluded (handled by the auth flow)
- You don't need to manually handle errors for every API call

This provides a safety net for any missed error handling in the application.

## Architecture

### Components

1. **NotificationProvider** (`src/components/notifications/NotificationProvider.tsx`)
   - Wraps the entire app in `App.tsx`
   - Provides the toast notification system globally
   - Includes custom styled toast components with Lucide icons
   - Sets up axios interceptor for automatic error handling

2. **useNotification Hook** (`src/hooks/useNotification.ts`)
   - Custom hook that wraps notistack's `useSnackbar`
   - Provides a cleaner, more intuitive API
   - Type-safe methods for different notification types

3. **Axios Toast Setup** (`src/lib/axiosToastSetup.ts`)
   - Configures axios interceptor for automatic error toasts
   - Excludes 401 errors (handled by auth)
   - Prevents duplicate error messages

## Migration Notes

When migrating from MUI Alerts to toast notifications:

### Before (Old Pattern)
```typescript
const [error, setError] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);

// In JSX:
{error && (
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}
{successMessage && (
  <Alert severity="success" onClose={() => setSuccessMessage(null)}>
    {successMessage}
  </Alert>
)}
```

### After (New Pattern)
```typescript
const { success, error } = useNotification();

// In your handlers:
if (response.success) {
  success('Operation completed!');
} else {
  error(response.error || 'Operation failed');
}

// Remove the Alert JSX entirely - toasts appear automatically
```

## Best Practices

1. **Use descriptive messages**: Make error and success messages clear and actionable
2. **Don't duplicate**: If axios interceptor handles errors automatically, don't also show manual toasts
3. **Keep it brief**: Toast messages should be concise (1-2 sentences max)
4. **Use appropriate severity**: Match the toast type to the message (success, error, warning, info)
5. **Clean up state**: You can remove local error/success state variables when using toasts

## Troubleshooting

### Toasts not appearing?
- Ensure `NotificationProvider` is wrapping your component in the component tree (check `App.tsx`)
- Verify you're calling the toast methods correctly
- Check browser console for errors

### Duplicate toasts?
- The system has `preventDuplicate` enabled by default
- If you're seeing duplicates, you might be triggering toasts in multiple places for the same error

### Toasts position wrong on mobile?
- The system automatically adjusts position based on screen size
- Mobile: top-center
- Desktop: top-right

## Dependencies

- `notistack`: ^3.0.2
- `@mui/material`: For `useMediaQuery` hook
- `lucide-react`: For toast icons
