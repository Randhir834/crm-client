# CRM Client - React Application

## Project Structure

This React application follows a well-organized, scalable structure that separates concerns and makes the codebase maintainable.

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Shared components (buttons, forms, etc.)
│   ├── layout/          # Layout components
│   │   ├── Navigation.js
│   │   ├── Layout.js
│   │   └── ProtectedRoute.js
│   └── ui/              # UI-specific components
├── pages/               # Page-level components
│   ├── auth/            # Authentication pages
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── ForgotPassword.js
│   │   └── ResetPassword.js
│   ├── dashboard/       # Dashboard pages
│   │   ├── Dashboard.js
│   │   └── AdminDashboard.js
│   └── leads/           # Leads management pages
│       └── Leads.js
├── hooks/               # Custom React hooks
│   ├── useLocalStorage.js
│   └── useApi.js
├── utils/               # Utility functions
│   └── index.js
├── constants/           # App constants
│   └── index.js
├── styles/              # Global styles and CSS modules
│   ├── App.css
│   └── Auth.css
├── services/            # API services
│   └── api.js
├── context/             # React context providers
│   └── AuthContext.js
└── assets/              # Static assets
    └── logo.png
```

## Key Features

### Components Organization
- **Layout Components**: Navigation, Layout wrapper, and route protection
- **Page Components**: Organized by feature (auth, dashboard, leads)
- **Common Components**: Reusable UI elements (to be added as needed)

### Custom Hooks
- **useLocalStorage**: Persistent state management
- **useApi**: Centralized API calls with loading/error states

### Utilities
- **Date formatting**: Consistent date display across the app
- **Validation**: Form validation helpers
- **Storage**: Local storage utilities
- **Error handling**: Centralized error management

### Constants
- **API endpoints**: Centralized API route definitions
- **App routes**: Frontend routing constants
- **Validation rules**: Form validation constants
- **Status enums**: Lead statuses and user roles

## Import Patterns

### Using Index Files
```javascript
// Instead of individual imports
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';

// Use grouped imports
import { Login, Register } from './pages/auth';
import { Dashboard, AdminDashboard } from './pages/dashboard';
import { Navigation, Layout } from './components/layout';
```

### Using Constants
```javascript
import { LEAD_STATUSES, USER_ROLES, API_ENDPOINTS } from './constants';

// Use constants instead of magic strings
const status = LEAD_STATUSES.QUALIFIED;
const role = USER_ROLES.ADMIN;
const endpoint = API_ENDPOINTS.LEADS.BASE;
```

### Using Utilities
```javascript
import { formatDate, validateEmail, debounce } from './utils';

// Consistent formatting and validation
const formattedDate = formatDate(user.createdAt);
const isValidEmail = validateEmail(email);
const debouncedSearch = debounce(searchFunction, 300);
```

### Using Custom Hooks
```javascript
import { useLocalStorage, useApi } from './hooks';

// Persistent state and API management
const [theme, setTheme] = useLocalStorage('theme', 'light');
const { loading, error, apiCall } = useApi();
```

## Benefits of This Structure

1. **Scalability**: Easy to add new features and pages
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Common utilities and hooks can be shared
4. **Consistency**: Standardized patterns across the app
5. **Testing**: Easier to test individual components and utilities
6. **Team Development**: Multiple developers can work on different areas without conflicts

## Adding New Features

### New Page
1. Create component in appropriate `pages/` subdirectory
2. Add to corresponding index.js file
3. Update routing in App.js
4. Add navigation if needed

### New Component
1. Create in appropriate `components/` subdirectory
2. Add to index.js if it's part of a group
3. Import and use in pages

### New Utility
1. Add to `utils/index.js` or create new utility file
2. Export from `utils/index.js`
3. Import and use throughout the app

### New Hook
1. Create in `hooks/` directory
2. Add to `hooks/index.js`
3. Import and use in components

## Best Practices

1. **Use index files** for clean imports
2. **Follow naming conventions** (PascalCase for components, camelCase for functions)
3. **Keep components focused** on single responsibility
4. **Use constants** instead of magic strings
5. **Leverage custom hooks** for reusable logic
6. **Maintain consistent file structure** across similar components
