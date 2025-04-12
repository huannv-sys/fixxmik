import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Alert,
  Badge,
  Button,
  Spinner,
} from "../components/ui/bootstrap";
import { useWebSocketContext } from "../lib/websocket-context";

// Interface cho thiết bị mạng (client)
interface NetworkDevice {
  id: number;
  ipAddress: string;
  macAddress: string;
  hostName?: string;
  interface?: string;
  deviceType?: string;
  vendor?: string;
  firstSeen?: string;
  lastSeen?: string;
  isOnline?: boolean;
  deviceData?: any;
  txBytes?: number;
  rxBytes?: number;
  txRate?: number;
  rxRate?: number;
}

// Interface cho thiết bị RouterOS
interface RouterDevice {
  id: number;
  name: string;
  ipAddress: string;
  username?: string;
  model?: string;
  serialNumber?: string;
  routerOsVersion?: string;
  firmware?: string;
  boardName?: string;
  cpu?: string;
  cpuCount?: number;
  totalMemory?: string;
  freeMemory?: string;
  architecture?: string;
  isOnline?: boolean;
}

// Interface cho thông tin interface của router
interface RouterInterface {
  id: string;
  name: string;
  type: string;
  mtu?: number;
  actualMtu?: number;
  l2mtu?: number;
  macAddress?: string;
  running?: boolean;
  disabled?: boolean;
  comment?: string;
  txPackets?: number;
  rxPackets?: number;
  txBytes?: number;
  rxBytes?: number;
  txDrops?: number;
  rxDrops?: number;
  txErrors?: number;
  rxErrors?: number;
  lastLinkUpTime?: string;
  linkDowns?: number;
  speed?: string;
}

// Interface cho thông báo alert
interface AlertMessage {
  type: "success" | "danger" | "warning" | "info";
  message: string;
}

const ClientsPage: React.FC = () => {
  // States cho quản lý client
  const [clients, setClients] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [refreshingAll, setRefreshingAll] = useState<boolean>(false);
  const [subnet, setSubnet] = useState<string>("");
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [selectedClient, setSelectedClient] = useState<NetworkDevice | null>(
    null,
  );
  const [deviceDetails, setDeviceDetails] = useState<NetworkDevice | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // States cho quản lý router
  const [devices, setDevices] = useState<RouterDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<RouterDevice | null>(
    null,
  );
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [interfaceInfo, setInterfaceInfo] = useState<RouterInterface[]>([]);

  // Sử dụng hook để lấy context
  const { subscribe, unsubscribe } = useWebSocketContext();

  // Fetch clients on component mount
  useEffect(() => {
    fetchDevices();

    // Subscribe to WebSocket events for real-time updates
    subscribe("network-devices-update", (data) => {
      if (data && Array.isArray(data)) {
        setClients((prev) => {
          // Update existing clients with new data
          const updated = [...prev];
          data.forEach((newDevice) => {
            const index = updated.findIndex((d) => d.id === newDevice.id);
            if (index >= 0) {
              updated[index] = { ...updated[index], ...newDevice };
            } else {
              updated.push(newDevice);
            }
          });
          return updated;
        });
      } else if (data && typeof data === "object") {
        // Single device update
        updateClientInList(data);
      }
    });

    // Cleanup function
    return () => {
      unsubscribe("network-devices-update");
    };
  }, []);

  // Khi chọn thiết bị, tải dữ liệu client của thiết bị đó
  useEffect(() => {
    if (deviceId) {
      fetchDeviceInterfaces(deviceId);
      fetchClientsForDevice(deviceId);
    }
  }, [deviceId]);

  // Tải danh sách thiết bị RouterOS
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/devices");
      if (response.data && Array.isArray(response.data)) {
        setDevices(response.data);

        // Nếu có thiết bị, tải thông tin client cho thiết bị đầu tiên
        if (response.data.length > 0) {
          setSelectedDevice(response.data[0]);
          setDeviceId(response.data[0].id);
        }
      } else {
        setDevices([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setAlert({
        type: "danger",
        message: "Failed to fetch devices. Please try again later.",
      });
      setLoading(false);
    }
  };

  // Tải danh sách interface của thiết bị
  const fetchDeviceInterfaces = async (deviceId: number) => {
    try {
      const response = await axios.get(`/api/devices/${deviceId}/interfaces`);
      if (response.data && Array.isArray(response.data)) {
        setInterfaceInfo(response.data);
      } else {
        setInterfaceInfo([]);
      }
    } catch (error) {
      console.error(`Error fetching interfaces for device ${deviceId}:`, error);
      setInterfaceInfo([]);
    }
  };

  // Tải danh sách client theo thiết bị
  const fetchClientsForDevice = async (deviceId: number) => {
    try {
      setLoading(true);

      // Tải từ API /api/devices/:id/clients để lấy dữ liệu ARP table
      const response = await axios.get(`/api/devices/${deviceId}/clients`);

      if (response.data && Array.isArray(response.data)) {
        console.log(`Nhận được ${response.data.length} thiết bị từ API`);

        // Thêm ID nếu chưa có để đảm bảo không gặp lỗi khi hiển thị
        const clientsWithId = response.data.map(
          (client: any, index: number) => {
            if (!client.id) {
              return { ...client, id: `temp-${index}` };
            }
            return client;
          },
        );

        setClients(clientsWithId);
      } else {
        // Tải từ API /api/clients nếu API trên không có dữ liệu
        const fallbackResponse = await axios.get("/api/clients");
        console.log("Sử dụng API dự phòng");

        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          setClients(fallbackResponse.data);
        } else if (fallbackResponse.data && fallbackResponse.data.devices) {
          setClients(fallbackResponse.data.devices);
        } else {
          setClients([]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching network clients:", error);
      setAlert({
        type: "danger",
        message: "Failed to fetch network clients. Please try again later.",
      });
      setLoading(false);
    }
  };

  const scanNetwork = async () => {
    try {
      if (!deviceId) {
        setAlert({
          type: "danger",
          message: "Please select a router first",
        });
        return;
      }

      setScanning(true);
      setAlert(null);
      // Gửi yêu cầu quét dựa trên subnet hoặc tự động phát hiện
      const response = await axios.post("/api/clients/scan", {
        subnet: subnet || undefined,
        autoDetect: !subnet, // Tự động phát hiện nếu không có subnet
        routerId: deviceId, // Thêm routerId để API biết thiết bị nào cần quét
      });

      if (response.data && response.data.devices) {
        setClients((prevClients) => {
          // Đảm bảo prev là mảng
          const currentClients = Array.isArray(prevClients) ? prevClients : [];

          // Merge new devices with existing ones
          const existingIds = new Set(currentClients.map((d) => d.id));
          const newDevices = response.data.devices.filter(
            (d: NetworkDevice) => !existingIds.has(d.id),
          );
          return [...currentClients, ...newDevices];
        });
        setAlert({
          type: "success",
          message: `Network scan completed. Found ${response.data.devices.length} devices.`,
        });
      } else {
        setAlert({
          type: "info",
          message: "Network scan completed but no devices were found.",
        });
      }
      setScanning(false);
    } catch (error) {
      console.error("Error scanning network:", error);
      setAlert({
        type: "danger",
        message: "Failed to scan network. Please try again later.",
      });
      setScanning(false);
    }
  };

  const refreshAllClients = async () => {
    try {
      setRefreshingAll(true);
      const response = await axios.post("/api/clients/refresh-all");
      setClients(response.data);
      setAlert({
        type: "success",
        message: "All clients refreshed successfully.",
      });
      setRefreshingAll(false);
    } catch (error) {
      console.error("Error refreshing clients:", error);
      setAlert({
        type: "danger",
        message: "Failed to refresh clients. Please try again later.",
      });
      setRefreshingAll(false);
    }
  };

  const refreshClient = async (clientId: number) => {
    try {
      const response = await axios.post(`/api/clients/${clientId}/refresh`);
      updateClientInList(response.data);
      setAlert({
        type: "success",
        message: "Client refreshed successfully.",
      });

      // If we're viewing details of this client, update them too
      if (selectedClient && selectedClient.id === clientId) {
        setDeviceDetails(response.data);
      }
    } catch (error) {
      console.error("Error refreshing client:", error);
      setAlert({
        type: "danger",
        message: "Failed to refresh client. Please try again later.",
      });
    }
  };

  const updateClientInList = (updatedClient: NetworkDevice) => {
    setClients((prevClients) => {
      // Đảm bảo prev là mảng
      const currentClients = Array.isArray(prevClients) ? prevClients : [];
      const updated = [...currentClients];

      const index = updated.findIndex((c) => c.id === updatedClient.id);
      if (index >= 0) {
        updated[index] = { ...updated[index], ...updatedClient };
      } else {
        updated.push(updatedClient);
      }
      return updated;
    });
  };

  const identifyDevice = async (clientId: number) => {
    try {
      setAlert(null);
      const response = await axios.post(`/api/clients/${clientId}/identify`);

      const updatedClient = response.data.device || response.data;
      updateClientInList(updatedClient);

      setAlert({
        type: "success",
        message: "Device identified successfully.",
      });

      // If we're viewing details of this client, update them too
      if (selectedClient && selectedClient.id === clientId) {
        setDeviceDetails(updatedClient);
      }
    } catch (error) {
      console.error("Error identifying device:", error);
      setAlert({
        type: "danger",
        message: "Failed to identify device. Please try again later.",
      });
    }
  };

  const collectTrafficData = async (clientId: number) => {
    try {
      setAlert(null);
      const response = await axios.post(`/api/clients/${clientId}/traffic`);

      const updatedClient = response.data.device || response.data;
      updateClientInList(updatedClient);

      setAlert({
        type: "success",
        message: "Traffic data collected successfully.",
      });

      // If we're viewing details of this client, update them too
      if (selectedClient && selectedClient.id === clientId) {
        setDeviceDetails(updatedClient);
      }
    } catch (error) {
      console.error("Error collecting traffic data:", error);
      setAlert({
        type: "danger",
        message: "Failed to collect traffic data. Please try again later.",
      });
    }
  };

  const viewClientDetails = (client: NetworkDevice) => {
    setSelectedClient(client);
    setDeviceDetails(null);
    setDetailsLoading(true);

    axios
      .get(`/api/clients/${client.id}`)
      .then((response) => {
        if (response.data && response.data.device) {
          setDeviceDetails(response.data.device);
        } else {
          setDeviceDetails(response.data);
        }
        setDetailsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching client details:", error);
        setAlert({
          type: "danger",
          message: "Failed to fetch client details. Please try again later.",
        });
        setDetailsLoading(false);
      });
  };

  const closeDetails = () => {
    setSelectedClient(null);
    setDeviceDetails(null);
  };

  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatBps = (bps?: number, decimals = 2) => {
    if (!bps || bps === 0) return "0 bps";

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];

    const i = Math.floor(Math.log(bps) / Math.log(k));

    return parseFloat((bps / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getStatusBadge = (client: NetworkDevice) => {
    if (client.isOnline) {
      return <Badge variant="success">Online</Badge>;
    } else {
      return <Badge variant="danger">Offline</Badge>;
    }
  };

  const getDeviceTypeBadge = (client: NetworkDevice) => {
    const type = client.deviceType || "Unknown";
    let variant:
      | "success"
      | "danger"
      | "warning"
      | "info"
      | "secondary"
      | "primary"
      | "dark"
      | "light" = "secondary";

    switch (type.toLowerCase()) {
      case "router":
        variant = "primary";
        break;
      case "switch":
        variant = "info";
        break;
      case "access point":
      case "accesspoint":
      case "wireless":
        variant = "success";
        break;
      case "server":
        variant = "dark";
        break;
      case "phone":
      case "mobile":
        variant = "warning";
        break;
      case "camera":
      case "iot":
        variant = "danger";
        break;
      default:
        variant = "secondary";
    }

    return <Badge variant={variant}>{type}</Badge>;
  };

  const renderClientCard = (client: NetworkDevice) => {
    return (
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">{client.hostName || client.ipAddress}</h5>
            <div>
              {getStatusBadge(client)} {getDeviceTypeBadge(client)}
            </div>
          </div>

          <div className="mb-3">
            <div>
              <strong>IP:</strong> {client.ipAddress}
            </div>
            <div>
              <strong>MAC:</strong> {client.macAddress}
            </div>
            {client.vendor && (
              <div>
                <strong>Vendor:</strong> {client.vendor}
              </div>
            )}
            {client.interface && (
              <div>
                <strong>Interface:</strong> {client.interface}
              </div>
            )}
          </div>

          {(client.txBytes !== undefined || client.rxBytes !== undefined) && (
            <div className="mb-3">
              {client.txBytes !== undefined && (
                <div>
                  <strong>TX:</strong> {formatBytes(client.txBytes)}
                </div>
              )}
              {client.rxBytes !== undefined && (
                <div>
                  <strong>RX:</strong> {formatBytes(client.rxBytes)}
                </div>
              )}
              {client.txRate !== undefined && (
                <div>
                  <strong>TX Rate:</strong> {formatBps(client.txRate)}
                </div>
              )}
              {client.rxRate !== undefined && (
                <div>
                  <strong>RX Rate:</strong> {formatBps(client.rxRate)}
                </div>
              )}
            </div>
          )}

          <div className="d-flex justify-content-between">
            <Button
              variant="primary"
              size="sm"
              onClick={() => viewClientDetails(client)}
            >
              View Details
            </Button>
            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => refreshClient(client.id)}
              >
                Refresh
              </Button>
              <Button
                variant="outline-info"
                size="sm"
                className="me-2"
                onClick={() => identifyDevice(client.id)}
              >
                Identify
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => collectTrafficData(client.id)}
              >
                Traffic
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderClientDetails = () => {
    if (!selectedClient) return null;

    return (
      <div className="client-details-panel">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Client Details</h5>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={closeDetails}
            >
              Close
            </Button>
          </Card.Header>

          <Card.Body>
            {detailsLoading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading client details...</p>
              </div>
            ) : deviceDetails ? (
              <div>
                <div className="mb-4">
                  <h4>{deviceDetails.hostName || deviceDetails.ipAddress}</h4>
                  <div className="mb-2">
                    {getStatusBadge(deviceDetails)}{" "}
                    {getDeviceTypeBadge(deviceDetails)}
                  </div>
                </div>

                <div className="mb-4">
                  <h5>Network Information</h5>
                  <div className="mb-3">
                    <div>
                      <strong>IP Address:</strong> {deviceDetails.ipAddress}
                    </div>
                    <div>
                      <strong>MAC Address:</strong> {deviceDetails.macAddress}
                    </div>
                    {deviceDetails.vendor && (
                      <div>
                        <strong>Vendor:</strong> {deviceDetails.vendor}
                      </div>
                    )}
                    {deviceDetails.interface && (
                      <div>
                        <strong>Interface:</strong> {deviceDetails.interface}
                      </div>
                    )}
                  </div>
                </div>

                {deviceDetails.deviceData && (
                  <div className="mb-4">
                    <h5>Device Information</h5>
                    <pre className="bg-light p-3 rounded">
                      {JSON.stringify(deviceDetails.deviceData, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mb-4">
                  <h5>Traffic Statistics</h5>
                  {deviceDetails.txBytes !== undefined && (
                    <div>
                      <strong>TX:</strong> {formatBytes(deviceDetails.txBytes)}
                    </div>
                  )}
                  {deviceDetails.rxBytes !== undefined && (
                    <div>
                      <strong>RX:</strong> {formatBytes(deviceDetails.rxBytes)}
                    </div>
                  )}
                  {deviceDetails.txRate !== undefined && (
                    <div>
                      <strong>TX Rate:</strong>{" "}
                      {formatBps(deviceDetails.txRate)}
                    </div>
                  )}
                  {deviceDetails.rxRate !== undefined && (
                    <div>
                      <strong>RX Rate:</strong>{" "}
                      {formatBps(deviceDetails.rxRate)}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h5>Timeline</h5>
                  <div>
                    <strong>First Seen:</strong>{" "}
                    {new Date(deviceDetails.firstSeen).toLocaleString()}
                  </div>
                  <div>
                    <strong>Last Seen:</strong>{" "}
                    {new Date(deviceDetails.lastSeen).toLocaleString()}
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <Button
                    variant="outline-primary"
                    onClick={() => refreshClient(deviceDetails.id)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline-info"
                    onClick={() => identifyDevice(deviceDetails.id)}
                  >
                    Identify Device
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={() => collectTrafficData(deviceDetails.id)}
                  >
                    Collect Traffic
                  </Button>
                </div>
              </div>
            ) : (
              <p>No details available for this client.</p>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  // Hàm xử lý khi chọn thiết bị khác
  const handleDeviceChange = (device: any) => {
    setSelectedDevice(device);
    setDeviceId(device.id);
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Thiết Bị Mạng</h1>
        <div>
          <Button
            variant="outline-secondary"
            className="me-2"
            onClick={() =>
              deviceId ? fetchClientsForDevice(deviceId) : fetchDevices()
            }
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" /> Loading...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
          <Button
            variant="outline-primary"
            onClick={refreshAllClients}
            disabled={refreshingAll}
          >
            {refreshingAll ? (
              <>
                <Spinner animation="border" size="sm" /> Updating...
              </>
            ) : (
              "Update All Status"
            )}
          </Button>
        </div>
      </div>

      {alert && (
        <Alert
          variant={alert.type}
          dismissible
          onClose={() => setAlert(null)}
          className="mb-4"
        >
          {alert.message}
        </Alert>
      )}

      {/* Router Selection */}
      <div className="mb-4">
        <Card>
          <Card.Body>
            <h5 className="mb-3">Chọn Router</h5>
            <div className="row">
              {devices.length > 0 ? (
                <div className="d-flex flex-row mb-3 overflow-auto">
                  {devices.map((device, index) => (
                    <div
                      key={device.id}
                      className={`device-selector p-3 me-3 border rounded cursor-pointer ${selectedDevice && selectedDevice.id === device.id ? "border-primary bg-light" : ""}`}
                      style={{ minWidth: "220px", cursor: "pointer" }}
                      onClick={() => handleDeviceChange(device)}
                    >
                      <div className="d-flex align-items-center mb-2">
                        <div
                          className={`status-indicator me-2 ${device.isOnline ? "bg-success" : "bg-danger"}`}
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                          }}
                        />
                        <h6 className="mb-0">{device.name}</h6>
                      </div>
                      <div className="small text-muted">{device.ipAddress}</div>
                      <div className="small mt-1">
                        {device.model || "Router"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="col-12 text-center p-3 bg-light rounded">
                  <p className="mb-2">Không tìm thấy router nào.</p>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Network Scanner */}
      <div className="mb-4">
        <Card>
          <Card.Body>
            <Card.Title>Quét Mạng</Card.Title>
            <div className="row g-3 align-items-center">
              <div className="col-md-6">
                <label htmlFor="subnet" className="form-label">
                  Subnet (tùy chọn)
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="subnet"
                  placeholder="Ví dụ: 192.168.1.0/24"
                  value={subnet}
                  onChange={(e) => setSubnet(e.target.value)}
                />
                <div className="form-text">Để trống để quét mạng cục bộ</div>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <Button
                  variant="primary"
                  onClick={scanNetwork}
                  disabled={scanning}
                  className="w-100"
                >
                  {scanning ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      Đang quét mạng...
                    </>
                  ) : (
                    "Quét mạng"
                  )}
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Interface Information */}
      {selectedDevice && (
        <div className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Thông Tin Interface</Card.Title>
              {interfaceInfo.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Loại</th>
                        <th>MAC</th>
                        <th>Status</th>
                        <th>TX/RX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interfaceInfo.map((iface) => (
                        <tr key={iface.id}>
                          <td>{iface.name}</td>
                          <td>{iface.type}</td>
                          <td>{iface.macAddress || "N/A"}</td>
                          <td>
                            <Badge
                              variant={iface.running ? "success" : "danger"}
                            >
                              {iface.running ? "Up" : "Down"}
                            </Badge>
                            {iface.disabled && (
                              <Badge variant="warning" className="ms-1">
                                Disabled
                              </Badge>
                            )}
                          </td>
                          <td>
                            {iface.txBytes !== undefined && (
                              <div className="small">
                                TX: {formatBytes(iface.txBytes)}
                              </div>
                            )}
                            {iface.rxBytes !== undefined && (
                              <div className="small">
                                RX: {formatBytes(iface.rxBytes)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center p-3 bg-light rounded">
                  Không có thông tin interface
                </p>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      <div className="row">
        <div className={selectedClient ? "col-md-8" : "col-md-12"}>
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" />
              <p className="mt-3">Loading network clients...</p>
            </div>
          ) : clients.length > 0 ? (
            <div>
              <p className="text-muted mb-3">
                Showing {clients.length} network clients
              </p>
              {clients.map((client) => (
                <div key={client.id}>{renderClientCard(client)}</div>
              ))}
            </div>
          ) : (
            <div className="text-center p-5 bg-light rounded">
              <p className="mb-3">No network clients found.</p>
              <Button variant="primary" onClick={scanNetwork}>
                Scan Network
              </Button>
            </div>
          )}
        </div>

        {selectedClient && (
          <div className="col-md-4">{renderClientDetails()}</div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
