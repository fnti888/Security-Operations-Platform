# API Reference Guide

Complete API documentation for Defense Terminal Security Operations Platform.

## Base URL

```
https://[your-project-id].supabase.co/functions/v1
```

## Authentication

All API endpoints require authentication using Supabase JWT tokens or the anon key.

### Headers

```http
Authorization: Bearer YOUR_SUPABASE_TOKEN
Content-Type: application/json
```

## Security Operations APIs

### Simulate Attacks

Generate simulated threat data for testing and training purposes.

**Endpoint:** `POST /simulate-attacks`

**Request Body:**
```json
{
  "attack_type": "brute_force|phishing|ddos|malware|intrusion",
  "count": 10,
  "target_country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "attacks_generated": 10,
  "attack_ids": ["uuid1", "uuid2", "..."]
}
```

### Threat Intelligence

Ingest and process threat intelligence feeds from external sources.

**Endpoint:** `POST /threat-intelligence`

**Request Body:**
```json
{
  "source": "virustotal|alienvault|abuseipdb",
  "indicators": ["192.168.1.100", "malicious.com"],
  "indicator_type": "ip|domain|hash|url"
}
```

**Response:**
```json
{
  "success": true,
  "indicators_processed": 2,
  "threats_identified": 1,
  "details": [...]
}
```

### Correlation Engine

Correlate security events across multiple sources to identify attack patterns.

**Endpoint:** `POST /correlation-engine`

**Request Body:**
```json
{
  "time_window": "1h|24h|7d",
  "event_sources": ["firewall", "ids", "endpoint"],
  "correlation_rules": ["brute_force", "lateral_movement"]
}
```

**Response:**
```json
{
  "success": true,
  "correlations_found": 5,
  "incidents_created": 2,
  "patterns": [...]
}
```

### Anomaly Detector

Detect behavioral anomalies and deviations from baseline security patterns.

**Endpoint:** `POST /anomaly-detector`

**Request Body:**
```json
{
  "data_source": "network|user_behavior|system_logs",
  "baseline_period": "7d",
  "sensitivity": "low|medium|high"
}
```

**Response:**
```json
{
  "success": true,
  "anomalies_detected": 3,
  "severity_breakdown": {
    "high": 1,
    "medium": 2,
    "low": 0
  },
  "anomalies": [...]
}
```

### Alert Processor

Process and enrich security alerts with additional context and intelligence.

**Endpoint:** `POST /alert-processor`

**Request Body:**
```json
{
  "alert_id": "uuid",
  "enrichment_sources": ["threat_intel", "asset_db", "user_context"],
  "auto_respond": true
}
```

**Response:**
```json
{
  "success": true,
  "alert_enriched": true,
  "risk_score": 85,
  "recommended_actions": [...],
  "automated_response": "quarantine_initiated"
}
```

## Assessment & Scanning APIs

### Network Scanner

Perform comprehensive network port scans and service discovery.

**Endpoint:** `POST /network-scanner`

**Request Body:**
```json
{
  "target": "192.168.1.0/24",
  "scan_type": "tcp|udp|syn|full",
  "ports": "1-1000|all|common",
  "options": {
    "service_detection": true,
    "os_detection": false,
    "timing": "normal|aggressive|stealth"
  }
}
```

**Response:**
```json
{
  "success": true,
  "scan_id": "uuid",
  "hosts_discovered": 15,
  "ports_found": 47,
  "services": [
    {
      "host": "192.168.1.10",
      "port": 80,
      "service": "http",
      "version": "nginx 1.18.0",
      "state": "open"
    }
  ]
}
```

### Vulnerability Scanner

Execute vulnerability assessments with CVE database integration.

**Endpoint:** `POST /vulnerability-scanner`

**Request Body:**
```json
{
  "target": "192.168.1.10",
  "scan_depth": "quick|standard|deep",
  "categories": ["web", "network", "os", "database"],
  "authenticated": false
}
```

**Response:**
```json
{
  "success": true,
  "scan_id": "uuid",
  "vulnerabilities_found": 12,
  "severity_counts": {
    "critical": 2,
    "high": 3,
    "medium": 5,
    "low": 2
  },
  "vulnerabilities": [
    {
      "cve_id": "CVE-2024-1234",
      "severity": "critical",
      "cvss_score": 9.8,
      "description": "Remote code execution vulnerability",
      "affected_component": "Apache 2.4.41",
      "remediation": "Upgrade to Apache 2.4.52 or later"
    }
  ]
}
```

### SSL/TLS Analyzer

Analyze SSL/TLS certificates and cryptographic configurations.

**Endpoint:** `POST /ssl-tls-analyzer`

**Request Body:**
```json
{
  "target": "example.com:443",
  "checks": ["certificate", "protocols", "ciphers", "vulnerabilities"]
}
```

**Response:**
```json
{
  "success": true,
  "analysis_id": "uuid",
  "grade": "A+",
  "certificate": {
    "subject": "example.com",
    "issuer": "Let's Encrypt",
    "valid_from": "2024-01-01",
    "valid_until": "2024-04-01",
    "days_until_expiry": 45,
    "signature_algorithm": "SHA256withRSA"
  },
  "protocols": {
    "tls_1_3": true,
    "tls_1_2": true,
    "tls_1_1": false,
    "ssl_3_0": false
  },
  "vulnerabilities": [],
  "recommendations": [...]
}
```

### Packet Capture

Capture and analyze network packets for forensic investigation.

**Endpoint:** `POST /packet-capture`

**Request Body:**
```json
{
  "interface": "eth0|any",
  "filter": "tcp port 80 or udp port 53",
  "duration": 60,
  "packet_limit": 10000
}
```

**Response:**
```json
{
  "success": true,
  "capture_id": "uuid",
  "packets_captured": 8547,
  "protocols": {
    "tcp": 6234,
    "udp": 1987,
    "icmp": 326
  },
  "download_url": "/evidence/captures/uuid.pcap"
}
```

## Threat Intelligence & Investigation APIs

### WHOIS Lookup

Query WHOIS data for domains and IP addresses.

**Endpoint:** `POST /whois-lookup`

**Request Body:**
```json
{
  "query": "example.com",
  "type": "domain|ip"
}
```

**Response:**
```json
{
  "success": true,
  "query": "example.com",
  "registrar": "Example Registrar Inc",
  "creation_date": "2020-01-15",
  "expiration_date": "2025-01-15",
  "name_servers": ["ns1.example.com", "ns2.example.com"],
  "registrant_country": "US",
  "status": ["clientTransferProhibited"],
  "whois_server": "whois.example.com"
}
```

### IP Score Lookup

Get comprehensive IP reputation scores from multiple threat intelligence sources.

**Endpoint:** `POST /ip-score-lookup`

**Request Body:**
```json
{
  "ip": "8.8.8.8",
  "include_history": true,
  "sources": ["abuseipdb", "virustotal", "greynoise"]
}
```

**Response:**
```json
{
  "success": true,
  "ip": "8.8.8.8",
  "reputation_score": 100,
  "threat_level": "clean|suspicious|malicious",
  "classifications": [],
  "geolocation": {
    "country": "US",
    "city": "Mountain View",
    "organization": "Google LLC",
    "asn": "AS15169"
  },
  "threat_feeds": {
    "abuseipdb": {
      "abuse_confidence": 0,
      "reports": 0
    },
    "virustotal": {
      "malicious": 0,
      "suspicious": 0,
      "clean": 89
    }
  },
  "recent_activity": [...]
}
```

### Threat Enrichment

Enrich threat indicators with additional intelligence and context.

**Endpoint:** `POST /threat-enrichment`

**Request Body:**
```json
{
  "indicators": [
    {
      "type": "ip|domain|hash|url",
      "value": "192.168.1.100"
    }
  ],
  "enrichment_level": "basic|full"
}
```

**Response:**
```json
{
  "success": true,
  "enriched_indicators": [
    {
      "value": "192.168.1.100",
      "type": "ip",
      "threat_score": 75,
      "first_seen": "2024-01-15",
      "last_seen": "2024-02-15",
      "associated_campaigns": ["APT29", "Cobalt Strike"],
      "malware_families": ["TrickBot"],
      "mitre_tactics": ["TA0001", "TA0002"],
      "relationships": [...]
    }
  ]
}
```

### Threat Hunter

Execute threat hunting queries and hypothesis-driven investigations.

**Endpoint:** `POST /threat-hunter`

**Request Body:**
```json
{
  "hypothesis": "Detect lateral movement via RDP",
  "data_sources": ["network_logs", "endpoint_logs"],
  "time_range": "7d",
  "query": "protocol:rdp AND auth:failed AND source_count > 5"
}
```

**Response:**
```json
{
  "success": true,
  "hunt_id": "uuid",
  "matches_found": 12,
  "indicators_discovered": 5,
  "findings": [
    {
      "timestamp": "2024-02-15T10:30:00Z",
      "source_ip": "10.0.1.50",
      "target_ip": "10.0.2.100",
      "activity": "Multiple failed RDP attempts",
      "confidence": "high",
      "mitre_technique": "T1021.001"
    }
  ],
  "recommendations": [...]
}
```

## Automation & Integration APIs

### Workflow Executor

Execute automated security workflows and playbooks.

**Endpoint:** `POST /workflow-executor`

**Request Body:**
```json
{
  "workflow_id": "uuid",
  "trigger_type": "manual|scheduled|event",
  "parameters": {
    "incident_id": "uuid",
    "severity": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "execution_id": "uuid",
  "workflow_name": "Phishing Response Playbook",
  "steps_completed": 8,
  "steps_total": 10,
  "status": "running|completed|failed",
  "results": [...]
}
```

### Integration Sync

Sync security data with external tools and platforms.

**Endpoint:** `POST /integration-sync`

**Request Body:**
```json
{
  "integration": "splunk|sentinel|qradar|elastic",
  "sync_type": "incidents|alerts|threats|all",
  "direction": "import|export|bidirectional",
  "time_range": "1h"
}
```

**Response:**
```json
{
  "success": true,
  "sync_id": "uuid",
  "records_synced": 156,
  "errors": 0,
  "last_sync": "2024-02-15T14:30:00Z"
}
```

### Audit Logger

Log security audit events for compliance and investigation.

**Endpoint:** `POST /audit-logger`

**Request Body:**
```json
{
  "event_type": "login|logout|config_change|data_access",
  "user_id": "uuid",
  "resource": "incidents.view",
  "action": "read|write|delete",
  "metadata": {
    "ip_address": "192.168.1.50",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "audit_id": "uuid",
  "logged_at": "2024-02-15T14:35:00Z"
}
```

### Compliance Reporter

Generate compliance reports for various frameworks.

**Endpoint:** `POST /compliance-reporter`

**Request Body:**
```json
{
  "framework": "nist|iso27001|pci-dss|hipaa|gdpr",
  "report_type": "summary|detailed|executive",
  "time_period": "month|quarter|year",
  "include_evidence": true
}
```

**Response:**
```json
{
  "success": true,
  "report_id": "uuid",
  "framework": "NIST CSF",
  "compliance_score": 87,
  "controls_total": 108,
  "controls_compliant": 94,
  "controls_partial": 10,
  "controls_non_compliant": 4,
  "report_url": "/reports/uuid.pdf",
  "generated_at": "2024-02-15T14:40:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT|UNAUTHORIZED|RATE_LIMIT|INTERNAL_ERROR",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

## Rate Limits

- **Free Tier**: 100 requests per hour per endpoint
- **Pro Tier**: 1,000 requests per hour per endpoint
- **Enterprise**: Custom limits available

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708012800
```

## Webhooks

Configure webhooks to receive real-time notifications for security events:

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["incident.created", "alert.triggered", "scan.completed"],
  "secret": "your-webhook-secret"
}
```

## SDK Support

Official SDKs available:
- JavaScript/TypeScript: `@defense-terminal/sdk`
- Python: `defense-terminal-sdk`
- Go: `github.com/defense-terminal/go-sdk`

## Support

For API support and questions:
- GitHub Issues: [github.com/fnti888/Security-Operations-Platform/issues](https://github.com/fnti888/Security-Operations-Platform/issues)
- Documentation: [Full documentation](https://github.com/fnti888/Security-Operations-Platform)
