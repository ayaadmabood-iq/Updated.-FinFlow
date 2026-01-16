import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Responsive form wrapper with mobile-optimized layout
 *
 * @example
 * ```tsx
 * <ResponsiveForm onSubmit={handleSubmit}>
 *   <ResponsiveFormField label="Name" required>
 *     <Input {...} />
 *   </ResponsiveFormField>
 * </ResponsiveForm>
 * ```
 */
export interface ResponsiveFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  layout?: 'vertical' | 'horizontal';
  spacing?: 'sm' | 'md' | 'lg';
}

export function ResponsiveForm({
  children,
  layout = 'vertical',
  spacing = 'md',
  className,
  ...props
}: ResponsiveFormProps) {
  const spacingClass = {
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
  }[spacing];

  return (
    <form className={cn(spacingClass, className)} {...props}>
      {children}
    </form>
  );
}

/**
 * Responsive form field with label and error support
 */
export interface ResponsiveFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveFormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: ResponsiveFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      {hint && !error && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}

      {/* Clone child and add appropriate classes for mobile */}
      <div className="w-full">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              className: cn(
                // Mobile-friendly input sizing
                'min-h-touch-target w-full',
                // Larger text on mobile for readability
                'text-base sm:text-sm',
                (child.props as any).className
              ),
            });
          }
          return child;
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Mobile-optimized input with touch-friendly sizing
 */
export interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const ResponsiveInput = React.forwardRef<HTMLInputElement, ResponsiveInputProps>(
  ({ className, icon, suffix, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          className={cn(
            // Base styles
            'flex w-full rounded-lg border border-input bg-background',
            'px-4 py-3', // Larger padding for touch
            'text-base sm:text-sm', // Larger font on mobile
            'min-h-touch-target', // Minimum touch target
            // Focus styles
            'ring-offset-background focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            // Icon padding
            icon && 'pl-10',
            suffix && 'pr-10',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />

        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);

ResponsiveInput.displayName = 'ResponsiveInput';

/**
 * Mobile-optimized textarea
 */
export const ResponsiveTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        // Base styles
        'flex w-full rounded-lg border border-input bg-background',
        'px-4 py-3', // Larger padding for touch
        'text-base sm:text-sm', // Larger font on mobile
        'min-h-[120px]', // Reasonable minimum height
        // Focus styles
        'ring-offset-background focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
        // Resize
        'resize-y',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

ResponsiveTextarea.displayName = 'ResponsiveTextarea';

/**
 * Mobile-optimized select
 */
export const ResponsiveSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        // Base styles
        'flex w-full rounded-lg border border-input bg-background',
        'px-4 py-3', // Larger padding for touch
        'text-base sm:text-sm', // Larger font on mobile
        'min-h-touch-target', // Minimum touch target
        // Focus styles
        'ring-offset-background focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
        // Arrow
        'appearance-none',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")]',
        'bg-[length:1.5em_1.5em]',
        'bg-[position:right_0.5rem_center]',
        'bg-no-repeat',
        'pr-10', // Space for arrow
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

ResponsiveSelect.displayName = 'ResponsiveSelect';

/**
 * Checkbox with touch-friendly target
 */
export const ResponsiveCheckbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, ...props }, ref) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer min-h-touch-target">
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          'h-5 w-5 rounded border-input',
          'text-primary focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      />
      {label && <span className="text-sm select-none">{label}</span>}
    </label>
  );
});

ResponsiveCheckbox.displayName = 'ResponsiveCheckbox';

/**
 * Radio button with touch-friendly target
 */
export const ResponsiveRadio = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, ...props }, ref) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer min-h-touch-target">
      <input
        type="radio"
        ref={ref}
        className={cn(
          'h-5 w-5 border-input',
          'text-primary focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      />
      {label && <span className="text-sm select-none">{label}</span>}
    </label>
  );
});

ResponsiveRadio.displayName = 'ResponsiveRadio';
