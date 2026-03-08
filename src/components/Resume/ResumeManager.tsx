import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Plus, Trash2, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Profile {
  id: string;
  full_name: string;
  title: string;
  summary: string;
  email: string;
  phone: string;
  linkedin_url: string;
  location: string;
  is_public: boolean;
}

interface WorkExperience {
  id?: string;
  company: string;
  position: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
  display_order: number;
}

interface Education {
  id?: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  description: string;
  display_order: number;
}

interface Skill {
  id?: string;
  name: string;
  category: string;
  proficiency_level: string;
  display_order: number;
}

export function ResumeManager() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    id: '',
    full_name: '',
    title: '',
    summary: '',
    email: '',
    phone: '',
    linkedin_url: '',
    location: '',
    is_public: true,
  });
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadResumeData();
  }, [user]);

  async function loadResumeData() {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);

        const { data: experiencesData } = await supabase
          .from('work_experiences')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('display_order', { ascending: true });

        const { data: educationData } = await supabase
          .from('education')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('display_order', { ascending: true });

        const { data: skillsData } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('display_order', { ascending: true });

        setWorkExperiences(experiencesData || []);
        setEducation(educationData || []);
        setSkills(skillsData || []);
      }
    } catch (error) {
      console.error('Error loading resume data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setMessage('Profile saved successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  }

  async function saveWorkExperiences() {
    if (!profile.id) {
      setMessage('Please save your profile first');
      return;
    }

    setSaving(true);
    try {
      const existingIds = workExperiences.filter(exp => exp.id).map(exp => exp.id);

      if (existingIds.length > 0) {
        await supabase
          .from('work_experiences')
          .delete()
          .eq('profile_id', profile.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      }

      for (const exp of workExperiences) {
        const expData = {
          ...exp,
          profile_id: profile.id,
        };

        if (exp.id) {
          await supabase
            .from('work_experiences')
            .update(expData)
            .eq('id', exp.id);
        } else {
          const { data } = await supabase
            .from('work_experiences')
            .insert(expData)
            .select()
            .single();

          if (data) {
            exp.id = data.id;
          }
        }
      }

      setMessage('Work experience saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving work experiences:', error);
      setMessage('Error saving work experience');
    } finally {
      setSaving(false);
    }
  }

  async function saveEducation() {
    if (!profile.id) {
      setMessage('Please save your profile first');
      return;
    }

    setSaving(true);
    try {
      const existingIds = education.filter(edu => edu.id).map(edu => edu.id);

      if (existingIds.length > 0) {
        await supabase
          .from('education')
          .delete()
          .eq('profile_id', profile.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      }

      for (const edu of education) {
        const eduData = {
          ...edu,
          profile_id: profile.id,
        };

        if (edu.id) {
          await supabase
            .from('education')
            .update(eduData)
            .eq('id', edu.id);
        } else {
          const { data } = await supabase
            .from('education')
            .insert(eduData)
            .select()
            .single();

          if (data) {
            edu.id = data.id;
          }
        }
      }

      setMessage('Education saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving education:', error);
      setMessage('Error saving education');
    } finally {
      setSaving(false);
    }
  }

  async function saveSkills() {
    if (!profile.id) {
      setMessage('Please save your profile first');
      return;
    }

    setSaving(true);
    try {
      const existingIds = skills.filter(skill => skill.id).map(skill => skill.id);

      if (existingIds.length > 0) {
        await supabase
          .from('skills')
          .delete()
          .eq('profile_id', profile.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      }

      for (const skill of skills) {
        const skillData = {
          ...skill,
          profile_id: profile.id,
        };

        if (skill.id) {
          await supabase
            .from('skills')
            .update(skillData)
            .eq('id', skill.id);
        } else {
          const { data } = await supabase
            .from('skills')
            .insert(skillData)
            .select()
            .single();

          if (data) {
            skill.id = data.id;
          }
        }
      }

      setMessage('Skills saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving skills:', error);
      setMessage('Error saving skills');
    } finally {
      setSaving(false);
    }
  }

  function addWorkExperience() {
    setWorkExperiences([
      ...workExperiences,
      {
        company: '',
        position: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        display_order: workExperiences.length,
      },
    ]);
  }

  function removeWorkExperience(index: number) {
    const updated = workExperiences.filter((_, i) => i !== index);
    setWorkExperiences(updated);
  }

  function addEducation() {
    setEducation([
      ...education,
      {
        institution: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        description: '',
        display_order: education.length,
      },
    ]);
  }

  function removeEducation(index: number) {
    const updated = education.filter((_, i) => i !== index);
    setEducation(updated);
  }

  function addSkill() {
    setSkills([
      ...skills,
      {
        name: '',
        category: 'General',
        proficiency_level: '',
        display_order: skills.length,
      },
    ]);
  }

  function removeSkill(index: number) {
    const updated = skills.filter((_, i) => i !== index);
    setSkills(updated);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-green-400">Loading resume data...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-400">Resume Manager</h1>
        <a
          href="/resume"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View Public Resume
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-500 text-green-400 rounded">
          {message}
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-slate-900 border border-green-500/30 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-green-400 mb-2">Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-green-400 mb-2">Professional Title</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-green-400 mb-2">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-green-400 mb-2">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-green-400 mb-2">LinkedIn URL</label>
              <input
                type="url"
                value={profile.linkedin_url}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                placeholder="https://www.linkedin.com/in/yourprofile"
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-green-400 mb-2">Location</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-green-400 mb-2">Professional Summary</label>
            <textarea
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              rows={4}
              className="w-full bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.is_public}
              onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-green-400">Make resume publicly visible</label>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </section>

        <section className="bg-slate-900 border border-green-500/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-400">Work Experience</h2>
            <button
              onClick={addWorkExperience}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
          <div className="space-y-4 mb-4">
            {workExperiences.map((exp, index) => (
              <div key={index} className="border border-green-500/30 rounded p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="text-green-400 font-semibold">Experience #{index + 1}</h3>
                  <button
                    onClick={() => removeWorkExperience(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => {
                      const updated = [...workExperiences];
                      updated[index].company = e.target.value;
                      setWorkExperiences(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Position"
                    value={exp.position}
                    onChange={(e) => {
                      const updated = [...workExperiences];
                      updated[index].position = e.target.value;
                      setWorkExperiences(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={exp.location}
                    onChange={(e) => {
                      const updated = [...workExperiences];
                      updated[index].location = e.target.value;
                      setWorkExperiences(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      placeholder="Start Date"
                      value={exp.start_date}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].start_date = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      placeholder="End Date"
                      value={exp.end_date}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].end_date = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) => {
                    const updated = [...workExperiences];
                    updated[index].description = e.target.value;
                    setWorkExperiences(updated);
                  }}
                  rows={3}
                  className="w-full mt-3 bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveWorkExperiences}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Work Experience
          </button>
        </section>

        <section className="bg-slate-900 border border-green-500/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-400">Education</h2>
            <button
              onClick={addEducation}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
          <div className="space-y-4 mb-4">
            {education.map((edu, index) => (
              <div key={index} className="border border-green-500/30 rounded p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="text-green-400 font-semibold">Education #{index + 1}</h3>
                  <button
                    onClick={() => removeEducation(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[index].institution = e.target.value;
                      setEducation(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[index].degree = e.target.value;
                      setEducation(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study"
                    value={edu.field_of_study}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[index].field_of_study = e.target.value;
                      setEducation(updated);
                    }}
                    className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={edu.start_date}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].start_date = e.target.value;
                        setEducation(updated);
                      }}
                      className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={edu.end_date}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].end_date = e.target.value;
                        setEducation(updated);
                      }}
                      className="bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Description"
                  value={edu.description}
                  onChange={(e) => {
                    const updated = [...education];
                    updated[index].description = e.target.value;
                    setEducation(updated);
                  }}
                  rows={2}
                  className="w-full mt-3 bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveEducation}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Education
          </button>
        </section>

        <section className="bg-slate-900 border border-green-500/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-400">Skills</h2>
            <button
              onClick={addSkill}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          </div>
          <div className="space-y-3 mb-4">
            {skills.map((skill, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Skill Name"
                  value={skill.name}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].name = e.target.value;
                    setSkills(updated);
                  }}
                  className="flex-1 bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={skill.category}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].category = e.target.value;
                    setSkills(updated);
                  }}
                  className="w-40 bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Level"
                  value={skill.proficiency_level}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].proficiency_level = e.target.value;
                    setSkills(updated);
                  }}
                  className="w-32 bg-black border border-green-500/50 text-green-400 px-3 py-2 rounded focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => removeSkill(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={saveSkills}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Skills
          </button>
        </section>
      </div>
    </div>
  );
}
