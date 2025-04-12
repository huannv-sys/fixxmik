import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDevices } from "@/hooks/use-mikrotik";
import { Button } from "@/components/ui/button";
import { Shield, Network, Wifi, Server } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { data: devices, isLoading, isError } = useDevices();

  const features = [
    {
      title: "Firewall Rules",
      description: "Monitor and manage MikroTik firewall rules",
      icon: <Shield className="h-12 w-12 text-primary" />,
      linkTo: "/firewalls",
    },
    {
      title: "Network Monitoring",
      description: "Track network performance and usage",
      icon: <Network className="h-12 w-12 text-primary" />,
      linkTo: "/network",
    },
    {
      title: "Wireless Management",
      description: "Manage wireless networks and clients",
      icon: <Wifi className="h-12 w-12 text-primary" />,
      linkTo: "/wireless",
    },
    {
      title: "Device Management",
      description: "Configure and control MikroTik devices",
      icon: <Server className="h-12 w-12 text-primary" />,
      linkTo: "/devices",
    },
  ];

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-3xl font-bold mb-6">MikroMonitor Dashboard</h1>

      {/* Connected Devices Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading devices..."
              : isError
                ? "Error loading devices"
                : `${devices?.filter((d) => d.isConnected).length || 0} of ${devices?.length || 0} devices connected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : isError ? (
            <p className="text-destructive">
              Failed to load devices. Please try again.
            </p>
          ) : devices?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                No devices have been added yet.
              </p>
              <Button onClick={() => navigate("/devices")}>Add Device</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices?.map((device) => (
                <Card
                  key={device.id}
                  className={
                    device.isConnected
                      ? "border-green-500"
                      : "border-destructive"
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {device.address}
                        </p>
                      </div>
                      <div
                        className={`rounded-full h-3 w-3 ${device.isConnected ? "bg-green-500" : "bg-destructive"}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <h2 className="text-xl font-semibold mb-4">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="hover:border-primary cursor-pointer"
            onClick={() => navigate(feature.linkTo)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
