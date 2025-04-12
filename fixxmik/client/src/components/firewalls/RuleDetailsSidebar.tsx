import { useState } from "react";
import { FirewallRuleResponse } from "@shared/schema";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBytes, formatNumber, formatDate } from "@/lib/utils/formatters";

interface RuleDetailsSidebarProps {
  rule: FirewallRuleResponse | null;
  onClose: () => void;
}

export default function RuleDetailsSidebar({
  rule,
  onClose,
}: RuleDetailsSidebarProps) {
  const [enabled, setEnabled] = useState<boolean>(rule?.enabled || false);

  // Update enabled state when rule changes
  if (rule && rule.enabled !== enabled) {
    setEnabled(rule.enabled);
  }

  if (!rule) return null;

  return (
    <div className="w-80 bg-card border-l border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h3 className="font-medium text-foreground">Rule Details</h3>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100vh-64px-57px)]">
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">ID</div>
          <div className="text-sm text-foreground">{rule.id}</div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">
            Rule Position
          </div>
          <div className="text-sm text-foreground">{rule.position}</div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Chain</div>
          <div className="text-sm text-foreground">{rule.chain}</div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Action</div>
          <div className="text-sm">
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                rule.action.toLowerCase() === "accept"
                  ? "bg-green-900 text-green-400"
                  : rule.action.toLowerCase() === "drop"
                    ? "bg-red-900 text-red-400"
                    : rule.action.toLowerCase() === "reject"
                      ? "bg-yellow-900 text-yellow-400"
                      : "bg-blue-900 text-blue-400"
              }`}
            >
              {rule.action.charAt(0).toUpperCase() + rule.action.slice(1)}
            </span>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">State</div>
          <div className="flex items-center">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              className="mr-2"
            />
            <span className="text-sm text-foreground">
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">
            Source Address
          </div>
          <div className="text-sm text-foreground">
            {rule.srcAddress || "0.0.0.0/0"}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">
            Destination Address
          </div>
          <div className="text-sm text-foreground">
            {rule.dstAddress || "0.0.0.0/0"}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Protocol</div>
          <div className="text-sm text-foreground">
            {rule.protocol || "any"}
          </div>
        </div>
        {rule.dstPort && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">
              Destination Port
            </div>
            <div className="text-sm text-foreground">{rule.dstPort}</div>
          </div>
        )}
        {rule.connectionState && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">
              Connection State
            </div>
            <div className="text-sm text-foreground">
              {rule.connectionState}
            </div>
          </div>
        )}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Comment</div>
          <div className="text-sm text-foreground">{rule.comment || "-"}</div>
        </div>
        <div className="mb-6">
          <div className="text-xs text-muted-foreground mb-1">
            Last Modified
          </div>
          <div className="text-sm text-foreground">
            {rule.lastModified ? formatDate(rule.lastModified) : "Unknown"}
          </div>
        </div>

        <div className="bg-background rounded-md p-4 mb-6">
          <div className="text-xs text-muted-foreground uppercase font-semibold mb-3">
            Statistics
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Hits</div>
              <div className="text-sm text-foreground font-medium">
                {formatNumber(rule.hits)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Bytes</div>
              <div className="text-sm text-foreground font-medium">
                {formatBytes(rule.bytes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Packets</div>
              <div className="text-sm text-foreground font-medium">
                {Math.round(rule.hits * 1.2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Last Hit</div>
              <div className="text-sm text-foreground font-medium">
                {rule.lastHit ? formatDate(rule.lastHit) : "Never"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button className="flex-1">Edit Rule</Button>
          <Button className="flex-1" variant="outline">
            Clone
          </Button>
        </div>
      </div>
    </div>
  );
}
