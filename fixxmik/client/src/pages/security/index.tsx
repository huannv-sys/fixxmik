import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import FirewallRulesView from '@/components/security/FirewallRulesView';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';

interface Device {
  id: number;
  name: string;
  ipAddress: string;
  model?: string;
  isOnline?: boolean;
}

const SecurityPage: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  
  // Fetch devices
  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await axios.get('/api/devices');
      return response.data || [];
    }
  });

  // Set selected device to the first device if none is selected
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDeviceId(value ? parseInt(value) : null);
  };

  if (devicesLoading) {
    return <div className="text-center py-5">Đang tải...</div>;
  }

  if (!devices || devices.length === 0) {
    return (
      <Container className="py-5">
        <Card className="text-center">
          <Card.Body>
            <Card.Title>Không tìm thấy thiết bị</Card.Title>
            <Card.Text>
              Bạn cần thêm thiết bị Mikrotik vào hệ thống để sử dụng tính năng này.
            </Card.Text>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <h1 className="h3 mb-0">Security Monitoring</h1>
              <Form.Group className="d-flex align-items-center">
                <Form.Label className="me-2 mb-0">Device:</Form.Label>
                <Form.Select 
                  value={selectedDeviceId || ''} 
                  onChange={handleDeviceChange} 
                  style={{ width: 'auto' }}
                >
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.ipAddress})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {selectedDeviceId && (
        <FirewallRulesView />
      )}
    </Container>
  );
};

export default SecurityPage;