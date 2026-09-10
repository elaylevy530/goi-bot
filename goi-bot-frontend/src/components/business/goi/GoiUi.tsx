import { type ReactNode, useId } from "react";
import { Search, Save } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { moneyIls } from "@/lib/business-panel";

export const money = moneyIls;

export function Badge({ text, tone = "gray" }: { text: string; tone?: string }) {
  return (
    <span className={cn("status-tag", tone)}>
      <i />
      {text}
    </span>
  );
}

export function Panel({
  children,
  className = "",
  title,
  icon,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <div className="panel-title">
          <h2>
            {icon}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SelectBox({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  label: string;
}) {
  return (
    <Select dir="rtl" value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="select-box">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <SelectItem key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function Choices({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <RadioGroup aria-label={label} dir="rtl" value={value} onValueChange={onChange} className={cn("choices", className)}>
      {options.map((o, i) => (
        <label className={value === o ? "chosen" : ""} key={o} htmlFor={id + i}>
          <RadioGroupItem id={id + i} value={o} />
          <span>{o}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        {description && <p>{description}</p>}
      </div>
      <div dir="ltr">
        <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export function FilterTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <Tabs dir="rtl" value={value} onValueChange={onChange} data-slot="tabs">
      <TabsList className="filter-tabs">
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined && <b>{o.count}</b>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "חיפוש לפי שם, טלפון או כתובת...",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="goi-modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DataTable({
  headers,
  rows,
  className = "",
}: {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div className={cn("table-wrap", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, j) => (
                <TableCell key={j}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && <div className="empty-state">לא נמצאו תוצאות. נסו לשנות את החיפוש או הסינון.</div>}
    </div>
  );
}

export function SaveBar({
  onSave,
  onCancel,
  saving,
  note,
}: {
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  note?: string;
}) {
  return (
    <div className="save-bar">
      <button type={onSave ? "button" : "submit"} className="btn primary" onClick={onSave} disabled={saving}>
        <Save size={16} />
        {saving ? "שומר…" : "שמירת שינויים"}
      </button>
      {onCancel && (
        <button type="button" className="btn outline" onClick={onCancel}>
          ביטול
        </button>
      )}
      {note && <p className="hint">{note}</p>}
    </div>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return <span className={cn("avatar", className)}>{initials || "?"}</span>;
}

export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const cell = (s: string | number) => `"${String(s).replaceAll('"', '""').replace(/^[=+@-]/, "'")}"`;
  const blob = new Blob(["\ufeff" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
