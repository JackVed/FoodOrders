import { Box, Stack, Typography } from "@mui/material";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ lg: "flex-end" }}>
      <Box>
        {eyebrow ? (
          <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h2">{title}</Typography>
        {description ? (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mt: 0.75 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions}
    </Stack>
  );
}