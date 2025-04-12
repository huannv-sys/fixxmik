import { useState, useEffect } from "react";
import DeviceSelector from "@/components/firewalls/DeviceSelector";
import FirewallTabsNav from "@/components/firewalls/FirewallTabsNav";
import FirewallRuleFilters from "@/components/firewalls/FirewallRuleFilters";
import FirewallRulesTable from "@/components/firewalls/FirewallRulesTable";
import RuleDetailsSidebar from "@/components/firewalls/RuleDetailsSidebar";
import RulePagination from "@/components/firewalls/RulePagination";
import { useFirewallRules } from "@/hooks/use-firewall-rules";
import { FirewallRuleResponse } from "@shared/schema";

export default function FirewallRules() {
  // State for selected device, chain, and filters
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>("All Chains");
  const [enabledFilter, setEnabledFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRule, setSelectedRule] = useState<FirewallRuleResponse | null>(
    null,
  );

  // Query for firewall rules
  const { data: allRules, isLoading } = useFirewallRules(selectedDeviceId, {
    chain: selectedChain === "All Chains" ? undefined : selectedChain,
    enabled:
      enabledFilter === "enabled"
        ? true
        : enabledFilter === "disabled"
          ? false
          : undefined,
    search: searchQuery || undefined,
  });

  // Filter and paginate rules
  const filteredRules = allRules || [];
  const totalItems = filteredRules.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  // Handle page change if current page is out of range after filtering
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Get paginated rules
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);
  const paginatedRules = filteredRules.slice(startIndex, endIndex);

  // Handle filter changes
  const handleFilterChange = ({
    enabledFilter,
    searchQuery,
    perPage,
  }: {
    enabledFilter: string;
    searchQuery: string;
    perPage: number;
  }) => {
    setEnabledFilter(enabledFilter);
    setSearchQuery(searchQuery);
    setPerPage(perPage);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle rule selection
  const handleSelectRule = (rule: FirewallRuleResponse) => {
    setSelectedRule(rule);
  };

  // Handle sidebar close
  const handleCloseSidebar = () => {
    setSelectedRule(null);
  };

  // Handle device selection
  const handleSelectDevice = (deviceId: number) => {
    setSelectedDeviceId(deviceId);
    setSelectedRule(null);
    setCurrentPage(1);
  };

  return (
    <div className="flex h-full">
      <div
        className={`flex-1 flex flex-col overflow-hidden ${selectedRule ? "mr-80" : ""}`}
      >
        <DeviceSelector
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={handleSelectDevice}
          selectedChain={selectedChain}
          onSelectChain={setSelectedChain}
        />

        <FirewallTabsNav
          activeTab="firewall"
          onTabChange={(tab) => console.log("Tab changed:", tab)}
        />

        <div className="flex-1 overflow-auto p-6 bg-background">
          <FirewallRuleFilters onFilterChange={handleFilterChange} />

          <FirewallRulesTable
            rules={paginatedRules}
            isLoading={isLoading}
            onSelectRule={handleSelectRule}
            selectedRuleId={selectedRule?.id || null}
          />

          <RulePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={perPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {selectedRule && (
        <RuleDetailsSidebar rule={selectedRule} onClose={handleCloseSidebar} />
      )}
    </div>
  );
}
