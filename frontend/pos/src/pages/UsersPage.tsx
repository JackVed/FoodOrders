import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import KeyIcon from "@mui/icons-material/Key";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "../api/client";
import { usersApi } from "../api/services";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ControlledSelectField, ControlledSwitchField, ControlledTextField } from "../components/FormFields";
import { EmptyState, ErrorState, LoadingCard, RoleChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { canAssignRole, canManageRole } from "../lib/roles";
import { useNotifications } from "../notifications";
import { useSession } from "../session";
import type { UserRecord, UserRole } from "../types";

const createUserSchema = z.object({
  username: z.string().trim().min(3, "Lo username deve avere almeno 3 caratteri.").max(64),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri.").max(128),
  role: z.enum(["admin", "management", "operator"]),
});

const editUserSchema = z.object({
  username: z.string().trim().min(3, "Lo username deve avere almeno 3 caratteri.").max(64),
  role: z.enum(["admin", "management", "operator"]),
  isEnabled: z.boolean(),
});

const passwordSchema = z.object({
  password: z.string().min(8, "La password deve avere almeno 8 caratteri.").max(128),
  confirmPassword: z.string().min(8, "Conferma la password."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

function DialogErrorAlert({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return <Alert severity="error">{error instanceof ApiError ? error.message : "Operazione non riuscita."}</Alert>;
}

function CreateUserDialog({
  open,
  actorRole,
  onClose,
}: {
  open: boolean;
  actorRole: UserRole;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const availableRoles = useMemo(() => (["admin", "management", "operator"] as UserRole[])
    .filter((role) => canAssignRole(actorRole, role)), [actorRole]);

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: availableRoles[0] ?? "operator",
    },
  });

  useEffect(() => {
    form.reset({
      username: "",
      password: "",
      role: availableRoles[0] ?? "operator",
    });
  }, [availableRoles, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof createUserSchema>) => usersApi.create(values),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("Utente creato.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Creazione utente non riuscita.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuovo utente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogErrorAlert error={mutation.error} />
          <ControlledTextField control={form.control} name="username" label="Username" />
          <ControlledTextField control={form.control} name="password" label="Password iniziale" type="password" />
          <ControlledSelectField
            control={form.control}
            name="role"
            label="Ruolo"
            options={availableRoles.map((role) => ({ value: role, label: role === "admin" ? "Admin" : role === "management" ? "Gestione" : "Operatore" }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" startIcon={<PersonAddAlt1Icon />} onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Crea utente
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  actor,
  user,
  onClose,
}: {
  open: boolean;
  actor: UserRecord | null;
  user: UserRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const isSelf = actor?.id === user?.id;
  const availableRoles = useMemo(() => (["admin", "management", "operator"] as UserRole[])
    .filter((role) => (actor ? canAssignRole(actor.role, role) || role === user?.role : false)), [actor, user?.role]);

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user?.username ?? "",
      role: user?.role ?? (availableRoles[0] ?? "operator"),
      isEnabled: user?.isEnabled ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      username: user?.username ?? "",
      role: user?.role ?? (availableRoles[0] ?? "operator"),
      isEnabled: user?.isEnabled ?? true,
    });
  }, [availableRoles, open, user]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof editUserSchema>) => {
      if (!user) {
        throw new Error("Utente non disponibile.");
      }

      return usersApi.update(user.id, isSelf ? { username: values.username } : {
        username: values.username,
        role: values.role,
        isEnabled: values.isEnabled,
      });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("Utente aggiornato.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Aggiornamento utente non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifica utente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogErrorAlert error={mutation.error} />
          {isSelf ? (
            <Alert severity="info">
              Sul tuo account puoi aggiornare solo lo username da questa schermata. Ruolo e stato restano bloccati dal backend.
            </Alert>
          ) : null}
          <ControlledTextField control={form.control} name="username" label="Username" />
          <ControlledSelectField
            control={form.control}
            name="role"
            label="Ruolo"
            disabled={isSelf}
            options={availableRoles.map((role) => ({ value: role, label: role === "admin" ? "Admin" : role === "management" ? "Gestione" : "Operatore" }))}
          />
          <ControlledSwitchField control={form.control} name="isEnabled" label="Account abilitato" disabled={isSelf} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" startIcon={<EditIcon />} onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva modifiche
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PasswordDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: UserRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    form.reset({
      password: "",
      confirmPassword: "",
    });
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) => {
      if (!user) {
        throw new Error("Utente non disponibile.");
      }

      return usersApi.updatePassword(user.id, values.password);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("Password aggiornata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Aggiornamento password non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Imposta nuova password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogErrorAlert error={mutation.error} />
          <ControlledTextField control={form.control} name="password" label="Nuova password" type="password" />
          <ControlledTextField control={form.control} name="confirmPassword" label="Conferma password" type="password" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" startIcon={<KeyIcon />} onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Aggiorna password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const { notify } = useNotifications();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [disableTarget, setDisableTarget] = useState<UserRecord | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ user, isEnabled }: { user: UserRecord; isEnabled: boolean }) => usersApi.update(user.id, { isEnabled }),
    onSuccess(_, variables) {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify(variables.isEnabled ? "Utente riabilitato." : "Utente disabilitato.", "success");
      setDisableTarget(null);
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Aggiornamento stato utente non riuscito.", "error");
    },
  });

  const users = usersQuery.data?.users ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Amministrazione"
        title="Utenti e ruoli"
        description="Creazione account, cambio ruolo, reset password e gestione del ciclo di vita degli utenti." 
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void usersQuery.refetch()}>
              Aggiorna
            </Button>
            {currentUser ? (
              <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateOpen(true)}>
                Nuovo utente
              </Button>
            ) : null}
          </Stack>
        )}
      />
      {usersQuery.isLoading ? <LoadingCard message="Caricamento utenti..." /> : null}
      {usersQuery.isError ? (
        <ErrorState
          description={usersQuery.error instanceof ApiError ? usersQuery.error.message : "Impossibile caricare gli utenti."}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : null}
      {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 ? (
        <EmptyState title="Nessun utente trovato" description="Crea il primo account operativo da questa sezione." />
      ) : null}
      {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 ? (
        <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)", overflowX: "auto" }}>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Ruolo</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell>Disabilitato il</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const canManage = currentUser ? canManageRole(currentUser.role, user.role) : false;
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell><RoleChip role={user.role} /></TableCell>
                      <TableCell>
                        <Alert severity={user.isEnabled ? "success" : "warning"} sx={{ py: 0 }}>
                          {user.isEnabled ? "Abilitato" : "Disabilitato"}
                        </Alert>
                      </TableCell>
                      <TableCell>{user.disabledAt ? new Date(user.disabledAt).toLocaleString("it-IT") : "-"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {canManage ? (
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingUser(user)}>
                              Modifica
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button size="small" startIcon={<KeyIcon />} onClick={() => setPasswordUser(user)}>
                              Password
                            </Button>
                          ) : null}
                          {canManage && !isSelf && user.isEnabled ? (
                            <Button size="small" color="warning" startIcon={<PersonOffIcon />} onClick={() => setDisableTarget(user)}>
                              Disabilita
                            </Button>
                          ) : null}
                          {canManage && !user.isEnabled ? (
                            <Button size="small" color="success" startIcon={<RestartAltIcon />} onClick={() => toggleUserMutation.mutate({ user, isEnabled: true })}>
                              Riabilita
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      {currentUser ? <CreateUserDialog open={createOpen} actorRole={currentUser.role} onClose={() => setCreateOpen(false)} /> : null}
      <EditUserDialog open={editingUser !== null} actor={currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        isEnabled: true,
        disabledAt: null,
        createdAt: "",
        updatedAt: "",
      } : null} user={editingUser} onClose={() => setEditingUser(null)} />
      <PasswordDialog open={passwordUser !== null} user={passwordUser} onClose={() => setPasswordUser(null)} />
      <ConfirmDialog
        open={disableTarget !== null}
        title="Disabilita utente"
        message={`Confermi la disabilitazione di ${disableTarget?.username ?? "questo utente"}? Le sessioni attive verranno revocate subito.`}
        confirmLabel="Disabilita"
        busy={toggleUserMutation.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) {
            return;
          }

          toggleUserMutation.mutate({ user: disableTarget, isEnabled: false });
        }}
      />
    </Stack>
  );
}