import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    primary: { main: '#315bd6', dark: '#2447b0' },
    background: { default: '#f6f7fa', paper: '#ffffff' },
    text: { primary: '#202940', secondary: '#697386' },
    divider: '#e5e8ef',
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: { fontWeight: 650, letterSpacing: '-1.4px' },
    h4: { fontWeight: 650, letterSpacing: '-1px' },
    h6: { fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 9, padding: '9px 18px' } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'sm' } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
