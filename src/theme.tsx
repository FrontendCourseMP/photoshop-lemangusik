import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#d4bf00" }, // бирюзовый акцент
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#aaa",
    },
  },
  typography: {
    fontSize: 13,
  },
  components: {
    MuiButton: {
      defaultProps: { size: "small" },
      styleOverrides: { root: { textTransform: "none" } },
    },
    MuiToolbar: {
      styleOverrides: { dense: { minHeight: 48 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
          backgroundImage: "none",
        },
      },
    },
  },
});
