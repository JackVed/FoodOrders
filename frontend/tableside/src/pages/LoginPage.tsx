import LoginIcon from "@mui/icons-material/Login";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useNotifications } from "../notifications";
import { useSession } from "../session";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Inserisci lo username."),
  password: z.string().min(1, "Inserisci la password."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, bootstrapError } = useSession();
  const { notify } = useNotifications();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.username, values.password);
      notify("Accesso effettuato.", "success");
      navigate((location.state as { from?: string } | null)?.from ?? "/ordini/nuovo", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        notify(error.message, "error");
        return;
      }

      notify("Accesso non riuscito.", "error");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 3,
        background:
          "radial-gradient(circle at top left, rgba(204, 119, 34, 0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(18, 102, 79, 0.18), transparent 32%), linear-gradient(180deg, #efe5d8 0%, #f8f2ea 100%)",
      }}
    >
      <Card elevation={0} sx={{ width: "100%", maxWidth: 520, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
        <CardContent sx={{ p: 5 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
            <Box>
              <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
                FoodOrders
              </Typography>
              <Typography variant="h1" sx={{ mt: 0.5 }}>
                Accesso Tableside
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                Accedi per inserire ordini dal tavolo e rivedere quelli gia inviati alla cucina.
              </Typography>
            </Box>
            {bootstrapError ? <Alert severity="warning">{bootstrapError}</Alert> : null}
            <TextField
              label="Username"
              autoComplete="username"
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
              {...register("username")}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" variant="contained" size="large" startIcon={<LoginIcon />} disabled={isSubmitting}>
              Entra nel Tableside
            </Button>
            <Typography variant="body2" color="text.secondary">
              L'app resta focalizzata su ordini e consultazione stato: niente configurazione, niente funzioni da POS.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}