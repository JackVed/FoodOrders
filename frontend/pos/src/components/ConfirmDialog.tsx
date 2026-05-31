import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "error",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "error" | "primary";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onCancel} disabled={busy}>Annulla</Button>
        <Button color={tone} variant="contained" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}