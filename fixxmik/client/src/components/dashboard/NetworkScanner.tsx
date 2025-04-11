import React, { useState } from 'react';
import { Button, Card, Badge, Alert, Spinner } from '../ui/bootstrap';
import { FaNetworkWired, FaSearch, FaPlus } from 'react-icons/fa';

interface NetworkScannerProps {
  onDeviceFound?: (device: MikrotikDevice) => void;
}

interface MikrotikDevice {
  ip: string;
  hostname?: string;
  api_port?: number;
  web_port?: number;
  is_mikrotik: boolean;
  description: string;
}

const NetworkScanner: React.FC<NetworkScannerProps> = ({ onDeviceFound }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MikrotikDevice[]>([]);
  const [networks, setNetworks] = useState<string[]>(['192.168.1.0/24']);
  const [newNetwork, setNewNetwork] = useState('');
  const [autoDetect, setAutoDetect] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddNetwork = () => {
    if (newNetwork && !networks.includes(newNetwork)) {
      setNetworks([...networks, newNetwork]);
      setNewNetwork('');
    }
  };

  const handleRemoveNetwork = (network: string) => {
    setNetworks(networks.filter(n => n !== network));
  };

  const handleScan = async () => {
    if (!autoDetect && networks.length === 0) {
      setError('Hãy thêm ít nhất một dải mạng hoặc chọn tự động phát hiện');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/network-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networks: autoDetect ? undefined : networks,
          autoDetect,
          concurrent: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi quét mạng');
      }

      setResults(data.devices || []);
      setSuccessMessage(data.message);

      // Callback for each device found
      if (onDeviceFound && data.devices) {
        data.devices.forEach((device: MikrotikDevice) => onDeviceFound(device));
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi quét mạng');
    } finally {
      setLoading(false);
    }
  };

  const scanSingleIp = async (ip: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/network-scan/ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi quét IP');
      }

      if (data.device) {
        // Nếu tìm thấy thiết bị, thêm vào kết quả và gọi callback
        const updatedResults = [...results, data.device];
        setResults(updatedResults);
        setSuccessMessage(data.message);

        if (onDeviceFound) {
          onDeviceFound(data.device);
        }
      } else {
        setSuccessMessage(`Không tìm thấy thiết bị MikroTik tại ${ip}`);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi quét IP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-secondary text-white d-flex align-items-center">
        <FaNetworkWired className="me-2" />
        <h5 className="mb-0">Quét mạng tìm thiết bị MikroTik</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <div className="mb-3">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="autoDetect"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="autoDetect">
              Tự động phát hiện mạng
            </label>
          </div>
        </div>

        {!autoDetect && (
          <div className="mb-3">
            <label className="form-label">Dải mạng cần quét (định dạng CIDR)</label>
            <div className="mb-2">
              {networks.map((network) => (
                <Badge
                  key={network}
                  bg="info"
                  className="me-2 mb-2 p-2"
                  style={{ fontSize: '0.9rem' }}
                >
                  {network}
                  <button
                    className="ms-2 btn-close btn-close-white"
                    style={{ fontSize: '0.5rem' }}
                    onClick={() => handleRemoveNetwork(network)}
                    disabled={loading}
                    aria-label="Xóa"
                  ></button>
                </Badge>
              ))}
            </div>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: 192.168.1.0/24"
                value={newNetwork}
                onChange={(e) => setNewNetwork(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNetwork()}
              />
              <Button
                variant="outline-secondary"
                onClick={handleAddNetwork}
                disabled={loading || !newNetwork}
              >
                <FaPlus /> Thêm
              </Button>
            </div>
          </div>
        )}

        <div className="d-grid gap-2">
          <Button
            variant="primary"
            onClick={handleScan}
            disabled={loading}
            className="d-flex align-items-center justify-content-center"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang quét...
              </>
            ) : (
              <>
                <FaSearch className="me-2" /> Bắt đầu quét
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4">
            <h5>Kết quả ({results.length} thiết bị)</h5>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>IP</th>
                    <th>Hostname</th>
                    <th>Mô tả</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((device, idx) => (
                    <tr key={`${device.ip}-${idx}`}>
                      <td>{device.ip}</td>
                      <td>{device.hostname || 'N/A'}</td>
                      <td>{device.description}</td>
                      <td>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            if (onDeviceFound) onDeviceFound(device);
                          }}
                          title="Thêm vào danh sách thiết bị"
                        >
                          <FaPlus /> Thêm thiết bị
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NetworkScanner;