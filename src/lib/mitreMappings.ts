export interface MitreMappingData {
  mitre_tactic: string;
  mitre_technique_id: string;
  mitre_technique_name: string;
  mitre_description: string;
  recommended_action: string;
}

export type AlertType =
  | 'BRUTE_FORCE'
  | 'PORT_SCAN'
  | 'POWERSHELL'
  | 'WEB_EXPLOIT'
  | 'C2_BEACON'
  | 'PRIV_ESC';

export const mitreMappings: Record<AlertType, MitreMappingData> = {
  BRUTE_FORCE: {
    mitre_tactic: 'Credential Access',
    mitre_technique_id: 'T1110',
    mitre_technique_name: 'Brute Force',
    mitre_description: 'Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained. This includes password guessing, password spraying, and credential stuffing attacks.',
    recommended_action: 'Implement account lockout policies, enable multi-factor authentication, monitor for multiple failed login attempts, and review authentication logs for suspicious patterns.'
  },
  PORT_SCAN: {
    mitre_tactic: 'Discovery',
    mitre_technique_id: 'T1046',
    mitre_technique_name: 'Network Service Discovery',
    mitre_description: 'Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices, including those that may be vulnerable to remote software exploitation.',
    recommended_action: 'Block unnecessary ports at the firewall, implement network segmentation, deploy intrusion detection systems, and monitor for scanning activity patterns.'
  },
  POWERSHELL: {
    mitre_tactic: 'Execution',
    mitre_technique_id: 'T1059.001',
    mitre_technique_name: 'PowerShell',
    mitre_description: 'Adversaries may abuse PowerShell commands and scripts for execution. PowerShell is a powerful interactive command-line interface and scripting environment included in Windows.',
    recommended_action: 'Enable PowerShell logging and transcription, restrict PowerShell execution policies, monitor for suspicious PowerShell commands, and consider using application whitelisting.'
  },
  WEB_EXPLOIT: {
    mitre_tactic: 'Initial Access',
    mitre_technique_id: 'T1190',
    mitre_technique_name: 'Exploit Public-Facing Application',
    mitre_description: 'Adversaries may attempt to exploit a weakness in an Internet-facing host or system to initially access a network. The weakness in the system can be a software bug, a temporary glitch, or a misconfiguration.',
    recommended_action: 'Apply security patches promptly, implement web application firewalls, conduct regular vulnerability assessments, and use input validation and sanitization.'
  },
  C2_BEACON: {
    mitre_tactic: 'Command and Control',
    mitre_technique_id: 'T1071',
    mitre_technique_name: 'Application Layer Protocol',
    mitre_description: 'Adversaries may communicate using application layer protocols to avoid detection/network filtering by blending in with existing traffic. Commands sent over common protocols may not stand out.',
    recommended_action: 'Monitor network traffic for unusual patterns, implement DNS filtering and analysis, use network traffic analytics, and isolate compromised systems immediately.'
  },
  PRIV_ESC: {
    mitre_tactic: 'Privilege Escalation',
    mitre_technique_id: 'T1068',
    mitre_technique_name: 'Exploitation for Privilege Escalation',
    mitre_description: 'Adversaries may exploit software vulnerabilities in an attempt to elevate privileges. Exploitation of a vulnerability occurs when an adversary takes advantage of a programming error to execute adversary-controlled code.',
    recommended_action: 'Apply security patches immediately, implement least privilege principles, monitor for unusual privilege escalation attempts, and enable audit logging for privilege changes.'
  }
};
