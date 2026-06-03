import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#12664f",
        },
        secondary: {
          main: "#cc7722",
        },
        background: {
          default: "#f4efe8",
          paper: "#fffaf3",
        },
      },
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Fraunces", serif',
      fontSize: "2.35rem",
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Fraunces", serif',
      fontSize: "1.75rem",
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Fraunces", serif',
      fontSize: "1.2rem",
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "1px solid rgba(18, 102, 79, 0.12)",
          background: "linear-gradient(180deg, #fffaf3 0%, #f7efe5 100%)",
        },
      },
    },
  },
});