import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  Link,
  useRouteError,
  useNavigate,
} from 'react-router-dom';
import { Alert, Button, Container, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { SessionProvider, useSession } from './session';
import { Loading } from './components';
import Login from './Login';
import Documents from './Documents';
import { message } from './api';
import './styles.css';
const Editor = lazy(() => import('./Editor'));
function App() {
  const { user, loading, expired, login } = useSession();
  const [sessionError, setSessionError] = useState('');
  const [resuming, setResuming] = useState(false);
  if (loading) return <Loading />;
  if (!user) return <Login />;
  return (
    <>
      {expired && (
        <Alert
          severity="warning"
          action={
            <Button
              disabled={resuming}
              onClick={async () => {
                setResuming(true);
                try {
                  await login(user.id);
                  setSessionError('');
                } catch (e) {
                  setSessionError(message(e));
                } finally {
                  setResuming(false);
                }
              }}
            >
              Resume session
            </Button>
          }
        >
          {sessionError ||
            'Your demo session expired. Resume it to save your edits, then retry saving.'}
        </Alert>
      )}
      <Suspense fallback={<Loading label="Loading editor…" />}>
        <Outlet />
      </Suspense>
    </>
  );
}
function SwitchUser() {
  const { logout } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);
  return <Loading label="Switching profile…" />;
}
function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <Container sx={{ py: 8 }}>
      <Alert severity="error">This page couldn’t be opened. Please reload and try again.</Alert>
      <Button component={Link} to="/">
        Back to workspace
      </Button>
    </Container>
  );
}
const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Documents /> },
      { path: '/documents/:id', element: <Editor /> },
      { path: '/switch', element: <SwitchUser /> },
      {
        path: '*',
        element: (
          <Container sx={{ py: 8 }}>
            <Alert severity="info">This page doesn’t exist.</Alert>
            <Button component={Link} to="/">
              Back to workspace
            </Button>
          </Container>
        ),
      },
    ],
  },
]);
createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </ThemeProvider>,
);
