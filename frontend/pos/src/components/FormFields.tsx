import { FormControlLabel, Switch, TextField, MenuItem as SelectOption, Typography } from "@mui/material";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

interface SelectFieldOption {
  value: string | number;
  label: string;
}

export function ControlledTextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  type,
  multiline,
  rows,
  disabled,
  helperText,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={field.value ?? ""}
          onChange={field.onChange}
          label={label}
          type={type}
          multiline={multiline}
          rows={rows}
          disabled={disabled}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth
        />
      )}
    />
  );
}

export function ControlledSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  disabled,
  helperText,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  options: SelectFieldOption[];
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          value={field.value ?? ""}
          onChange={field.onChange}
          label={label}
          disabled={disabled}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth
        >
          {options.map((option) => (
            <SelectOption key={String(option.value)} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </TextField>
      )}
    />
  );
}

export function ControlledSwitchField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  disabled,
  helperText,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div>
          <FormControlLabel
            control={<Switch checked={Boolean(field.value)} onChange={(_, checked) => field.onChange(checked)} disabled={disabled} />}
            label={label}
          />
          {helperText ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.5 }}>
              {helperText}
            </Typography>
          ) : null}
        </div>
      )}
    />
  );
}