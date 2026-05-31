import MenuIcon from "@mui/icons-material/Menu";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import SoupKitchenIcon from "@mui/icons-material/SoupKitchen";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { RoleChip } from "./components/Feedback";
import { hasMinimumRole } from "./lib/roles";
import { useSession } from "./session";

const drawerWidth = 280;

export function AppShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { currentUser, logout } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigationItems = [
    {
      label: "Nuovo ordine",
      to: "/ordini/nuovo",
      icon: <PointOfSaleIcon />,
      visible: true,
    },
    {
      label: "Ordini",
      to: "/ordini",
      icon: <ReceiptLongIcon />,
      visible: true,
    },
    {
      label: "Ticket cucina",
      to: "/ticket-cucina",
      icon: <SoupKitchenIcon />,
      visible: true,
    },
    {
      label: "Configurazione",
      to: "/gestione",
      icon: <SettingsSuggestIcon />,
      visible: currentUser ? hasMinimumRole(currentUser.role, "management") : false,
    },
    {
      label: "Utenti",
      to: "/utenti",
      icon: <SupervisorAccountIcon />,
      visible: currentUser ? hasMinimumRole(currentUser.role, "management") : false,
    },
  ];

  const drawerContent = (
    <Stack sx={{ height: "100%" }}>
      <Box sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
            FoodOrders
          </Typography>
          <Typography variant="h3">POS operativo</Typography>
          <Typography color="text.secondary">
            Inserimento ordini, monitoraggio ticket e configurazione della postazione.
          </Typography>
        </Stack>
      </Box>
      <Divider />
      <List sx={{ px: 2, py: 2, flexGrow: 1 }}>
        {navigationItems.filter((item) => item.visible).map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            sx={{
              mb: 1,
              borderRadius: 3,
              "&.active": {
                backgroundColor: "rgba(18, 102, 79, 0.12)",
                color: "primary.main",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main" }}>{currentUser?.username.slice(0, 1).toUpperCase()}</Avatar>
            <Box>
              <Typography fontWeight={700}>{currentUser?.username}</Typography>
              {currentUser ? <RoleChip role={currentUser.role} /> : null}
            </Box>
          </Stack>
          <ListItemButton onClick={() => void logout()} sx={{ borderRadius: 3, px: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Esci" />
          </ListItemButton>
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "linear-gradient(180deg, #f4efe8 0%, #efe5d8 100%)" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(18, 102, 79, 0.12)",
        }}
      >
        <Toolbar sx={{ minHeight: 80 }}>
          {!isDesktop ? (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Stack spacing={0.25}>
            <Typography variant="h3">FoodOrders POS</Typography>
            <Typography variant="body2" color="text.secondary">
              Desktop operativo per cassa, cucina e configurazione.
            </Typography>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={isDesktop ? "permanent" : "temporary"}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: "block",
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, width: { lg: `calc(100% - ${drawerWidth}px)` }, p: { xs: 2, md: 4 }, pt: { xs: 12, md: 14 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}