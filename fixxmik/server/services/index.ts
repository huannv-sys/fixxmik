// Export all services
import { mikrotikService } from './mikrotik';
import { wirelessService } from './wireless';
import { capsmanService } from './capsman';
// Import deviceInfoService only if the module exists
let deviceInfoService: any = {};
try {
  // Try to dynamically import
  const deviceInfo = require('./device-info');
  deviceInfoService = deviceInfo.deviceInfoService;
} catch (error) {
  console.warn('Device info service not found, using empty object');
}
import { schedulerService } from './scheduler';
import { clientManagementService } from './client-management';
import { trafficCollectorService } from './traffic-collector';
import { networkScannerService } from './network-scanner';
import { idsService } from './ids';

export {
  mikrotikService,
  wirelessService,
  capsmanService,
  deviceInfoService,
  schedulerService,
  clientManagementService,
  trafficCollectorService,
  networkScannerService,
  idsService
};