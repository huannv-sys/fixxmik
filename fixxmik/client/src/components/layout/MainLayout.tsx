import React from "react";
import Sidebar from "./Sidebar";
import { Bell, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">MikroMonitor</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search..."
                className="w-64 pl-9"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button className="text-foreground hover:text-primary focus:outline-none">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
              </button>
            </div>

            {/* Settings */}
            <button className="text-foreground hover:text-primary focus:outline-none">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
