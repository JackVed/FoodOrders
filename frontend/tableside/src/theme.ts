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
      fontSize: "2.1rem",
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Fraunces", serif',
      fontSize: "1.6rem",
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Fraunces", serif',
      fontSize: "1.15rem",
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
  },
});