import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Check from '@mui/icons-material/Check';
import { api, message, type User } from './api';
import { Brand, ErrorState, Loading } from './components';
import { useSession } from './session';
export default function Login() {
  const { login } = useSession();
  const [users, setUsers] = useState<User[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  function load() {
    setError('');
    setLoading(true);
    api<{ items: User[] }>('/auth/users')
      .then((result) => {
        setUsers(result.items);
        setSelected(result.items[0]?.id ?? '');
      })
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <Box
        sx={{
          bgcolor: '#edf1fc',
          p: { xs: 3, md: 7 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <Brand />
        <Box sx={{ maxWidth: 490, my: { xs: 5, md: 10 } }}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
            A little clarity. A lot of possibility.
          </Typography>
          <Typography variant="h3" sx={{ mt: 2, fontSize: { xs: 40, md: 58 }, lineHeight: 1.1 }}>
            Good ideas
            <br />
            start with
            <br />
            <span style={{ color: '#315bd6' }}>a blank page.</span>
          </Typography>
          <Typography sx={{ mt: 3, color: 'text.secondary', fontSize: 17, maxWidth: 360 }}>
            A calm place to write, shape your thoughts, and bring others into the story.
          </Typography>
          <Box
            aria-hidden
            sx={{
              mt: 5,
              bgcolor: 'white',
              border: '1px solid #dde3f3',
              borderRadius: 3,
              p: 4,
              transform: 'rotate(-3deg)',
              boxShadow: '0 20px 50px #405ca015',
              maxWidth: 400,
            }}
          >
            <Typography fontFamily="Georgia, serif" fontSize={24}>
              The beginning of something.
            </Typography>
            {[100, 90, 96, 60].map((width, i) => (
              <Box
                key={i}
                sx={{
                  mt: 2,
                  height: 7,
                  borderRadius: 1,
                  bgcolor: i === 3 ? '#cbd6fa' : '#edf0f5',
                  width: `${width}%`,
                }}
              />
            ))}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          A space for your ideas. And the people behind them.
        </Typography>
      </Box>
      <Container maxWidth="xs" sx={{ py: 8, alignSelf: 'center' }}>
        <Typography variant="h4">Make yourself at home</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          Choose a demo profile to explore your workspace.
        </Typography>
        {loading ? (
          <Loading label="Loading demo profiles…" />
        ) : (
          <Stack spacing={1.5}>
            {users.map((user, i) => (
              <Button
                key={user.id}
                variant="outlined"
                color="inherit"
                aria-pressed={selected === user.id}
                onClick={() => setSelected(user.id)}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 2,
                  borderColor: selected === user.id ? 'primary.main' : 'divider',
                  bgcolor: selected === user.id ? '#f4f6ff' : 'white',
                }}
              >
                <Avatar
                  sx={{
                    mr: 2,
                    bgcolor: ['#e7edff', '#fce9df', '#ede5f7', '#e1f0e9'][i],
                    color: '#485677',
                  }}
                >
                  {user.name[0]}
                </Avatar>
                <Box flex={1}>
                  <Typography fontWeight={650}>{user.name}</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                {selected === user.id && <Check color="primary" fontSize="small" />}
              </Button>
            ))}
          </Stack>
        )}
        {error && (
          <Box mt={2}>
            <ErrorState error={error} retry={users.length ? undefined : load} />
          </Box>
        )}
        {!loading && !users.length && !error && (
          <Alert severity="info">No demo users found. Run the database seed script.</Alert>
        )}
        <Button
          fullWidth
          size="large"
          variant="contained"
          endIcon={<ArrowForward />}
          disabled={!selected || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await login(selected);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
          sx={{ mt: 3 }}
        >
          {busy ? 'Opening workspace…' : 'Enter workspace'}
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          textAlign="center"
          mt={2}
        >
          Demo mode · No password needed
          <br />
          Profiles are public and intended for evaluation only.
        </Typography>
      </Container>
    </Box>
  );
}
