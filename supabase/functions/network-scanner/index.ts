import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScanRequest {
  target: string;
  scanType: 'ping' | 'port_scan' | 'full_scan';
  ports?: number[];
}

interface PingResult {
  target: string;
  alive: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
}

interface PortResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  responseTime: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { target, scanType, ports }: ScanRequest = await req.json();

    if (!target) {
      return new Response(
        JSON.stringify({ error: 'Target is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let results;

    switch (scanType) {
      case 'ping':
        results = await performPing(target);
        break;
      case 'port_scan':
        results = await performPortScan(target, ports || getCommonPorts());
        break;
      case 'full_scan':
        const pingResult = await performPing(target);
        const portResults = await performPortScan(target, ports || getCommonPorts());
        results = { ping: pingResult, ports: portResults };
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid scan type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        target,
        scanType,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Scan failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performPing(target: string): Promise<PingResult> {
  const startTime = Date.now();

  try {
    // Normalize target - add https:// if no protocol specified
    let url = target;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${target}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DefenseTerminal-NetworkScanner/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      target,
      alive: true,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      target,
      alive: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function performPortScan(target: string, ports: number[]): Promise<PortResult[]> {
  const results: PortResult[] = [];

  // Remove protocol if present for port scanning
  const hostname = target.replace(/^https?:\/\//, '').split('/')[0];

  for (const port of ports) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Try to connect to the port using HTTP/HTTPS
      const protocol = [443, 8443].includes(port) ? 'https' : 'http';
      const url = `${protocol}://${hostname}:${port}`;

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'DefenseTerminal-NetworkScanner/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      results.push({
        port,
        status: 'open',
        service: getServiceName(port),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Distinguish between filtered (timeout) and closed (connection refused)
      const status = error instanceof Error && error.name === 'AbortError'
        ? 'filtered'
        : 'closed';

      results.push({
        port,
        status,
        service: getServiceName(port),
        responseTime,
      });
    }
  }

  return results;
}

function getCommonPorts(): number[] {
  return [
    21,    // FTP
    22,    // SSH
    23,    // Telnet
    25,    // SMTP
    53,    // DNS
    80,    // HTTP
    110,   // POP3
    143,   // IMAP
    443,   // HTTPS
    445,   // SMB
    3306,  // MySQL
    3389,  // RDP
    5432,  // PostgreSQL
    5900,  // VNC
    8080,  // HTTP Alt
    8443,  // HTTPS Alt
  ];
}

function getServiceName(port: number): string {
  const services: Record<number, string> = {
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    445: 'SMB',
    3306: 'MySQL',
    3389: 'RDP',
    5432: 'PostgreSQL',
    5900: 'VNC',
    8080: 'HTTP-Alt',
    8443: 'HTTPS-Alt',
  };

  return services[port] || 'Unknown';
}
