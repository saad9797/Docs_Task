import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import PersonRemoveOutlined from '@mui/icons-material/PersonRemoveOutlined';
import ContentCopy from '@mui/icons-material/ContentCopy';
import { api, message, type Document, type Page, type Share } from './api';
import { ErrorState, Loading, RoleBadge } from './components';
export default function ShareDialog({
  doc,
  open,
  onClose,
}: {
  doc: Document;
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Share[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [email, setEmail] = useState(''),
    [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER'),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState<Share | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setNotice('');
    api<Page<Share>>(`/documents/${doc.id}/shares?limit=10`, { signal: controller.signal })
      .then((data) => {
        setItems(data.items);
        setCursor(data.nextCursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, doc.id, revision]);
  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setConfirm(null);
      setEmail('');
      setRevision((n) => n + 1);
      setNotice(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} aria-labelledby="share-title">
      <DialogTitle id="share-title" sx={{ pr: 6 }}>
        Share this document
        <IconButton
          aria-label="Close sharing dialog"
          onClick={onClose}
          disabled={busy}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <Close />
        </IconButton>
        <Typography color="text.secondary" fontSize={13} noWrap mt={0.5}>
          {doc.title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              () =>
                api(`/documents/${doc.id}/shares`, {
                  method: 'PUT',
                  body: JSON.stringify({ email, role }),
                }),
              'Access updated.',
            );
          }}
          sx={{ pt: 1 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              type="email"
              size="small"
              label="Collaborator email"
              placeholder="bob@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputProps={{ maxLength: 254 }}
              disabled={busy}
              sx={{ flex: 1 }}
            />
            <Select
              size="small"
              inputProps={{ 'aria-label': 'Collaborator role' }}
              value={role}
              onChange={(e) => setRole(e.target.value as 'VIEWER' | 'EDITOR')}
              disabled={busy}
            >
              <MenuItem value="VIEWER">Viewer</MenuItem>
              <MenuItem value="EDITOR">Editor</MenuItem>
            </Select>
            <Button type="submit" variant="contained" disabled={busy || !email.trim()}>
              Share
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Viewers can read. Editors can change the title and content.
            <br />
            Demo profiles: alice, bob, carol, or dave @example.com.
          </Typography>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography fontWeight={650} fontSize={14} mb={2}>
          People with access
        </Typography>
        {error && (
          <Box mb={2}>
            <ErrorState error={error} retry={() => setRevision((n) => n + 1)} />
          </Box>
        )}
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        <Stack direction="row" spacing={1.5} alignItems="center" py={1}>
          <Avatar sx={{ bgcolor: '#e9edff', color: 'primary.main', width: 36, height: 36 }}>
            {doc.owner.name[0]}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography fontSize={14} fontWeight={600}>
              {doc.owner.name}
            </Typography>
            <Typography fontSize={12} color="text.secondary" noWrap>
              {doc.owner.email}
            </Typography>
          </Box>
          <RoleBadge role="OWNER" />
        </Stack>
        {loading ? (
          <Loading label="Loading access…" />
        ) : (
          items.map((share) => (
            <Stack key={share.id} direction="row" spacing={1} alignItems="center" py={1.5}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#f1edf8', color: '#796196' }}>
                {share.user.name[0]}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Typography fontSize={14} fontWeight={600}>
                  {share.user.name}
                </Typography>
                <Typography fontSize={12} color="text.secondary" noWrap>
                  {share.user.email}
                </Typography>
              </Box>
              <Select
                size="small"
                value={share.role}
                disabled={busy}
                inputProps={{ 'aria-label': `Role for ${share.user.name}` }}
                onChange={(e) =>
                  void mutate(
                    () =>
                      api(`/documents/${doc.id}/shares/${share.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ role: e.target.value }),
                      }),
                    'Role updated.',
                  )
                }
              >
                <MenuItem value="VIEWER">Viewer</MenuItem>
                <MenuItem value="EDITOR">Editor</MenuItem>
              </Select>
              <Tooltip title={`Remove ${share.user.name}'s access`}>
                <span>
                  <IconButton
                    disabled={busy}
                    aria-label={`Remove ${share.user.name}'s access`}
                    onClick={() => setConfirm(share)}
                  >
                    <PersonRemoveOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ))
        )}
        {cursor && !loading && (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const data = await api<Page<Share>>(
                  `/documents/${doc.id}/shares?limit=10&cursor=${cursor}`,
                );
                setItems((old) => [...old, ...data.items]);
                setCursor(data.nextCursor);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Load more collaborators
          </Button>
        )}
        {confirm && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Remove {confirm.user.name}’s access?
            <Stack direction="row" spacing={1} mt={1}>
              <Button disabled={busy} onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                color="error"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () => api(`/documents/${doc.id}/shares/${confirm.id}`, { method: 'DELETE' }),
                    'Access removed.',
                  )
                }
              >
                Remove access
              </Button>
            </Stack>
          </Alert>
        )}
        <Alert severity="info" icon={false} sx={{ mt: 3, fontSize: 12 }}>
          Only invited people can open this document. Copying the link doesn’t grant access.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          startIcon={<ContentCopy fontSize="small" />}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setNotice('Link copied.');
            } catch {
              setError('Unable to copy. Copy the URL from your address bar.');
            }
          }}
        >
          Copy link
        </Button>
        <Box flex={1} />
        <Button variant="contained" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
