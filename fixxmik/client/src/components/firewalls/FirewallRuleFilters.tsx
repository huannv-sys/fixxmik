import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FirewallRuleFiltersProps {
  onFilterChange: (filters: {
    enabledFilter: string;
    searchQuery: string;
    perPage: number;
  }) => void;
}

export default function FirewallRuleFilters({
  onFilterChange,
}: FirewallRuleFiltersProps) {
  const [enabledFilter, setEnabledFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);

  const handleEnableFilterChange = (value: string) => {
    setEnabledFilter(value);
    onFilterChange({ enabledFilter: value, searchQuery, perPage });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onFilterChange({ enabledFilter, searchQuery: e.target.value, perPage });
  };

  const handlePerPageChange = (value: string) => {
    const newPerPage = parseInt(value);
    setPerPage(newPerPage);
    onFilterChange({ enabledFilter, searchQuery, perPage: newPerPage });
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex space-x-2">
        <Button
          variant={enabledFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleEnableFilterChange("all")}
        >
          All Rules
        </Button>
        <Button
          variant={enabledFilter === "enabled" ? "default" : "outline"}
          size="sm"
          onClick={() => handleEnableFilterChange("enabled")}
        >
          Enabled
        </Button>
        <Button
          variant={enabledFilter === "disabled" ? "default" : "outline"}
          size="sm"
          onClick={() => handleEnableFilterChange("disabled")}
        >
          Disabled
        </Button>
      </div>
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Search rules..."
          className="w-64"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <Select value={perPage.toString()} onValueChange={handlePerPageChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rules per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">Show all</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
