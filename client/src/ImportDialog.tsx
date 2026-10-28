import { useRef, useState, type DragEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useNavigate } from 'react-router-dom';
import { api, message, type Document } from './api';
export default function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  function choose(candidate?: File) {
    setError('');
    setFile(null);
    if (!candidate) return;
    if (!/\.(txt|md|docx)$/i.test(candidate.name)) {
      setError('Unsupported file type. Choose .txt, .md, or .docx.');
      return;
    }
    if (candidate.size > 2 * 1024 * 1024) {
      setError('This file exceeds the 2 MB limit.');
      return;
    }
    if (!candidate.size) {
      setError('This file is empty. Choose a file with some content.');
      return;
    }
    setFile(candidate);
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    if (e.dataTransfer.files.length !== 1) {
      setError('Choose one file at a time.');
      return;
    }
    choose(e.dataTransfer.files[0]);
  }
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} aria-labelledby="import-title">
      <DialogTitle id="import-title">
        Bring your words along
        <Typography fontSize={14} color="text.secondary" mt={1}>
          Import a file as a new, editable document.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          sx={{
            mt: 1,
            p: 4,
            border: '2px dashed',
            borderColor: dragging ? 'primary.main' : '#d5ddf0',
            bgcolor: dragging ? '#edf1ff' : '#f8f9fd',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <UploadFileOutlined sx={{ color: 'primary.main', fontSize: 42 }} />
          <Typography fontWeight={600} mt={1}>
            {file ? file.name : 'Drop a document here'}
          </Typography>
          <Button disabled={busy} onClick={() => input.current?.click()} sx={{ mt: 1 }}>
            {file ? 'Choose a different file' : 'Choose a file'}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".txt,.md,.docx"
            aria-label="Choose a document to import"
            style={{ display: 'none' }}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            .txt, .md, .docx · Up to 2 MB
          </Typography>
        </Box>
        <Typography fontSize={12} color="text.secondary" mt={2}>
          Text and Markdown should use UTF-8. We preserve supported text formatting; images, tables,
          and advanced Word layouts aren’t included. Converted text must be under 500 KB.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {busy && (
          <Stack direction="row" spacing={1.5} alignItems="center" mt={2} role="status">
            <CircularProgress size={18} />
            <Typography fontSize={14}>Importing your document…</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!file || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            const body = new FormData();
            body.append('file', file!);
            try {
              const doc = await api<Document>('/documents/import', { method: 'POST', body });
              onClose();
              navigate(`/documents/${doc.id}`);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Importing…' : 'Import document'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
