import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <div className="fixed h-full z-40">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
      <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <TopNavbar toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-6 w-full">
          <div className="w-full px-2">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
};

export default AppLayout;
