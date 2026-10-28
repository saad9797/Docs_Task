import { useEffect, useRef, useState } from 'react';
import { useBlocker, useParams, Link, useNavigate } from 'react-router-dom';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor as TiptapEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import Undo from '@mui/icons-material/Undo';
import Redo from '@mui/icons-material/Redo';
import CloudDoneOutlined from '@mui/icons-material/CloudDoneOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { api, message, type Document } from './api';
import { ErrorState, Header, Loading, RoleBadge } from './components';
import { useAutosave } from './useAutosave';
import ShareDialog from './ShareDialog';
import ExportMenu from './ExportMenu';
function Toolbar({
  editor,
  readonly,
  title,
}: {
  editor: TiptapEditor;
  readonly: boolean;
  title: string;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      heading: e.isActive('heading') ? (e.getAttributes('heading').level as number) : 0,
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const controls = [
    {
      label: 'Bold (Ctrl/⌘ B)',
      icon: <FormatBold />,
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic (Ctrl/⌘ I)',
      icon: <FormatItalic />,
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline (Ctrl/⌘ U)',
      icon: <FormatUnderlined />,
      active: state.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Bulleted list',
      icon: <FormatListBulleted />,
      active: state.bullet,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: <FormatListNumbered />,
      active: state.ordered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{
          px: { xs: 1, md: 3 },
          py: 1,
          overflowX: 'auto',
          flex: 1,
          minWidth: 0,
          bgcolor: 'white',
        }}
        role="toolbar"
        aria-label="Text formatting"
      >
        <Tooltip title="Undo (Ctrl/⌘ Z)">
          <span>
            <IconButton
              aria-label="Undo"
              disabled={readonly || !state.undo}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl/⌘ Shift Z)">
          <span>
            <IconButton
              aria-label="Redo"
              disabled={readonly || !state.redo}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <Select
          size="small"
          value={state.heading}
          disabled={readonly}
          inputProps={{ 'aria-label': 'Text style' }}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value)
              editor
                .chain()
                .focus()
                .setHeading({ level: value as 1 | 2 | 3 })
                .run();
            else editor.chain().focus().setParagraph().run();
          }}
          sx={{ minWidth: 140, '& fieldset': { border: 0 }, fontSize: 13 }}
        >
          <MenuItem value={0}>Normal text</MenuItem>
          <MenuItem value={1}>Heading 1</MenuItem>
          <MenuItem value={2}>Heading 2</MenuItem>
          <MenuItem value={3}>Heading 3</MenuItem>
        </Select>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        {controls.map((control) => (
          <Tooltip key={control.label} title={control.label}>
            <span>
              <IconButton
                aria-label={control.label}
                aria-pressed={control.active}
                disabled={readonly}
                onMouseDown={(e) => e.preventDefault()}
                onClick={control.run}
                sx={{
                  borderRadius: 1,
                  color: control.active ? 'primary.main' : 'text.secondary',
                  bgcolor: control.active ? '#eaf0ff' : 'transparent',
                }}
              >
                {control.icon}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Stack>
      <Box sx={{ px: 1, flexShrink: 0 }}>
        <ExportMenu editor={editor} title={title} />
      </Box>
    </Box>
  );
}
function OpenDocument({ doc }: { doc: Document }) {
  const navigate = useNavigate();
  const allowLeave = useRef(false);
  const [sharing, setSharing] = useState(false),
    [deleting, setDeleting] = useState(false),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState('');
  const validTitle = useRef(doc.title);
  const [title, setTitle] = useState(doc.title),
    [titleError, setTitleError] = useState('');
  const autosave = useAutosave(doc.id);
  const readonly = doc.role === 'VIEWER';
  const blocker = useBlocker(() => !allowLeave.current && (autosave.dirty || Boolean(titleError)));
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false, link: false }),
      Underline,
      Placeholder.configure({ placeholder: 'Let your ideas find their way onto the page…' }),
    ],
    content: doc.content,
    editable: !readonly,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Document content',
        'aria-multiline': 'true',
        'aria-readonly': String(readonly),
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      if (!readonly) autosave.change({ content: () => editor.getHTML() });
    },
  });
  return (
    <Box className="document-editor">
      <Header />
      <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'white' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1, md: 2 }}
          sx={{ px: { xs: 1, md: 3 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tooltip title="Back to documents">
            <IconButton component={Link} to="/" aria-label="Back to documents">
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Box flex={1} minWidth={0}>
            <TextField
              variant="standard"
              value={title}
              disabled={readonly}
              placeholder="Untitled document"
              error={Boolean(titleError)}
              helperText={titleError}
              inputProps={{ 'aria-label': 'Document title', maxLength: 200 }}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                setTitleError(value.trim() ? '' : 'Please enter a title.');
                if (value.trim()) {
                  validTitle.current = value.trim();
                  autosave.change({ title: value.trim() });
                }
              }}
              onBlur={() => {
                if (!title.trim()) {
                  setTitle(validTitle.current);
                  setTitleError('');
                }
              }}
              sx={{
                width: '100%',
                maxWidth: 540,
                '& input': { fontWeight: 650, fontSize: { xs: 16, sm: 19 } },
                '& .MuiInput-root:before': { border: 0 },
              }}
            />
            <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
              <Typography fontSize={11} color="text.secondary">
                {doc.owner.name}’s workspace
              </Typography>
              <RoleBadge role={doc.role} />
            </Stack>
          </Box>
          <Box
            role="status"
            aria-live="polite"
            sx={{
              color: autosave.status === 'error' ? 'error.main' : 'text.secondary',
              fontSize: 12,
              display: 'flex',
              gap: 0.7,
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {readonly ? (
              <>
                <LockOutlined sx={{ fontSize: 16 }} />
                Read only
              </>
            ) : (
              <>
                <CloudDoneOutlined sx={{ fontSize: 17 }} />
                {autosave.status === 'saved'
                  ? 'Saved'
                  : autosave.status === 'saving'
                    ? 'Saving…'
                    : autosave.status === 'error'
                      ? 'Save failed'
                      : 'Unsaved changes'}
              </>
            )}
          </Box>
          {doc.role === 'OWNER' && (
            <>
              <Tooltip title="Delete document">
                <IconButton aria-label="Delete document" onClick={() => setDeleting(true)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<ShareOutlined fontSize="small" />}
                onClick={() => setSharing(true)}
                sx={{ minWidth: 0, px: { xs: 1.5, sm: 2 } }}
              >
                Share
              </Button>
            </>
          )}
        </Stack>
        {editor && (
          <Toolbar editor={editor} readonly={readonly} title={title.trim() || validTitle.current} />
        )}
      </Box>
      <Container className="document-content" maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        {readonly && (
          <Alert severity="info" icon={<LockOutlined fontSize="small" />} sx={{ mb: 2 }}>
            You can read this document. Ask {doc.owner.name} for Editor access to make changes.
          </Alert>
        )}
        {autosave.error && (
          <Box mb={2}>
            <ErrorState error={autosave.error} retry={() => void autosave.flush()} />
          </Box>
        )}
        <Paper
          className="document-print-surface"
          variant="outlined"
          sx={{ borderRadius: { xs: 1, md: 0 }, boxShadow: '0 4px 24px #25396606', minHeight: 850 }}
        >
          <EditorContent editor={editor} />
        </Paper>
        <Typography
          textAlign="center"
          variant="caption"
          color="text.secondary"
          display="block"
          mt={3}
        >
          A little space to think clearly.
        </Typography>
      </Container>
      {doc.role === 'OWNER' && (
        <ShareDialog doc={{ ...doc, title }} open={sharing} onClose={() => setSharing(false)} />
      )}
      <Dialog
        open={deleting}
        onClose={deleteBusy ? undefined : () => setDeleting(false)}
        aria-labelledby="delete-title"
      >
        <DialogTitle id="delete-title">Delete this document?</DialogTitle>
        <DialogContent>
          <Typography>
            “{title}” and everyone’s access to it will be permanently removed.
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={deleteBusy} onClick={() => setDeleting(false)}>
            Keep document
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBusy}
            onClick={async () => {
              setDeleteBusy(true);
              setDeleteError('');
              try {
                await autosave.flush();
                await api(`/documents/${doc.id}`, { method: 'DELETE' });
                allowLeave.current = true;
                navigate('/');
              } catch (e) {
                setDeleteError(message(e));
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            {deleteBusy ? 'Deleting…' : 'Delete document'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={blocker.state === 'blocked'}>
        <DialogTitle>Save your changes before leaving?</DialogTitle>
        <DialogContent>
          <Typography>
            Your latest edits haven’t been saved yet. Keep this page open if saving fails.
          </Typography>
          {autosave.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {autosave.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Keep writing
          </Button>
          <Button color="error" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            Discard & leave
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if ((await autosave.flush()) && blocker.state === 'blocked') blocker.proceed();
            }}
          >
            Save & leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
export default function Editor() {
  const { id } = useParams();
  const [doc, setDoc] = useState<Document | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDoc(null);
    setError('');
    api<Document>(`/documents/${id}`, { signal: controller.signal })
      .then(setDoc)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [id, revision]);
  if (error)
    return (
      <>
        <Header />
        <Container sx={{ py: 6 }}>
          <ErrorState error={error} retry={() => setRevision((n) => n + 1)} />
          <Button component={Link} to="/" sx={{ mt: 2 }}>
            Back to documents
          </Button>
        </Container>
      </>
    );
  return doc ? (
    <OpenDocument key={doc.id} doc={doc} />
  ) : (
    <>
      <Header />
      <Loading label="Opening your document…" />
    </>
  );
}
