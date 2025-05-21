
import * as path from 'path';
import * as os from 'os';
import checkDiskSpace from 'check-disk-space';



export async function checkSystemInfo(): Promise<{
  success: boolean;
  output: Record<string, string | number>;
  missing: string[];
}> {
  const missing: string[] = [];
  const output: Record<string, string | number> = {};

  // Check disk space usage on the root directory (can change if needed)
  try {
    const root = path.parse(path.resolve('/')).root;
    const { free, total } = await checkDiskSpace(root);

    // Formatting disk space values
    output['disk_free_space'] = formatBytes(free);
    output['disk_total_space'] = formatBytes(total);
    output['disk_available_space'] = formatBytes(free);
  } catch (err: unknown) {
    console.error('❌ Disk space check failed:', err);
    missing.push('diskusage');
  }

  // Get OS and memory info
  try {
    output['os_platform'] = os.platform();
    output['os_architecture'] = os.arch();
    output['memory_total'] = formatBytes(os.totalmem());
    output['memory_free'] = formatBytes(os.freemem());
  } catch (err: unknown) {
    console.error('❌ OS memory check failed:', err);
    missing.push('os-info');
  }

  // Check network interfaces (get external IP)
  try {
    const networkInterfaces = os.networkInterfaces();
    const externalIP = Object.values(networkInterfaces)
      .flat()
      .filter((iface): iface is os.NetworkInterfaceInfo => iface !== undefined && iface.family === 'IPv4' && !iface.internal)
      .map((iface) => iface.address)[0];

    output['external_ip'] = externalIP || 'Not available';
  } catch (err: unknown) {
    console.error('❌ Network check failed:', err);
    missing.push('network');
  }

  const success = missing.length === 0;

  return {
    success,
    missing,
    output,
  };
}

// Formatting bytes to human-readable format
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}
