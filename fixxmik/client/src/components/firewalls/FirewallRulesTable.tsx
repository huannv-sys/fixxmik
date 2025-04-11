import { useState } from 'react';
import { FirewallRuleResponse } from '@shared/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, ChevronDown } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';

interface FirewallRulesTableProps {
  rules: FirewallRuleResponse[];
  isLoading: boolean;
  onSelectRule: (rule: FirewallRuleResponse) => void;
  selectedRuleId: string | null;
}

export default function FirewallRulesTable({ 
  rules,
  isLoading,
  onSelectRule,
  selectedRuleId
}: FirewallRulesTableProps) {
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRules([]);
    } else {
      setSelectedRules(rules.map(rule => rule.id));
    }
    setSelectAll(!selectAll);
  };
  
  const handleSelectRule = (ruleId: string) => {
    if (selectedRules.includes(ruleId)) {
      setSelectedRules(selectedRules.filter(id => id !== ruleId));
    } else {
      setSelectedRules([...selectedRules, ruleId]);
    }
  };
  
  const getStatusBadgeClasses = (enabled: boolean) => {
    return enabled
      ? 'px-2 py-1 text-xs rounded-full bg-green-900 text-green-400'
      : 'px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-400';
  };
  
  const getActionBadgeClasses = (action: string) => {
    switch (action.toLowerCase()) {
      case 'accept':
        return 'px-2 py-1 text-xs rounded-full bg-green-900 text-green-400';
      case 'drop':
        return 'px-2 py-1 text-xs rounded-full bg-red-900 text-red-400';
      case 'reject':
        return 'px-2 py-1 text-xs rounded-full bg-yellow-900 text-yellow-400';
      default:
        return 'px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">Loading firewall rules...</p>
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No firewall rules found for this device.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-16">
              State
              <ChevronDown className="inline-block ml-1 w-3 h-3" />
            </TableHead>
            <TableHead>
              Chain
              <ChevronDown className="inline-block ml-1 w-3 h-3" />
            </TableHead>
            <TableHead>
              Action
              <ChevronDown className="inline-block ml-1 w-3 h-3" />
            </TableHead>
            <TableHead>Src Address</TableHead>
            <TableHead>Dst Address</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>
              Hits
              <ChevronDown className="inline-block ml-1 w-3 h-3" />
            </TableHead>
            <TableHead>
              Bytes
              <ChevronDown className="inline-block ml-1 w-3 h-3" />
            </TableHead>
            <TableHead>Comment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow 
              key={rule.id}
              className={`hover:bg-muted/50 cursor-pointer ${selectedRuleId === rule.id ? 'bg-muted' : ''}`}
              onClick={() => onSelectRule(rule)}
            >
              <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={selectedRules.includes(rule.id)}
                  onCheckedChange={() => handleSelectRule(rule.id)}
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.position}</TableCell>
              <TableCell>
                <span className={getStatusBadgeClasses(rule.enabled)}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.chain}</TableCell>
              <TableCell>
                <span className={getActionBadgeClasses(rule.action)}>
                  {rule.action.charAt(0).toUpperCase() + rule.action.slice(1)}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.srcAddress || '0.0.0.0/0'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.dstAddress || '0.0.0.0/0'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.protocol || 'any'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatNumber(rule.hits)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatBytes(rule.bytes)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.comment || '-'}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 mx-1">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 mx-1">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
