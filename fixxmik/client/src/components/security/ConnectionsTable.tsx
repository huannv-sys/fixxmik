import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Badge, Spinner } from 'react-bootstrap';
import { useParams } from 'wouter';

interface Connection {
  id: string;
  protocol: string;
  srcAddress: string;
  dstAddress: string;
  srcPort: string;
  dstPort: string;
  tcpState?: string;
  timeout: string;
  rxBytes: string;
  txBytes: string;
  rxPackets: string;
  txPackets: string;
}

const ConnectionsTable: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const deviceId = params.deviceId || "1"; // Mặc định là thiết bị 1 nếu không có

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/devices/${deviceId}/protocols`);
        if (response.data.success) {
          setConnections(response.data.data || []);
        } else {
          setError(response.data.message || 'Không thể tải dữ liệu kết nối');
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
        console.error('Error fetching connections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
    // Tạo interval để tự động refresh dữ liệu mỗi 10 giây
    const interval = setInterval(fetchConnections, 10000);
    
    // Clear interval khi component unmount
    return () => clearInterval(interval);
  }, [deviceId]);

  // Format bytes to human readable format
  const formatBytes = (bytes: string) => {
    const num = parseInt(bytes, 10);
    if (isNaN(num) || num === 0) return '0 B';
    
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(num) / Math.log(1024));
    
    return `${(num / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format kết nối để hiển thị địa chỉ và port
  const formatAddress = (address: string, port: string) => {
    return port ? `${address}:${port}` : address;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
        <p className="mt-2">Đang tải dữ liệu kết nối...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (connections.length === 0) {
    return (
      <div className="alert alert-info">
        Không tìm thấy kết nối nào. Thiết bị có thể không có kết nối active.
      </div>
    );
  }

  return (
    <div className="connections-table-container">
      <h3 className="mb-3">Kết nối đang hoạt động</h3>
      <div className="table-responsive">
        <Table striped hover className="connections-table">
          <thead>
            <tr>
              <th>Src Address</th>
              <th>Dst Address</th>
              <th>Protocol</th>
              <th>TCP State</th>
              <th>Timeout</th>
              <th>Rx/Tx</th>
              <th>Bytes</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn) => (
              <tr key={conn.id}>
                <td>{formatAddress(conn.srcAddress, conn.srcPort)}</td>
                <td>{formatAddress(conn.dstAddress, conn.dstPort)}</td>
                <td>
                  <Badge bg={conn.protocol === 'tcp' ? 'primary' : 
                    conn.protocol === 'udp' ? 'success' : 
                    conn.protocol === 'icmp' ? 'info' : 'secondary'}>
                    {conn.protocol}
                  </Badge>
                </td>
                <td>{conn.tcpState || '-'}</td>
                <td>{conn.timeout}</td>
                <td>{conn.rxPackets}/{conn.txPackets}</td>
                <td>
                  {formatBytes(conn.rxBytes)}/{formatBytes(conn.txBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default ConnectionsTable;