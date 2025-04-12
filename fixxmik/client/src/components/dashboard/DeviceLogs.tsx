import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw, Filter, Search, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogEntry = {
  ".id": string;
  time: string;
  topics: string;
  message: string;
};

type LogsResponse = {
  success: boolean;
  data?: LogEntry[];
  message: string;
};

const topicColors: Record<string, string> = {
  system: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  firewall: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  dhcp: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  wireless: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", 
  error: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  debug: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

interface DeviceLogsProps {
  deviceId: number;
}

const DeviceLogs = ({ deviceId }: DeviceLogsProps) => {
  const [limit, setLimit] = useState(50);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Truy vấn dữ liệu logs từ API
  const { 
    data: logsResponse, 
    isLoading, 
    error, 
    refetch,
    isRefetching
  } = useQuery<LogsResponse>({
    queryKey: [`/api/devices/${deviceId}/logs?limit=${limit}${selectedTopics.length > 0 ? `&topics=${selectedTopics.join(',')}` : ''}`],
    refetchInterval: 5000, // Refresh logs mỗi 5 giây để cập nhật gần thời gian thực
    enabled: Boolean(deviceId), // Chỉ truy vấn khi deviceId có giá trị
    retry: 3 // Thử lại 3 lần nếu có lỗi
  });

  // Tạo danh sách các topics duy nhất từ logs
  useEffect(() => {
    if (logsResponse?.data) {
      const topics = new Set<string>();
      logsResponse.data.forEach(log => {
        if (log.topics) {
          log.topics.split(',').forEach(topic => {
            topics.add(topic.trim());
          });
        }
      });
      setAllTopics(Array.from(topics).sort());
    }
  }, [logsResponse]);

  // Lọc logs theo topics đã chọn và từ khóa tìm kiếm
  useEffect(() => {
    if (logsResponse?.data) {
      let filtered = logsResponse.data;
      
      // Lọc theo topics
      if (selectedTopics.length > 0) {
        filtered = filtered.filter(log => {
          if (!log.topics) return false;
          const logTopics = log.topics.split(',').map(t => t.trim());
          return selectedTopics.some(topic => logTopics.includes(topic));
        });
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        filtered = filtered.filter(log => 
          log.message?.toLowerCase().includes(search) || 
          log.topics?.toLowerCase().includes(search) ||
          log.time?.toLowerCase().includes(search)
        );
      }

      setFilteredLogs(filtered);
    }
  }, [logsResponse, selectedTopics, searchFilter]);

  // Xử lý chọn/bỏ chọn topic
  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Tạo badge cho từng topic trong log
  const renderTopicBadges = (topics: string) => {
    if (!topics) return null;
    
    return topics.split(',').map((topic, index) => {
      const trimmedTopic = topic.trim();
      const colorClass = topicColors[trimmedTopic.toLowerCase()] || topicColors.default;
      
      return (
        <Badge 
          key={index} 
          className={`mr-1 mb-1 text-xs ${colorClass}`}
        >
          {trimmedTopic}
        </Badge>
      );
    });
  };

  return (
    <Card className="col-span-12 h-full shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">System Logs</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowFilterOptions(!showFilterOptions)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <Select 
              onValueChange={(val) => setLimit(parseInt(val))}
              defaultValue={limit.toString()}
            >
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 entries</SelectItem>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          View and filter system logs from the device
        </CardDescription>
      </CardHeader>

      {showFilterOptions && (
        <div className="px-6 pb-2">
          <div className="flex flex-col gap-3 p-3 border rounded-md bg-muted/20">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in logs..."
                className="h-8"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-1 block">Topics</Label>
              <div className="flex flex-wrap gap-2">
                {allTopics.map((topic) => (
                  <div key={topic} className="flex items-center space-x-1">
                    <Checkbox 
                      id={`topic-${topic}`} 
                      checked={selectedTopics.includes(topic)}
                      onCheckedChange={() => handleTopicToggle(topic)}
                    />
                    <Label 
                      htmlFor={`topic-${topic}`}
                      className="text-sm cursor-pointer"
                    >
                      {topic}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-500">
            Error loading logs. Please try again.
          </div>
        ) : !logsResponse?.success ? (
          <div className="flex justify-center items-center h-64 text-red-500">
            {logsResponse?.message || "Failed to load logs"}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-muted-foreground">
            No logs found matching the current filters
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-350px)] min-h-[300px] pr-4">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div 
                  key={log['.id']} 
                  className="p-2 rounded border border-muted hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">
                      {log.time}
                    </div>
                    <div className="flex flex-wrap">
                      {renderTopicBadges(log.topics)}
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceLogs;