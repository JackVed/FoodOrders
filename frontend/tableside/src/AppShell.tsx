import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import LogoutIcon from "@mui/icons-material/Logout";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { RoleChip } from "./components/Feedback";
import { useSession } from "./session";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useSession();

  const navigationValue = location.pathname.startsWith("/ordini/nuovo")
    ? "/ordini/nuovo"
    : location.pathname.startsWith("/ordini")
      ? "/ordini"
      : "/ordini/nuovo";

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #f4efe8 0%, #efe5d8 100%)" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(18, 102, 79, 0.12)",
        }}
      >
        <Toolbar sx={{ minHeight: 78, px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
              {currentUser?.username.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
                FoodOrders
              </Typography>
              <Typography variant="h3" noWrap>
                Tableside operativo
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Nuovi ordini dal tavolo e storico ordini gia inviati.
              </Typography>
            </Box>
          </Stack>
          <Stack spacing={0.75} alignItems="flex-end" sx={{ ml: 2 }}>
            <Typography fontWeight={700} noWrap>
              {currentUser?.username}
            </Typography>
            {currentUser ? <RoleChip role={currentUser.role} /> : null}
            <Button size="small" startIcon={<LogoutIcon />} onClick={() => void logout()} sx={{ minWidth: 0 }}>
              Esci
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 11, sm: 12 }, pb: 12 }}>
        <Box sx={{ maxWidth: 960, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(18, 102, 79, 0.12)",
          background: "rgba(255, 250, 243, 0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <BottomNavigation
          value={navigationValue}
          onChange={(_, nextValue) => navigate(nextValue)}
          showLabels
          sx={{ maxWidth: 560, mx: "auto", background: "transparent" }}
        >
          <BottomNavigationAction value="/ordini/nuovo" label="Nuovo ordine" icon={<AddShoppingCartIcon />} />
          <BottomNavigationAction value="/ordini" label="Ordini" icon={<ReceiptLongIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}