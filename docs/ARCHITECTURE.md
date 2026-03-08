# Architecture Documentation

Complete technical architecture guide for Defense Terminal Security Operations Platform.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Technology Stack](#technology-stack)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [Security Architecture](#security-architecture)
- [Real-time Architecture](#real-time-architecture)
- [API Architecture](#api-architecture)
- [Data Flow](#data-flow)
- [Scalability](#scalability)

## System Overview

Defense Terminal is a modern, cloud-native Security Operations Center (SOC) platform built with a serverless architecture. The system is designed for high availability, real-time data processing, and enterprise-scale security operations.

### Key Architectural Principles

1. **Serverless-First**: Leverage Supabase edge functions for scalable, cost-effective compute
2. **Real-time by Default**: All security data streams in real-time using WebSocket subscriptions
3. **Security in Depth**: Multiple layers of security including RLS, authentication, and encryption
4. **Component-Based**: Modular frontend architecture for maintainability and reusability
5. **API-First**: All functionality exposed through well-defined APIs
6. **Type-Safe**: End-to-end type safety with TypeScript

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Browser)                       │
├─────────────────────────────────────────────────────────────────────┤
│  React 18 Application (TypeScript)                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Dashboard  │  │ Incidents  │  │  Threats   │  │ Forensics  │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Scanners  │  │ Analytics  │  │ Automation │  │  Portfolio │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │           Context Providers (Auth, Theme, State)             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS / WebSocket
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase Platform Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                    │
│  │  Authentication    │  │   Authorization    │                    │
│  │  - Email/Password  │  │   - JWT Tokens     │                    │
│  │  - Session Mgmt    │  │   - RBAC           │                    │
│  └────────────────────┘  └────────────────────┘                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Edge Functions (Deno Runtime)                   │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Security Ops   │ Scanning      │ Intel        │ Automation   │  │
│  │ - Simulate     │ - Network     │ - ThreatIntel│ - Workflows  │  │
│  │ - Correlate    │ - Vuln        │ - Enrichment │ - Alerts     │  │
│  │ - Anomaly      │ - SSL/TLS     │ - Hunter     │ - Integration│  │
│  │ - Audit        │ - Packet      │ - IP Score   │ - Compliance │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Real-time Engine                             │  │
│  │  - WebSocket Subscriptions                                   │  │
│  │  - Event Broadcasting                                        │  │
│  │  - Presence Tracking                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database (14+)                       │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  Core Tables:                                                │  │
│  │  - user_profiles        - incidents         - threats        │  │
│  │  - forensic_evidence    - scan_results      - vulnerabilities│  │
│  │  - alerts               - workflows         - audit_logs     │  │
│  │                                                              │  │
│  │  Security:                                                   │  │
│  │  - 345+ Row Level Security Policies                         │  │
│  │  - Function Security (search_path isolation)                │  │
│  │  - Encrypted at Rest                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Storage Layer                                │  │
│  │  - Evidence Files (chain of custody)                        │  │
│  │  - Packet Captures (PCAP files)                             │  │
│  │  - Reports & Exports                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    External Integrations                             │
├─────────────────────────────────────────────────────────────────────┤
│  - Threat Intelligence Feeds (VirusTotal, AbuseIPDB, etc.)         │
│  - SIEM Integrations (Splunk, Sentinel, QRadar, Elastic)           │
│  - Ticketing Systems (Jira, ServiceNow)                            │
│  - Communication (Slack, Teams, Email)                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.5.3 | Type safety |
| Vite | 5.4.2 | Build tool & dev server |
| Tailwind CSS | 3.4.1 | Styling framework |
| Lucide React | 0.344.0 | Icon library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | Backend platform |
| PostgreSQL | 14+ | Primary database |
| PostgREST | Latest | Auto-generated REST API |
| Deno | Latest | Edge function runtime |
| WebSockets | Latest | Real-time subscriptions |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| PostCSS | CSS processing |
| Autoprefixer | CSS vendor prefixes |
| TypeScript Compiler | Type checking |

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── AuthContext Provider
│   └── ThemeContext Provider
│       ├── LandingPage (unauthenticated)
│       └── Authenticated App
│           ├── Sidebar Navigation
│           ├── Global Search
│           ├── Keyboard Shortcuts
│           └── Route Components
│               ├── Dashboard
│               ├── Incidents
│               ├── Threats
│               ├── Analytics
│               ├── Forensics Suite
│               │   ├── NetworkMonitor
│               │   ├── SystemMonitor
│               │   ├── MemoryForensics
│               │   ├── ForensicTimeline
│               │   └── EvidenceLocker
│               ├── Security Tools
│               │   ├── NetworkScanner
│               │   ├── VulnerabilityScanner
│               │   ├── SSLAnalyzer
│               │   ├── PacketAnalyzer
│               │   ├── WhoisLookup
│               │   └── IPScore
│               ├── Automation
│               │   ├── AutomationCenter
│               │   ├── ThreatHunting
│               │   └── SmartAlerts
│               ├── Professional
│               │   ├── SecurityPortfolio
│               │   ├── IncidentPlaybooks
│               │   └── SkillsLab
│               └── Settings
│                   ├── SettingsPanel
│                   └── APIKeyManagement
└── ErrorBoundary
```

### State Management

**Context-Based State:**
- `AuthContext`: User authentication state, session management
- `ThemeContext`: Dark/light mode, color preferences

**Local Component State:**
- React hooks (useState, useEffect, useReducer)
- Form state management
- UI interaction state

**Server State:**
- Supabase real-time subscriptions
- Query-based data fetching
- Optimistic updates

### Data Flow Pattern

```
User Action
    ↓
Component Event Handler
    ↓
API Call / Database Query
    ↓
Supabase Client
    ↓
Edge Function / Direct DB Access
    ↓
PostgreSQL Database
    ↓
Real-time Subscription Update
    ↓
Component Re-render
    ↓
Updated UI
```

## Backend Architecture

### Edge Functions Architecture

Edge functions run on Deno runtime at the edge, close to users for low latency.

**Function Categories:**

1. **Security Operations** (5 functions)
   - `simulate-attacks`: Generate test data
   - `correlation-engine`: Event correlation
   - `anomaly-detector`: Behavioral analysis
   - `alert-processor`: Alert enrichment
   - `audit-logger`: Compliance logging

2. **Scanning & Assessment** (5 functions)
   - `network-scanner`: Port scanning
   - `vulnerability-scanner`: Vuln assessment
   - `ssl-tls-analyzer`: Certificate analysis
   - `packet-capture`: Network forensics
   - `scheduled-scanner`: Automated scans

3. **Threat Intelligence** (4 functions)
   - `threat-intelligence`: Feed ingestion
   - `threat-enrichment`: IOC enrichment
   - `threat-hunter`: Proactive hunting
   - `ip-score-lookup`: IP reputation

4. **Automation & Integration** (4 functions)
   - `workflow-executor`: Playbook automation
   - `integration-sync`: External tool sync
   - `compliance-reporter`: Compliance reports
   - `whois-lookup`: Domain investigation

### Function Design Pattern

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { param1, param2 } = await req.json()

    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Business logic
    const result = await performOperation(param1, param2, supabaseClient)

    // Return response
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Database Design

### Schema Organization

**47 Migration Files** organized chronologically:

1. **Core Schema** (Migrations 1-5)
   - User profiles and authentication
   - Incidents and security events
   - Threat intelligence data
   - Basic RLS policies

2. **Forensics Module** (Migrations 6-10)
   - Evidence locker
   - Timeline analysis
   - Network monitoring
   - System artifacts

3. **Scanning Tools** (Migrations 11-15)
   - Network scan results
   - Vulnerability data
   - SSL/TLS analysis
   - Packet captures

4. **Advanced Features** (Migrations 16-30)
   - Security portfolio
   - Automation workflows
   - Alert correlation
   - Threat hunting

5. **Security Hardening** (Migrations 31-47)
   - RLS policy refinements
   - Function security
   - Admin role system
   - Anonymous access controls

### Key Tables

| Table | Purpose | Row Count (typical) |
|-------|---------|---------------------|
| user_profiles | User accounts and roles | 10-1000 |
| incidents | Security incidents | 100-10000 |
| threats | Threat intelligence | 1000-100000 |
| live_attacks | Real-time attack data | 10000-1000000 |
| forensic_evidence | Evidence artifacts | 100-10000 |
| scan_results | Network scan data | 1000-100000 |
| vulnerabilities | Vulnerability findings | 1000-50000 |
| security_alerts | Alert notifications | 1000-100000 |
| workflows | Automation playbooks | 10-1000 |
| audit_logs | Compliance logs | 10000-1000000 |

### Indexing Strategy

```sql
-- High-traffic query optimization
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);

-- Foreign key indexes
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_evidence_incident_id ON forensic_evidence(incident_id);

-- Search optimization
CREATE INDEX idx_threats_indicator ON threats USING gin(indicator gin_trgm_ops);

-- Real-time query optimization
CREATE INDEX idx_live_attacks_timestamp ON live_attacks(timestamp DESC);
CREATE INDEX idx_live_attacks_country ON live_attacks(country_code);
```

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Supabase Auth validates
   ↓
3. JWT token issued (1 hour expiry)
   ↓
4. Token stored in client
   ↓
5. Token sent with each request
   ↓
6. Token validated by RLS policies
   ↓
7. Database access granted/denied
```

### Row Level Security (RLS)

**345+ RLS Policies** enforcing access control:

```sql
-- Example: Incident access control
CREATE POLICY "Users can view their assigned incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  );
```

### Security Layers

1. **Network Layer**
   - HTTPS/TLS 1.3 encryption
   - CORS policies on edge functions
   - DDoS protection (Supabase)

2. **Application Layer**
   - Authentication required
   - JWT token validation
   - Role-based access control (RBAC)
   - Input validation and sanitization

3. **Database Layer**
   - Row Level Security (RLS)
   - Function security (search_path)
   - Prepared statements (SQL injection prevention)
   - Encryption at rest

4. **Audit Layer**
   - All security actions logged
   - User activity tracking
   - Change history
   - Compliance reporting

## Real-time Architecture

### Subscription Model

```typescript
// Subscribe to incident updates
const subscription = supabase
  .channel('incidents-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'incidents'
    },
    (payload) => {
      console.log('Incident changed:', payload)
      updateUI(payload.new)
    }
  )
  .subscribe()
```

### Real-time Features

1. **Live Attack Feed**: Attack data streams to dashboard in real-time
2. **Incident Updates**: Incident status changes broadcast to all viewers
3. **Threat Intelligence**: New IOCs appear immediately across the platform
4. **Alert Notifications**: Security alerts delivered instantly
5. **Collaborative Investigations**: Multiple analysts see updates in real-time

### Performance Optimization

- **Connection Pooling**: Supabase manages connection pools automatically
- **Selective Subscriptions**: Only subscribe to relevant data
- **Debouncing**: Prevent excessive re-renders from rapid updates
- **Pagination**: Load data in chunks for large datasets

## API Architecture

### REST API (Auto-generated)

PostgREST automatically generates REST endpoints for all tables:

```
GET    /rest/v1/incidents              # List incidents
GET    /rest/v1/incidents?id=eq.123    # Get specific incident
POST   /rest/v1/incidents              # Create incident
PATCH  /rest/v1/incidents?id=eq.123    # Update incident
DELETE /rest/v1/incidents?id=eq.123    # Delete incident
```

### Edge Function APIs

Custom business logic exposed via edge functions:

```
POST /functions/v1/network-scanner
POST /functions/v1/vulnerability-scanner
POST /functions/v1/threat-intelligence
POST /functions/v1/correlation-engine
...
```

## Data Flow

### Typical Security Incident Flow

```
1. Threat Detected
   ↓
2. Alert Generated (alert-processor function)
   ↓
3. Correlation Engine Analyzes (correlation-engine function)
   ↓
4. Incident Created (incidents table)
   ↓
5. Real-time Update Broadcast (WebSocket)
   ↓
6. Dashboard Updates (React component)
   ↓
7. Analyst Investigates (forensics tools)
   ↓
8. Evidence Collected (evidence_locker table)
   ↓
9. Playbook Executed (workflow-executor function)
   ↓
10. Incident Resolved (incidents table update)
    ↓
11. Audit Log Created (audit_logs table)
    ↓
12. Compliance Report Generated (compliance-reporter function)
```

## Scalability

### Current Capacity

- **Users**: 1,000+ concurrent users supported
- **Data Volume**: Handles millions of security events
- **API Throughput**: 1,000+ requests/second per function
- **Real-time Connections**: 1,000+ concurrent WebSocket connections

### Scaling Strategy

**Horizontal Scaling:**
- Edge functions auto-scale based on demand
- Database connection pooling
- CDN for static assets

**Vertical Scaling:**
- Database upgrade paths available
- Dedicated compute for high-traffic customers

**Data Archival:**
- Archive old incidents after 90 days
- Move cold data to separate storage
- Maintain audit trail for compliance

## Deployment Architecture

### Development Environment
```
Local Machine
  ├── Vite Dev Server (port 5173)
  ├── Hot Module Reload
  └── Supabase Remote (dev project)
```

### Production Environment
```
Netlify/Vercel CDN
  ├── Static Assets (cached)
  ├── React SPA
  └── Supabase Production
      ├── Edge Functions (global)
      ├── PostgreSQL (regional)
      └── Real-time Engine
```

## Future Architecture Enhancements

### Planned Improvements

1. **Microservices**: Break edge functions into specialized services
2. **Event Sourcing**: Implement event-driven architecture
3. **Machine Learning**: Add ML-based threat detection
4. **Multi-tenancy**: Support for multiple organizations
5. **Federation**: Cross-SOC data sharing
6. **Mobile Apps**: Native iOS/Android applications

### Technology Radar

**Evaluating:**
- GraphQL API layer
- Time-series database for metrics
- Elasticsearch for advanced search
- Redis for caching layer
- Kubernetes for self-hosted deployments

---

For questions about the architecture, open a GitHub discussion or contact the maintainers.
