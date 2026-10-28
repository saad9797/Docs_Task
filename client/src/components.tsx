import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { Link } from 'react-router-dom';
import { useSession } from './session';
import type { Role } from './api';
export function Brand() {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center">
      <Box
        sx={{
          width: 35,
          height: 39,
          display: 'grid',
          placeItems: 'center',
          color: 'white',
          bgcolor: 'primary.main',
          borderRadius: '9px 9px 14px 9px',
        }}
      >
        <DescriptionOutlined fontSize="small" />
      </Box>
      <Typography fontSize={25} fontWeight={750} letterSpacing={-1}>
        folio<span style={{ color: '#315bd6' }}>.</span>
      </Typography>
    </Stack>
  );
}
export function Header() {
  const { user } = useSession();
  return (
    <Box
      component="header"
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: { xs: 2, md: 5 },
        py: 2,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
          <Brand />
        </Box>
        {user && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: '#e9edff',
                color: 'primary.main',
                fontSize: 15,
              }}
            >
              {user.name[0]}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography fontSize={13} fontWeight={650}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Demo workspace
              </Typography>
            </Box>
            <Button size="small" color="inherit" component={Link} to="/switch">
              Switch user
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
export function Loading({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 10 }} role="status">
      <CircularProgress size={28} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        retry && (
          <Button color="inherit" onClick={retry}>
            Retry
          </Button>
        )
      }
    >
      {error}
    </Alert>
  );
}
export function RoleBadge({ role }: { role: Role }) {
  return (
    <Chip
      size="small"
      label={role === 'OWNER' ? 'Owner' : role === 'EDITOR' ? 'Editor' : 'Viewer'}
      sx={{
        borderRadius: 1.5,
        fontWeight: 600,
        fontSize: 11,
        bgcolor: role === 'OWNER' ? '#edf1ff' : role === 'EDITOR' ? '#e8f5ee' : '#f0edf8',
        color: role === 'OWNER' ? '#4162b9' : role === 'EDITOR' ? '#28704f' : '#796196',
      }}
    />
  );
}
export function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  return days === 0
    ? `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : days === 1
      ? 'Yesterday'
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
