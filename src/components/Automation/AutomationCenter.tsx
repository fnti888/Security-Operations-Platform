import React, { useState, useEffect } from 'react';
import { Zap, Play, Pause, Plus, Edit2, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_conditions: any;
  actions: any[];
  enabled: boolean;
  execution_count: number;
  last_executed: string | null;
  created_at: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_event: any;
  actions_taken: any[];
  status: string;
  error_log: string;
  started_at: string;
  completed_at: string | null;
}

export function AutomationCenter() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
    loadRecentExecutions();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const toggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_workflows')
        .update({ enabled: !enabled })
        .eq('id', workflowId);

      if (error) throw error;
      await loadWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-executor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          trigger_event: { manual: true, timestamp: new Date().toISOString() },
        }),
      });

      if (response.ok) {
        await loadWorkflows();
        await loadRecentExecutions();
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  const createSampleWorkflows = async () => {
    const samples = [
      {
        name: 'Critical Vulnerability Alert',
        description: 'Auto-create high-priority alerts when critical vulnerabilities are detected',
        trigger_conditions: {
          type: 'vulnerability_detected',
          severity: 'critical',
        },
        actions: [
          {
            type: 'create_alert',
            params: {
              title: 'Critical Vulnerability Detected',
              severity: 'critical',
              alert_type: 'security',
            },
          },
          {
            type: 'log_audit',
            params: {
              action: 'critical_vuln_workflow',
              resource_type: 'vulnerability',
            },
          },
        ],
        enabled: true,
      },
      {
        name: 'Incident Enrichment',
        description: 'Automatically enrich new incidents with threat intelligence',
        trigger_conditions: {
          type: 'incident_created',
          severity: ['high', 'critical'],
        },
        actions: [
          {
            type: 'enrich_threat',
            params: {},
          },
          {
            type: 'update_incident',
            params: {
              status: 'investigating',
            },
          },
        ],
        enabled: true,
      },
      {
        name: 'Auto Threat Hunt Trigger',
        description: 'Trigger threat hunt when multiple correlated incidents detected',
        trigger_conditions: {
          type: 'correlation_detected',
          min_confidence: 80,
        },
        actions: [
          {
            type: 'create_hunt_finding',
            params: {
              title: 'Correlated Attack Pattern',
              severity: 'high',
            },
          },
        ],
        enabled: true,
      },
    ];

    for (const workflow of samples) {
      await supabase.from('automation_workflows').insert(workflow);
    }

    await loadWorkflows();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading automation center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            Automation Center
          </h2>
          <p className="text-gray-400 mt-1">Automated incident response workflows and playbooks</p>
        </div>
        <div className="flex gap-3">
          {workflows.length === 0 && (
            <button
              onClick={createSampleWorkflows}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Sample Workflows
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{workflows.length}</div>
          <div className="text-gray-400 text-sm">Total Workflows</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-500">
            {workflows.filter(w => w.enabled).length}
          </div>
          <div className="text-gray-400 text-sm">Active Workflows</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-500">
            {workflows.reduce((sum, w) => sum + w.execution_count, 0)}
          </div>
          <div className="text-gray-400 text-sm">Total Executions</div>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Active Workflows</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {workflows.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No workflows configured. Click "Add Sample Workflows" to get started.
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-white font-medium">{workflow.name}</h4>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          workflow.enabled
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {workflow.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{workflow.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Actions: {workflow.actions.length}</span>
                      <span>Executions: {workflow.execution_count}</span>
                      {workflow.last_executed && (
                        <span>Last: {new Date(workflow.last_executed).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeWorkflow(workflow.id)}
                      className="p-2 hover:bg-gray-700 rounded text-blue-400"
                      title="Execute Now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                      className="p-2 hover:bg-gray-700 rounded text-gray-400"
                      title={workflow.enabled ? 'Disable' : 'Enable'}
                    >
                      {workflow.enabled ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Executions</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {executions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No executions yet</div>
          ) : (
            executions.map((execution) => {
              const workflow = workflows.find(w => w.id === execution.workflow_id);
              return (
                <div key={execution.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="text-white font-medium">
                          {workflow?.name || 'Unknown Workflow'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(execution.started_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        {execution.actions_taken.length} actions
                      </div>
                      {execution.error_log && (
                        <div className="text-xs text-red-400 mt-1">Has errors</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
