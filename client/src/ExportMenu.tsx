import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Alert, Box, Button, Divider, Menu, MenuItem, Snackbar, Typography } from '@mui/material';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import { downloadMarkdown, printDocument } from './export';

export default function ExportMenu({ editor, title }: { editor: Editor; title: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <Button
        id="document-export-button"
        size="small"
        color="inherit"
        startIcon={<DownloadOutlined fontSize="small" />}
        endIcon={<ArrowDropDown fontSize="small" />}
        aria-haspopup="menu"
        aria-controls={anchor ? 'document-export-menu' : undefined}
        aria-expanded={Boolean(anchor)}
        disabled={busy}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {busy ? 'Exporting…' : 'Export'}
      </Button>
      <Menu
        id="document-export-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { 'aria-labelledby': 'document-export-button' } }}
      >
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            setBusy(true);
            setError('');
            try {
              await downloadMarkdown(editor.getHTML(), title);
            } catch {
              setError('Unable to export Markdown. Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Markdown (.md)
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setError('');
            try {
              printDocument(title);
            } catch {
              setError('Unable to open the print dialog. Please try again.');
            }
          }}
        >
          PDF
        </MenuItem>
        <Divider />
        <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
          <Typography variant="caption" color="text.secondary">
            For PDF, choose “Save as PDF” in the print dialog.
          </Typography>
        </Box>
      </Menu>
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
