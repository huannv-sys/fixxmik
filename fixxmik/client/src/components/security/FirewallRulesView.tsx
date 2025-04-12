import React, { useEffect, useState } from "react";
import { Container, Tabs, Tab, Card } from "react-bootstrap";
import FirewallRulesTable from "./FirewallRulesTable";
import { useParams } from "wouter";
import axios from "axios";

const FirewallRulesView: React.FC = () => {
  const params = useParams();
  const deviceId = params.deviceId || "1";
  const [deviceName, setDeviceName] = useState("");
  const [activeTab, setActiveTab] = useState("filter");

  useEffect(() => {
    // Lấy thông tin thiết bị để hiển thị tên
    const fetchDeviceInfo = async () => {
      try {
        const response = await axios.get(`/api/devices/${deviceId}`);
        if (response.data) {
          setDeviceName(response.data.name || `Device ${deviceId}`);
        }
      } catch (error) {
        console.error("Error fetching device info:", error);
      }
    };

    fetchDeviceInfo();
  }, [deviceId]);

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">Security Monitoring</h1>
          <div>
            Device: <strong>{deviceName}</strong>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          <Tabs
            id="firewall-tabs"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || "filter")}
            className="mb-3 px-3 pt-3"
          >
            <Tab eventKey="threats" title="Security Threats">
              <div className="p-3">
                <p className="text-muted">
                  Security threat detection information will be displayed here.
                </p>
              </div>
            </Tab>
            <Tab eventKey="analysis" title="Traffic Analysis">
              <div className="p-3">
                <p className="text-muted">
                  Traffic analysis information will be displayed here.
                </p>
              </div>
            </Tab>
            <Tab eventKey="filter" title="Firewall Rules">
              <div className="p-3">
                <FirewallRulesTable />
              </div>
            </Tab>
            <Tab eventKey="vpn" title="VPN Status">
              <div className="p-3">
                <p className="text-muted">
                  VPN status information will be displayed here.
                </p>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FirewallRulesView;
