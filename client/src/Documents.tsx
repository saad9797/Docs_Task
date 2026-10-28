import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Search from '@mui/icons-material/Search';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { Link, useNavigate } from 'react-router-dom';
import { api, message, type Document, type DocumentMeta, type Page } from './api';
import { ErrorState, Header, relativeDate, RoleBadge } from './components';
import { useSession } from './session';
import ImportDialog from './ImportDialog';
export default function Documents() {
  const [importing, setImporting] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();
  const [section, setSection] = useState('mine'),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [items, setItems] = useState<DocumentMeta[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    setCursor(null);
    api<Page<DocumentMeta>>(
      `/documents?section=${section}&q=${encodeURIComponent(search)}&limit=12`,
      { signal: controller.signal },
    )
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
  }, [section, search, revision]);
  async function create() {
    setCreating(true);
    setError('');
    try {
      const doc = await api<Document>('/documents', {
        method: 'POST',
        body: JSON.stringify({ title: 'Untitled document' }),
      });
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setCreating(false);
    }
  }
  async function loadMore() {
    setMore(true);
    setError('');
    try {
      const data = await api<Page<DocumentMeta>>(
        `/documents?section=${section}&q=${encodeURIComponent(search)}&limit=12&cursor=${encodeURIComponent(cursor!)}`,
      );
      setItems((old) => [
        ...old,
        ...data.items.filter((row) => !old.some((item) => item.id === row.id)),
      ]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(message(e));
    } finally {
      setMore(false);
    }
  }
  return (
    <>
      <Header />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: 8 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={3}
          alignItems={{ sm: 'center' }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary" letterSpacing={1.8}>
              YOUR WORKSPACE
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              Room for your next idea<span style={{ color: '#315bd6' }}>.</span>
            </Typography>
            <Typography color="text.secondary" mt={1}>
              Welcome back, {user?.name}. Pick up where you left off.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlined />}
              onClick={() => setImporting(true)}
            >
              Import file
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={create} disabled={creating}>
              {creating ? 'Creating…' : 'New document'}
            </Button>
          </Stack>
        </Stack>
        <Paper
          variant="outlined"
          sx={{
            my: 4,
            p: { xs: 3, md: 4 },
            display: 'flex',
            gap: 3,
            alignItems: 'center',
            bgcolor: '#edf1ff',
            borderColor: '#dfe5fa',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: 'white',
              borderRadius: 2,
              color: 'primary.main',
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            <DescriptionOutlined sx={{ fontSize: 34 }} />
          </Box>
          <Box flex={1}>
            <Typography fontWeight={650} fontSize={18}>
              Your thoughts, beautifully together.
            </Typography>
            <Typography color="text.secondary" fontSize={14} mt={0.5}>
              Start a fresh page or bring an existing document into your workspace.
            </Typography>
          </Box>
          <Button
            onClick={create}
            disabled={creating}
            endIcon={<ArrowForward />}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            Start writing
          </Button>
        </Paper>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
        >
          <Tabs
            value={section}
            onChange={(_e, value) => {
              if (!more) setSection(value);
            }}
            aria-label="Document collections"
          >
            <Tab label="My documents" value="mine" />
            <Tab label="Shared with me" value="shared" />
          </Tabs>
          <TextField
            size="small"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputProps={{ maxLength: 100, 'aria-label': 'Search document titles' }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: '100%', sm: 280 }, pb: 1.5 }}
          />
        </Stack>
        {error && (
          <Box mb={3}>
            <ErrorState error={error} retry={() => setRevision((v) => v + 1)} />
          </Box>
        )}
        {loading ? (
          <Box className="document-grid">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} variant="rounded" height={220} />
            ))}
          </Box>
        ) : items.length ? (
          <>
            <Box className="document-grid">
              {items.map((doc) => (
                <Paper
                  component={Link}
                  to={`/documents/${doc.id}`}
                  key={doc.id}
                  variant="outlined"
                  className="document-card"
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    overflow: 'hidden',
                    borderRadius: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      height: 122,
                      bgcolor: '#f4f6fb',
                      p: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                    aria-hidden
                  >
                    <Box
                      sx={{
                        width: 98,
                        height: 97,
                        bgcolor: 'white',
                        border: '1px solid #e2e6f0',
                        p: 2,
                        borderRadius: '3px 3px 0 0',
                        transform: 'translateY(10px)',
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ width: 25, height: 4, bgcolor: '#6682d9', mb: 1.5 }} />
                      {[100, 90, 100, 65].map((width, i) => (
                        <Box
                          key={i}
                          sx={{ width: `${width}%`, height: 3, bgcolor: '#e3e7ef', mb: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box p={2.5}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <DescriptionOutlined color="primary" sx={{ fontSize: 19 }} />
                      <Typography fontWeight={650} noWrap flex={1} title={doc.title}>
                        {doc.title}
                      </Typography>
                    </Stack>
                    <Typography fontSize={12} color="text.secondary" noWrap>
                      {doc.owner.name} ·{' '}
                      <time
                        dateTime={doc.updatedAt}
                        title={new Date(doc.updatedAt).toLocaleString()}
                      >
                        {relativeDate(doc.updatedAt)}
                      </time>
                    </Typography>
                    <Box mt={1.5}>
                      <RoleBadge role={doc.role} />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
            {cursor && (
              <Box textAlign="center" mt={4}>
                <Button variant="outlined" onClick={loadMore} disabled={more}>
                  {more ? 'Loading…' : 'Load more documents'}
                </Button>
              </Box>
            )}
          </>
        ) : (
          !error && (
            <Paper variant="outlined" sx={{ textAlign: 'center', p: 7, borderStyle: 'dashed' }}>
              <DescriptionOutlined sx={{ color: '#a6b4d8', fontSize: 45 }} />
              <Typography variant="h6" mt={2}>
                {search
                  ? 'No matching documents'
                  : section === 'shared'
                    ? 'Good work starts together'
                    : 'A fresh start, a blank page'}
              </Typography>
              <Typography color="text.secondary" mt={1} mb={3}>
                {search
                  ? 'Try a different title.'
                  : section === 'shared'
                    ? 'Documents shared with you will appear here.'
                    : 'Give your next idea somewhere to grow.'}
              </Typography>
              {!search && section === 'mine' && (
                <Button
                  variant="contained"
                  onClick={create}
                  disabled={creating}
                  startIcon={<Add />}
                >
                  Create a document
                </Button>
              )}
            </Paper>
          )
        )}
        <Alert
          severity="info"
          icon={false}
          sx={{ mt: 4, bgcolor: 'transparent', color: 'text.secondary', fontSize: 12, p: 0 }}
        >
          Changes save automatically. Sharing permissions are managed by each document’s owner.
        </Alert>
      </Container>
    </>
  );
}
