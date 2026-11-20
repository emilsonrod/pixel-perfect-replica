import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "./icon-button";

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="search-field">
      <Search />
      <Input
        aria-label="Buscar productos"
        placeholder="Buscar productos…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={100}
      />
      {value && (
        <IconButton
          label="Limpiar búsqueda"
          className="search-clear h-8 w-8"
          onClick={() => onChange("")}
        >
          <X />
        </IconButton>
      )}
    </div>
  );
}
