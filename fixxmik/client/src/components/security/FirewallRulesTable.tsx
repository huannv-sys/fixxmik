import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Badge } from 'react-bootstrap';
import { useParams } from 'wouter';

interface FirewallRule {
  id: string;
  chain: string;
  action: string;
  protocol?: string;
  dstPort?: string;
  srcPort?: string;
  srcAddress?: string;
  dstAddress?: string;
  comment?: string;
  disabled?: boolean;
  invalid?: boolean;
  dynamic?: boolean;
}

const FirewallRulesTable: React.FC = () => {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const deviceId = params.deviceId || "1"; // Mặc định là thiết bị 1 nếu không có

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/devices/${deviceId}/firewall/filter`);
        if (response.data.success) {
          setRules(response.data.data || []);
        } else {
          setError(response.data.message || 'Không thể tải dữ liệu firewall rules');
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
        console.error('Error fetching firewall rules:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [deviceId]);

  // Render trạng thái của rule
  const renderState = (rule: FirewallRule) => {
    if (rule.disabled) {
      return <Badge bg="secondary">Disabled</Badge>;
    }
    if (rule.invalid) {
      return <Badge bg="danger">Invalid</Badge>;
    }
    if (rule.dynamic) {
      return <Badge bg="info">Dynamic</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  if (loading) {
    return <div className="text-center my-5">Đang tải dữ liệu firewall rules...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="firewall-rules-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Firewall Rules</h2>
        <Button variant="primary">Add Rule</Button>
      </div>

      {rules.length === 0 ? (
        <div className="alert alert-info">Không tìm thấy firewall rules nào</div>
      ) : (
        <Table responsive striped hover className="firewall-rules-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Chain</th>
              <th>Action</th>
              <th>Protocol</th>
              <th>Dst. Port</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.comment || '-'}</td>
                <td>{rule.chain}</td>
                <td>
                  <Badge bg={rule.action === 'accept' ? 'success' : 
                            rule.action === 'drop' ? 'danger' : 
                            rule.action === 'forward' ? 'primary' : 
                            rule.action === 'input' ? 'warning' : 
                            rule.action === 'output' ? 'info' : 'secondary'}>
                    {rule.action}
                  </Badge>
                </td>
                <td>{rule.protocol || '-'}</td>
                <td>{rule.dstPort || '-'}</td>
                <td>{renderState(rule)}</td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-2">Edit</Button>
                  <Button size="sm" variant="outline-danger">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default FirewallRulesTable;