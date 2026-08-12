import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SegmentedControlProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedOption[];
  className?: string;
  listClassName?: string;
  "aria-label"?: string;
};

/**
 * Pill segmented control built on existing Radix Tabs — for Phase 1/2 filters & mode switches.
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  listClassName,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  return (
    <Tabs
      dir="rtl"
      value={value}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <TabsList
        aria-label={ariaLabel}
        className={cn(
          "h-11 w-full rounded-pill bg-muted p-1 text-text-muted",
          listClassName,
        )}
      >
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              "flex-1 rounded-pill px-3 py-2 text-sm font-semibold",
              "data-[state=active]:bg-surface data-[state=active]:text-text-strong data-[state=active]:shadow-card",
            )}
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
