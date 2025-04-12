import { useState } from "react";

interface FirewallTabsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FirewallTabsNav({
  activeTab,
  onTabChange,
}: FirewallTabsNavProps) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "firewall", label: "Firewall Rules" },
    { id: "nat", label: "NAT" },
    { id: "addresslists", label: "Address Lists" },
  ];

  return (
    <div className="bg-card px-6 border-b border-border">
      <div className="flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`py-3 ${
              activeTab === tab.id
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground border-b-2 border-transparent hover:text-foreground"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
