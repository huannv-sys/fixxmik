import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from 'react-bootstrap/Button';  
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner'; 
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
  inInterface?: string;
  outInterface?: string;
  comment?: string;
  disabled?: boolean;
  invalid?: boolean;
  dynamic?: boolean;
  connectionState?: string;
  connectionNat?: string;
  rawData?: any;
}

const FirewallRulesTable: React.FC = () => {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRules, setProcessingRules] = useState<Record<string, boolean>>({});
  const params = useParams();
  const deviceId = params.deviceId || "1"; // Mặc định là thiết bị 1 nếu không có

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        console.log("Fetching firewall rules for device:", deviceId);
        const response = await axios.get(`/api/devices/${deviceId}/firewall/filter`);
        
        if (response.data.success) {
          // Kiểm tra cấu trúc của dữ liệu trả về
          console.log("Received firewall rules data:", response.data);
          
          if (response.data.data && response.data.data.filterRules) {
            // Sử dụng filterRules từ response
            setRules(response.data.data.filterRules || []);
            console.log("Filter rules parsed:", response.data.data.filterRules);
          } else {
            // Fallback nếu cấu trúc khác
            setRules(Array.isArray(response.data.data) ? response.data.data : []);
            console.log("Using fallback data structure");
          }
        } else {
          setError(response.data.message || 'Không thể tải dữ liệu firewall rules');
          console.error("API error:", response.data.message);
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

  // Xử lý bật/tắt rule
  const handleToggleRule = async (ruleId: string) => {
    try {
      // Đánh dấu rule đang được xử lý
      setProcessingRules(prev => ({ ...prev, [ruleId]: true }));
      
      // Gọi API để toggle rule
      const response = await axios.post(`/api/devices/${deviceId}/firewall/filter/${ruleId}/toggle`);
      
      if (response.data.success) {
        // Cập nhật lại state khi thành công
        setRules(prevRules => 
          prevRules.map(rule => 
            rule.id === ruleId 
              ? { ...rule, disabled: response.data.data.disabled } 
              : rule
          )
        );
        
        // Hiển thị thông báo thành công
        console.log(`Rule ${ruleId} đã được ${response.data.data.disabled ? 'tắt' : 'bật'}`);
      } else {
        // Xử lý lỗi từ API
        console.error('Lỗi khi toggle rule:', response.data.message);
      }
    } catch (err: any) {
      console.error('Lỗi khi gọi API toggle rule:', err.message);
    } finally {
      // Xóa trạng thái xử lý
      setProcessingRules(prev => {
        const newState = { ...prev };
        delete newState[ruleId];
        return newState;
      });
    }
  };
  
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
                  <Button 
                    size="sm" 
                    variant={rule.disabled ? "outline-success" : "outline-secondary"} 
                    className="me-2"
                    onClick={() => handleToggleRule(rule.id)}
                    disabled={processingRules[rule.id]}
                  >
                    {processingRules[rule.id] 
                      ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> <span className="ms-1">Đang xử lý...</span></>
                      : (rule.disabled ? "Bật" : "Tắt")
                    }
                  </Button>
                  <Button size="sm" variant="outline-primary" className="me-2">Chi tiết</Button>
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