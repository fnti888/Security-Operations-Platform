import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Target, Plus, TrendingUp, Award, Clock, CheckCircle, Book, Trophy } from 'lucide-react';

interface Skill {
  id: string;
  skill_category: string;
  skill_name: string;
  proficiency_level: string;
  status: string;
  date_started: string | null;
  date_completed: string | null;
  proof_url: string | null;
  notes: string | null;
  hours_invested: number;
  created_at: string;
}

export function SkillsLab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    skill_category: 'tool_proficiency',
    skill_name: '',
    proficiency_level: 'beginner',
    status: 'learning',
    date_started: new Date().toISOString().split('T')[0],
    date_completed: '',
    proof_url: '',
    notes: '',
    hours_invested: 0
  });

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills_tracker')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('skills_tracker').insert([{
        user_id: user.id,
        skill_category: formData.skill_category,
        skill_name: formData.skill_name,
        proficiency_level: formData.proficiency_level,
        status: formData.status,
        date_started: formData.date_started || null,
        date_completed: formData.date_completed || null,
        proof_url: formData.proof_url || null,
        notes: formData.notes || null,
        hours_invested: formData.hours_invested
      }]);

      if (error) throw error;

      setShowAddForm(false);
      setFormData({
        skill_category: 'tool_proficiency',
        skill_name: '',
        proficiency_level: 'beginner',
        status: 'learning',
        date_started: new Date().toISOString().split('T')[0],
        date_completed: '',
        proof_url: '',
        notes: '',
        hours_invested: 0
      });
      fetchSkills();
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = filterCategory === 'all' || skill.skill_category === filterCategory;
    const matchesStatus = filterStatus === 'all' || skill.status === filterStatus;
    return matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900 bg-opacity-30';
      case 'certified': return 'text-blue-400 bg-blue-900 bg-opacity-30';
      case 'learning': return 'text-yellow-400 bg-yellow-900 bg-opacity-30';
      case 'practicing': return 'text-orange-400 bg-orange-900 bg-opacity-30';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-purple-400';
      case 'advanced': return 'text-green-400';
      case 'intermediate': return 'text-blue-400';
      case 'beginner': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'certification': return <Award className="w-5 h-5" />;
      case 'training_course': return <Book className="w-5 h-5" />;
      case 'ctf_challenge': return <Trophy className="w-5 h-5" />;
      case 'hands_on_lab': return <Target className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const stats = {
    totalSkills: skills.length,
    completed: skills.filter(s => s.status === 'completed' || s.status === 'certified').length,
    learning: skills.filter(s => s.status === 'learning').length,
    totalHours: skills.reduce((sum, s) => sum + s.hours_invested, 0)
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-green-400">Loading skills...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
            <Target className="w-8 h-8" />
            Skills Lab & Learning Tracker
          </h2>
          <p className="text-gray-400 mt-1">Track your security tools, certifications, and hands-on labs</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors flex items-center gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Skills</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalSkills}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Completed</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.completed}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">In Progress</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.learning}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Hours</span>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalHours}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="tool_proficiency">Tool Proficiency</option>
          <option value="certification">Certifications</option>
          <option value="training_course">Training Courses</option>
          <option value="hands_on_lab">Hands-On Labs</option>
          <option value="ctf_challenge">CTF Challenges</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="learning">Learning</option>
          <option value="practicing">Practicing</option>
          <option value="completed">Completed</option>
          <option value="certified">Certified</option>
        </select>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-green-500 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-green-400 mb-4">Add Skill / Training</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={formData.skill_category}
                  onChange={(e) => setFormData({ ...formData, skill_category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="tool_proficiency">Tool Proficiency</option>
                  <option value="certification">Certification</option>
                  <option value="training_course">Training Course</option>
                  <option value="hands_on_lab">Hands-On Lab</option>
                  <option value="ctf_challenge">CTF Challenge</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Skill / Tool Name</label>
                <input
                  type="text"
                  required
                  value={formData.skill_name}
                  onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="E.g., Wireshark, Splunk, CySA+, TryHackMe SOC Level 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Proficiency Level</label>
                  <select
                    value={formData.proficiency_level}
                    onChange={(e) => setFormData({ ...formData, proficiency_level: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="learning">Learning</option>
                    <option value="practicing">Practicing</option>
                    <option value="completed">Completed</option>
                    <option value="certified">Certified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date Started</label>
                  <input
                    type="date"
                    value={formData.date_started}
                    onChange={(e) => setFormData({ ...formData, date_started: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date Completed</label>
                  <input
                    type="date"
                    value={formData.date_completed}
                    onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hours Invested</label>
                <input
                  type="number"
                  min="0"
                  value={formData.hours_invested}
                  onChange={(e) => setFormData({ ...formData, hours_invested: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Proof URL</label>
                <input
                  type="url"
                  value={formData.proof_url}
                  onChange={(e) => setFormData({ ...formData, proof_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="Certificate, badge, or project link"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
                  rows={3}
                  placeholder="Key takeaways, challenges faced, projects completed..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
                >
                  Add Skill
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSkills.length === 0 ? (
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Skills Tracked Yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your learning journey and demonstrate continuous improvement</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-semibold"
            >
              Add Your First Skill
            </button>
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-green-500 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-green-400">
                    {getCategoryIcon(skill.skill_category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{skill.skill_name}</h3>
                    <span className={`text-sm ${getProficiencyColor(skill.proficiency_level)}`}>
                      {skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(skill.status)}`}>
                  {skill.status.toUpperCase()}
                </span>
              </div>

              {skill.notes && (
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{skill.notes}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  {skill.date_started && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Started: {new Date(skill.date_started).toLocaleDateString()}
                    </span>
                  )}
                  {skill.hours_invested > 0 && (
                    <span className="text-purple-400 font-semibold">
                      {skill.hours_invested}h
                    </span>
                  )}
                </div>
                {skill.proof_url && (
                  <a
                    href={skill.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Award className="w-3 h-3" />
                    Proof
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-400 mb-4">Recommended Learning Path for SOC Analysts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Essential Tools</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Wireshark (Packet Analysis)</li>
              <li>• Splunk / ELK (SIEM)</li>
              <li>• Nmap (Network Scanning)</li>
              <li>• Burp Suite (Web Security)</li>
              <li>• Volatility (Memory Forensics)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Key Certifications</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• CompTIA Security+</li>
              <li>• CompTIA CySA+</li>
              <li>• GIAC GSEC</li>
              <li>• Blue Team Level 1 (BTL1)</li>
              <li>• CEH (Ethical Hacking)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Hands-On Practice</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• TryHackMe SOC Path</li>
              <li>• HackTheBox</li>
              <li>• PCAP Analysis Labs</li>
              <li>• Boss of the SOC (BOTS)</li>
              <li>• Malware Traffic Analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
