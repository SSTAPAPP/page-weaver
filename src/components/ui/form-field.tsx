import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    { label, error, success, hint, required, className, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const fieldId = id || generatedId;

    return (
      <div className="space-y-2">
        <Label
          htmlFor={fieldId}
          className={cn(error && "text-destructive")}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={fieldId}
            ref={ref}
            className={cn(
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-chart-2 focus-visible:ring-chart-2",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            {...props}
          />
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
          )}
          {success && !error && (
            <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chart-2" />
          )}
        </div>
        {error && (
          <p
            id={`${fieldId}-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        {success && !error && (
          <p className="text-sm text-chart-2">{success}</p>
        )}
        {hint && !error && !success && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
