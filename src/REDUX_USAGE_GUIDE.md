# Redux Usage Guide for CRM Application

## Overview
Redux has been successfully integrated into your CRM application using Redux Toolkit. This guide shows you how to use Redux in your components.

## What's Been Set Up

### 1. Store Structure
- **Auth Slice**: Manages user authentication, login, logout, registration
- **Client Slice**: Manages client data (CRUD operations)
- **Call Slice**: Manages call scheduling and call data

### 2. Files Created
- `src/store/index.js` - Main store configuration
- `src/store/hooks.js` - Custom Redux hooks
- `src/store/slices/authSlice.js` - Authentication state management
- `src/store/slices/clientSlice.js` - Client data management
- `src/store/slices/callSlice.js` - Call scheduling management
- `src/components/CallScheduleRedux.js` - Example Redux-enabled component

## How to Use Redux in Your Components

### 1. Import Redux Hooks
```javascript
import { useAppDispatch, useAppSelector } from '../store/hooks';
```

### 2. Import Actions from Slices
```javascript
import { 
  loginUser, 
  logoutUser, 
  clearError 
} from '../store/slices/authSlice';

import { 
  fetchClients, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../store/slices/clientSlice';

import { 
  fetchCalls, 
  scheduleCall, 
  updateCall, 
  deleteCall 
} from '../store/slices/callSlice';
```

### 3. Access State in Components
```javascript
const MyComponent = () => {
  const dispatch = useAppDispatch();
  
  // Get auth state
  const { user, isAuthenticated, loading, error } = useAppSelector(state => state.auth);
  
  // Get clients state
  const { clients, selectedClient } = useAppSelector(state => state.clients);
  
  // Get calls state
  const { calls, upcomingCalls, completedCalls } = useAppSelector(state => state.calls);
  
  // ... rest of component
};
```

### 4. Dispatch Actions
```javascript
// Login user
const handleLogin = async (email, password) => {
  try {
    await dispatch(loginUser({ email, password })).unwrap();
    // Login successful
  } catch (error) {
    // Handle error
    console.error('Login failed:', error);
  }
};

// Fetch clients
useEffect(() => {
  dispatch(fetchClients());
}, [dispatch]);

// Create new client
const handleCreateClient = async (clientData) => {
  try {
    await dispatch(createClient(clientData)).unwrap();
    // Client created successfully
  } catch (error) {
    console.error('Failed to create client:', error);
  }
};

// Schedule a call
const handleScheduleCall = async (callData) => {
  try {
    await dispatch(scheduleCall(callData)).unwrap();
    // Call scheduled successfully
  } catch (error) {
    console.error('Failed to schedule call:', error);
  }
};
```

## Converting Existing Components to Redux

### Before (using local state and fetch):
```javascript
const [clients, setClients] = useState([]);
const [loading, setLoading] = useState(false);

const fetchClients = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/clients');
    const data = await response.json();
    setClients(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### After (using Redux):
```javascript
const dispatch = useAppDispatch();
const { clients, loading, error } = useAppSelector(state => state.clients);

useEffect(() => {
  dispatch(fetchClients());
}, [dispatch]);
```

## Benefits of Using Redux

1. **Centralized State**: All your app state is in one place
2. **Predictable Updates**: State changes through actions and reducers
3. **DevTools**: Great debugging with Redux DevTools
4. **Async Handling**: Built-in async action support with createAsyncThunk
5. **Error Handling**: Consistent error handling across the app
6. **Loading States**: Automatic loading state management

## Next Steps

1. **Update Your Login Component**: Use `loginUser` action from authSlice
2. **Update Client Management**: Use client actions for CRUD operations
3. **Update Call Scheduling**: Use call actions for scheduling
4. **Add Error Handling**: Display errors from Redux state
5. **Add Loading States**: Show loading spinners using Redux loading state

## Example: Converting Your Login Component

```javascript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearError } from '../store/slices/authSlice';

const Login = () => {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(state => state.auth);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      // Redirect or handle success
    } catch (error) {
      // Error is already in Redux state
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

## Testing Redux Integration

Run your app to test the Redux integration:
```bash
npm start
```

The Redux store is now available throughout your application!
