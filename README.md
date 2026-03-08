# Defense Terminal - Security Operations Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178c6.svg)
![Supabase](https://img.shields.io/badge/Supabase-Powered-3ecf8e.svg)

A comprehensive Security Operations Center (SOC) platform for incident management, threat intelligence, forensic analysis, and security monitoring.

## Live Demo

**[View Live Application](https://your-deployment-url.netlify.app)**

## Screenshots

### Dashboard Overview
![Dashboard](docs/screenshots/dashboard.png)
*Real-time security operations dashboard with threat intelligence feeds and incident tracking*

### Incident Management
![Incidents](docs/screenshots/incidents.png)
*MITRE ATT&CK-mapped incident tracking and investigation workflows*

### Threat Intelligence
![Threats](docs/screenshots/threats.png)
*Geographic threat visualization and attack pattern analysis*

### Forensic Tools
![Forensics](docs/screenshots/forensics.png)
*Digital forensics suite with network monitoring and evidence management*

## Quick Start

Get up and running in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/fnti888/Security-Operations-Platform.git
cd Security-Operations-Platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials (see Setup section below)

# Start development server
npm run dev
```

Visit `http://localhost:5173` and create your first account to explore the platform.

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Technical Architecture](#technical-architecture)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [Features by Category](#features-by-category)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)
- [Changelog](#changelog)

## Overview

Defense Terminal is a full-featured SOC platform built with modern web technologies, demonstrating enterprise-level security operations capabilities including real-time threat monitoring, incident response workflows, digital forensics tools, and security automation.

### Why Defense Terminal?

| Feature | Defense Terminal | Traditional SOC Platforms |
|---------|-----------------|---------------------------|
| **Deployment** | Serverless, instant setup | Complex infrastructure required |
| **Cost** | Free tier available, pay-as-you-grow | High licensing costs |
| **Real-time** | Built-in WebSocket subscriptions | Often requires additional tools |
| **Customization** | Open source, fully customizable | Vendor lock-in, limited flexibility |
| **Learning Curve** | Modern web stack (React/TypeScript) | Proprietary languages/frameworks |
| **Integration** | RESTful APIs, 18 edge functions | Limited API access |
| **Security** | 345+ RLS policies, end-to-end encryption | Varies by vendor |
| **Updates** | Community-driven, rapid iteration | Slow vendor release cycles |

## Core Features

### Security Operations
- **Incident Management** - Track, investigate, and manage security incidents with MITRE ATT&CK framework integration
- **Threat Intelligence** - Real-time threat feeds with geographic visualization and attack pattern analysis
- **Security Analytics** - Metrics, trends, and KPI tracking for security operations
- **Live Monitoring** - Real-time security event visualization and alerting

### Forensics & Investigation
- **Network Monitor** - Packet capture and protocol analysis
- **System Monitor** - Process, file system, and registry monitoring
- **Timeline Analysis** - Event correlation and reconstruction
- **Memory Forensics** - RAM analysis and artifact extraction
- **Evidence Locker** - Chain of custody and evidence management with cryptographic verification

### Security Tools Suite
- **Network Scanner** - Port scanning, service discovery, and network mapping
- **Vulnerability Scanner** - Security assessment with CVE tracking and severity scoring
- **SSL/TLS Analyzer** - Certificate validation and cryptographic configuration analysis
- **Packet Analyzer** - Deep packet inspection and protocol analysis
- **WHOIS Lookup** - Domain and IP investigation with threat intelligence enrichment
- **IP Reputation Score** - Multi-source threat intelligence aggregation and scoring

### Professional Development
- **Security Portfolio** - Document security analysis work, investigations, and research
- **Incident Response Playbooks** - Structured procedures for common security scenarios
- **Skills Lab** - Track tool proficiency, certifications, and training progress

### Enterprise Features
- **Automation Center** - Workflow automation and orchestration
- **Threat Hunting** - Proactive threat detection and hypothesis-driven investigations
- **Smart Alerts** - AI-enhanced alert correlation and noise reduction
- **Anomaly Detection** - Behavioral analysis and deviation detection
- **Security Posture Dashboard** - Centralized view of organizational security metrics

## Technical Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time, Edge Functions)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase Real-time subscriptions
- **Authentication**: Supabase Auth with email/password
- **Build Tool**: Vite
- **Icons**: Lucide React

### Security Features
- 345+ Row Level Security (RLS) policies across 47 database migrations
- Function security with proper search path isolation
- Role-based access control (Admin/Analyst/Viewer)
- Automatic profile creation on user signup
- Real-time data synchronization with authentication checks
- Comprehensive audit logging

### Architecture Highlights
- Component-based architecture with separation of concerns
- Real-time data streaming for live threat monitoring
- Serverless edge functions for security operations
- Type-safe development with TypeScript
- Responsive design for desktop and mobile

For detailed architecture documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/fnti888/Security-Operations-Platform.git
   cd Security-Operations-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and add your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your Supabase project details:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get your Supabase credentials:
   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Find credentials in: Settings → API

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/
│   ├── Dashboard/              # Main SOC dashboard
│   ├── Incidents/              # Incident management
│   ├── Threats/                # Threat intelligence
│   ├── Analytics/              # Security analytics
│   ├── Forensics/              # Forensic tools suite
│   ├── NetworkScanner/         # Network scanning
│   ├── VulnerabilityScanner/   # Vulnerability assessment
│   ├── SSLAnalyzer/            # SSL/TLS analysis
│   ├── PacketAnalyzer/         # Packet analysis
│   ├── WhoisLookup/            # WHOIS investigation
│   ├── IPScore/                # IP reputation
│   ├── Portfolio/              # Security portfolio
│   ├── Playbooks/              # IR playbooks
│   ├── Skills/                 # Skills tracking
│   ├── Automation/             # Workflow automation
│   ├── ThreatHunting/          # Threat hunting
│   ├── Alerts/                 # Smart alerts
│   └── SecurityPosture/        # Security dashboard
├── contexts/
│   ├── AuthContext.tsx         # Authentication state
│   └── ThemeContext.tsx        # Theme management
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── mitreMappings.ts        # MITRE ATT&CK data
│   ├── activityTracking.ts     # User activity tracking
│   ├── realtime.ts             # Real-time subscriptions
│   └── exportUtils.ts          # Data export utilities
└── main.tsx                    # Application entry point

supabase/
├── migrations/                 # Database schema migrations (47 files)
└── functions/                  # Edge functions (18 functions)
    ├── simulate-attacks/       # Attack simulation
    ├── threat-intelligence/    # Threat feed ingestion
    ├── network-scanner/        # Network scanning
    ├── vulnerability-scanner/  # Vulnerability scanning
    ├── ssl-tls-analyzer/       # SSL/TLS analysis
    ├── whois-lookup/           # WHOIS queries
    ├── ip-score-lookup/        # IP reputation
    ├── packet-capture/         # Packet analysis
    ├── correlation-engine/     # Event correlation
    ├── anomaly-detector/       # Anomaly detection
    ├── threat-enrichment/      # Threat enrichment
    ├── threat-hunter/          # Threat hunting
    ├── alert-processor/        # Alert processing
    ├── workflow-executor/      # Workflow automation
    ├── audit-logger/           # Audit logging
    ├── compliance-reporter/    # Compliance reporting
    ├── integration-sync/       # External integrations
    └── scheduled-scanner/      # Scheduled scanning
```

## Database Schema

The platform uses PostgreSQL with comprehensive schema for:
- User profiles and authentication
- Incident management and tracking
- Threat intelligence data
- Forensic evidence and artifacts
- Network scan results
- Vulnerability assessments
- SSL/TLS analysis results
- Security portfolio entries
- IR playbooks and procedures
- Skills and certification tracking
- Automation workflows
- Alert correlation data
- Audit logs

See `/supabase/migrations/` for complete schema definitions.

### Migration Overview

| Migration Category | Count | Purpose |
|-------------------|-------|---------|
| Core Schema | 5 | User profiles, incidents, threats |
| Forensics | 5 | Evidence, timeline, monitoring |
| Scanning Tools | 10 | Network, vulnerability, SSL/TLS analysis |
| Advanced Features | 15 | Portfolio, automation, alerts |
| Security Hardening | 12 | RLS policies, admin roles, access controls |
| **Total** | **47** | **Complete SOC platform** |

## Security Considerations

### Database Security
- All tables protected with Row Level Security (RLS)
- 345+ security policies enforcing access control
- Function security with isolated search paths
- Service role restrictions on system tables

### Application Security
- Authentication required for all sensitive operations
- Role-based access control
- Secure session management
- XSS and injection protection
- CORS properly configured on edge functions

### Data Protection
- Encrypted connections to database
- Chain of custody for forensic evidence
- Cryptographic verification of evidence integrity
- Audit logging of all security-relevant actions

For detailed security information, see [SECURITY.md](SECURITY.md).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Netlify and Vercel.

Quick deploy to Netlify:
```bash
npm run build
# Deploy the /dist directory
```

## Features by Category

### Incident Response
- Incident creation and tracking
- MITRE ATT&CK technique mapping
- Severity classification and prioritization
- Status workflow (New → Investigating → Contained → Resolved)
- Evidence linking and correlation
- Timeline reconstruction
- Incident response playbooks

### Threat Intelligence
- Real-time threat feed visualization
- Geographic attack mapping
- IP reputation scoring
- Domain and URL analysis
- Threat actor tracking
- IOC (Indicator of Compromise) management
- Country-level threat statistics

### Digital Forensics
- Network packet capture and analysis
- Process monitoring and analysis
- File system timeline reconstruction
- Memory dump analysis
- Registry analysis
- Browser artifact extraction
- Email header analysis
- Evidence preservation with chain of custody

### Security Assessment
- Network port scanning
- Service version detection
- Vulnerability identification
- CVE database integration
- SSL/TLS configuration analysis
- Certificate expiration monitoring
- Security posture scoring

### Automation & Orchestration
- Playbook automation
- Workflow creation and execution
- Alert correlation and enrichment
- Automated threat response
- Integration with external tools
- Scheduled security tasks

## API Documentation

The platform includes 18 serverless edge functions providing comprehensive security operations APIs.

### Available Endpoints

#### Security Operations
- **`POST /simulate-attacks`** - Generate simulated threat data for testing and training
- **`POST /threat-intelligence`** - Ingest and process threat intelligence feeds
- **`POST /correlation-engine`** - Correlate security events across multiple sources
- **`POST /anomaly-detector`** - Detect behavioral anomalies and deviations
- **`POST /alert-processor`** - Process and enrich security alerts

#### Assessment & Scanning
- **`POST /network-scanner`** - Perform network port scans and service discovery
- **`POST /vulnerability-scanner`** - Execute vulnerability assessments with CVE mapping
- **`POST /ssl-tls-analyzer`** - Analyze SSL/TLS certificates and configurations
- **`POST /packet-capture`** - Capture and analyze network packets
- **`POST /scheduled-scanner`** - Run scheduled security scans

#### Threat Intelligence & Investigation
- **`POST /whois-lookup`** - Query WHOIS data for domains and IPs
- **`POST /ip-score-lookup`** - Get IP reputation scores from multiple sources
- **`POST /threat-enrichment`** - Enrich threat indicators with external intelligence
- **`POST /threat-hunter`** - Execute threat hunting queries and investigations

#### Automation & Integration
- **`POST /workflow-executor`** - Execute automated security workflows
- **`POST /integration-sync`** - Sync data with external security tools
- **`POST /audit-logger`** - Log security audit events
- **`POST /compliance-reporter`** - Generate compliance reports

### Example API Call

```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/ip-score-lookup`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ip: '8.8.8.8' })
  }
);

const result = await response.json();
console.log(result.reputation_score);
```

### Authentication

All edge functions require Supabase authentication. Include the Authorization header with your anon key or user JWT token.

### Rate Limiting

Edge functions are subject to Supabase's rate limits. Enterprise plans offer higher limits for production workloads.

For detailed API documentation and schemas, see the [API Reference Guide](docs/API.md).

## Contributing

Contributions are welcome! This project follows standard open-source contribution guidelines.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Follow security best practices

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

### Completed ✅
- [x] Core incident management system
- [x] Real-time threat intelligence feeds
- [x] Digital forensics toolkit
- [x] Network and vulnerability scanning
- [x] Automation and workflow engine
- [x] Security portfolio management
- [x] Row Level Security (345+ policies)
- [x] 18 serverless edge functions
- [x] MITRE ATT&CK framework integration

### In Progress 🚧
- [ ] Machine learning-based anomaly detection
- [ ] Advanced threat hunting queries
- [ ] Mobile application (iOS/Android)
- [ ] Enhanced reporting and dashboards

### Planned 📋
- [ ] GraphQL API layer
- [ ] Multi-tenancy support for MSPs
- [ ] Integration marketplace (Splunk, Sentinel, QRadar)
- [ ] SOAR playbook library expansion
- [ ] Threat intelligence sharing (STIX/TAXII)
- [ ] Kubernetes deployment option
- [ ] Advanced AI/ML threat detection

### Community Requests 💡
Have a feature request? [Open an issue](https://github.com/fnti888/Security-Operations-Platform/issues) or start a [discussion](https://github.com/fnti888/Security-Operations-Platform/discussions)!

## License

MIT License - See [LICENSE](./LICENSE) for details

## FAQ

### General Questions

**Q: Is this free to use?**
A: Yes, Defense Terminal is open source (MIT License). The Supabase backend has a generous free tier, and you only pay if you scale beyond those limits.

**Q: Can I use this in production?**
A: Yes, with proper hardening and compliance controls. The platform includes enterprise-grade security features, but review the security considerations and conduct your own security audit before production deployment.

**Q: Does this require coding knowledge?**
A: Basic setup requires minimal coding (copy/paste environment variables). Customization requires React/TypeScript knowledge.

**Q: How long does setup take?**
A: Initial setup takes 5-10 minutes. Full customization depends on your requirements.

### Technical Questions

**Q: Can I self-host this?**
A: The frontend can be self-hosted anywhere. The backend uses Supabase, which offers self-hosting options for enterprise customers.

**Q: What's the maximum data volume supported?**
A: Supabase handles millions of rows efficiently. For very large deployments (10M+ events/day), consider the enterprise tier or data archival strategies.

**Q: Can I integrate with my existing SIEM?**
A: Yes, use the API endpoints and edge functions to integrate with Splunk, Sentinel, QRadar, Elastic, or custom tools.

**Q: Is there a demo with sample data?**
A: Yes, the live demo includes simulated security data. You can also run the `simulate-attacks` function to generate test data.

### Security Questions

**Q: How secure is the data?**
A: Data is encrypted in transit (TLS) and at rest. 345+ RLS policies enforce access control. All authentication uses industry-standard JWT tokens.

**Q: Who can access my data?**
A: Only authenticated users with proper permissions. RLS policies ensure users only see data they're authorized to access.

**Q: Is audit logging included?**
A: Yes, comprehensive audit logging tracks all security-relevant actions for compliance and investigation.

**Q: Does it support compliance frameworks?**
A: The compliance-reporter function generates reports for NIST, ISO27001, PCI-DSS, HIPAA, and GDPR frameworks.

## Technical Contact

Built by Frank NTI

**GitHub**: https://www.linkedin.com/in/frank-nti-/

## Acknowledgments

- MITRE ATT&CK Framework for threat intelligence taxonomy
- Supabase for backend infrastructure
- React and TypeScript communities
- Security research community

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and releases.

## Support the Project

If you find Defense Terminal useful:
- ⭐ Star this repository
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 🔀 Submit pull requests
- 📢 Share with the security community

---

**Note**: This platform is designed for educational and demonstration purposes. For production SOC environments, additional hardening, compliance controls, and enterprise integrations should be implemented.
