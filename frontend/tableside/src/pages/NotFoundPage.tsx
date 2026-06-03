import { Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { EmptyState } from "../components/Feedback";

export function NotFoundPage() {
  return (
    <Stack sx={{ maxWidth: 720, mx: "auto", mt: 8 }}>
      <EmptyState
        title="Pagina non trovata"
        description="La rotta richiesta non esiste nel Tableside."
        action={(
          <Button component={RouterLink} to="/ordini/nuovo" variant="contained">
            Torna al Tableside
          </Button>
        )}
      />
    </Stack>
  );
}