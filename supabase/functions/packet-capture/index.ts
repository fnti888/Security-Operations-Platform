import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'ICMP', 'ARP', 'TLS', 'SSH', 'FTP'];
const tcpFlags = ['SYN', 'ACK', 'PSH', 'FIN', 'RST', 'URG'];

const commonPorts: { [key: number]: string } = {
  80: 'HTTP',
  443: 'HTTPS',
  22: 'SSH',
  21: 'FTP',
  53: 'DNS',
  25: 'SMTP',
  110: 'POP3',
  143: 'IMAP',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  6379: 'Redis',
  27017: 'MongoDB',
  3389: 'RDP',
  8080: 'HTTP-Alt',
};

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function generateRandomPort(): number {
  const commonPortsList = Object.keys(commonPorts).map(Number);
  return Math.random() > 0.3
    ? commonPortsList[Math.floor(Math.random() * commonPortsList.length)]
    : Math.floor(Math.random() * 65535) + 1;
}

function generateHexDump(length: number): string {
  let hex = '';
  for (let i = 0; i < length; i++) {
    hex += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  }
  return hex;
}

function generatePacketInfo(protocol: string, srcPort: number, destPort: number): string {
  const infos = {
    'TCP': [
      `${srcPort} → ${destPort} [${tcpFlags[Math.floor(Math.random() * tcpFlags.length)]}] Seq=${Math.floor(Math.random() * 10000)} Ack=${Math.floor(Math.random() * 10000)} Win=${Math.floor(Math.random() * 65535)} Len=${Math.floor(Math.random() * 1460)}`,
      `Connection established`,
      `Data transfer`,
      `Connection termination`
    ],
    'UDP': [
      `Source port: ${srcPort} Destination port: ${destPort}`,
      `Length: ${Math.floor(Math.random() * 1500)}`,
      `DNS query` + (destPort === 53 ? ' for example.com' : ''),
    ],
    'HTTP': [
      `GET / HTTP/1.1`,
      `POST /api/data HTTP/1.1`,
      `HTTP/1.1 200 OK`,
      `HTTP/1.1 404 Not Found`,
    ],
    'HTTPS': [
      `Client Hello`,
      `Server Hello`,
      `Certificate`,
      `Application Data`,
    ],
    'DNS': [
      `Standard query 0x${Math.floor(Math.random() * 0xffff).toString(16)} A example.com`,
      `Standard query response 0x${Math.floor(Math.random() * 0xffff).toString(16)}`,
    ],
    'ICMP': [
      `Echo (ping) request`,
      `Echo (ping) reply`,
      `Destination unreachable`,
    ],
    'ARP': [
      `Who has ${generateRandomIP()}? Tell ${generateRandomIP()}`,
      `${generateRandomIP()} is at aa:bb:cc:dd:ee:ff`,
    ],
    'TLS': [
      `Application Data`,
      `Change Cipher Spec`,
      `Encrypted Alert`,
    ],
    'SSH': [
      `Protocol version exchange`,
      `Key exchange init`,
      `Encrypted packet`,
    ],
    'FTP': [
      `Request: USER anonymous`,
      `Response: 230 Login successful`,
      `Request: LIST`,
    ],
  };

  const options = infos[protocol as keyof typeof infos] || ['Data packet'];
  return options[Math.floor(Math.random() * options.length)];
}

function generateTCPFlags(): string[] {
  const numFlags = Math.floor(Math.random() * 3) + 1;
  const selectedFlags = [];
  for (let i = 0; i < numFlags; i++) {
    const flag = tcpFlags[Math.floor(Math.random() * tcpFlags.length)];
    if (!selectedFlags.includes(flag)) {
      selectedFlags.push(flag);
    }
  }
  return selectedFlags;
}

async function generatePackets(supabase: any, sessionId: string, count: number) {
  const packets = [];

  for (let i = 1; i <= count; i++) {
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const srcPort = generateRandomPort();
    const destPort = generateRandomPort();
    const length = Math.floor(Math.random() * 1500) + 60;

    const packet = {
      session_id: sessionId,
      packet_number: i,
      timestamp: new Date(Date.now() + i * 100).toISOString(),
      source_ip: generateRandomIP(),
      dest_ip: generateRandomIP(),
      source_port: srcPort,
      dest_port: destPort,
      protocol: protocol,
      length: length,
      info: generatePacketInfo(protocol, srcPort, destPort),
      hex_data: generateHexDump(length),
      decoded_layers: {
        ethernet: {
          src_mac: `${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}`,
          dst_mac: `${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}`,
        },
        ip: {
          version: 4,
          ttl: Math.floor(Math.random() * 128) + 1,
        },
      },
      flags: protocol === 'TCP' ? generateTCPFlags() : [],
    };

    packets.push(packet);

    if (packets.length >= 50) {
      await supabase.from('packet_captures').insert(packets);
      await supabase
        .from('capture_sessions')
        .update({ packet_count: i })
        .eq('id', sessionId);
      packets.length = 0;
    }

    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (packets.length > 0) {
    await supabase.from('packet_captures').insert(packets);
  }

  await supabase
    .from('capture_sessions')
    .update({
      packet_count: count,
      status: 'completed',
      end_time: new Date().toISOString()
    })
    .eq('id', sessionId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { session_id, duration = 30, filter = '' } = await req.json();

    if (!session_id) {
      throw new Error('session_id is required');
    }

    const packetCount = Math.floor(Math.random() * 100) + 50;

    await generatePackets(supabase, session_id, packetCount);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Packet capture started',
        session_id,
        estimated_packets: packetCount
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in packet-capture function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});