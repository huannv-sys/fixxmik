import { Route, Switch } from "wouter";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import Alerts from "@/pages/alerts";
import Network from "@/pages/network";
import Security from "@/pages/security";
import Settings from "@/pages/settings";
import PerformanceReports from "@/pages/reports";
import EventHistory from "@/pages/events";
import Wireless from "@/pages/wireless";
import Capsman from "@/pages/capsman";
import Clients from "@/pages/clients";
import TrafficAnalysis from "@/pages/traffic-analysis";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";

function App() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/devices" component={Devices} />
        <Route path="/clients" component={Clients} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/network" component={Network} />
        <Route path="/wireless" component={Wireless} />
        <Route path="/capsman" component={Capsman} />
        <Route path="/security" component={Security} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={PerformanceReports} />
        <Route path="/events" component={EventHistory} />
        <Route path="/traffic-analysis" component={TrafficAnalysis} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default App;
