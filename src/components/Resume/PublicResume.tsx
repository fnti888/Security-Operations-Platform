import { useState, useEffect } from 'react';
import { MapPin, Mail, Phone, Linkedin, Briefcase, GraduationCap, Award, Download, Calendar, ExternalLink, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  title: string;
  summary: string;
  email: string;
  phone: string;
  linkedin_url: string;
  location: string;
}

interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string;
  display_order: number;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string | null;
  description: string;
  display_order: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency_level: string;
  display_order: number;
}

function SkillTag({ skill }: { skill: Skill }) {
  const proficiencyConfig: Record<string, { bg: string; text: string }> = {
    'Expert': { bg: 'bg-slate-900', text: 'text-white' },
    'Advanced': { bg: 'bg-slate-700', text: 'text-white' },
    'Intermediate': { bg: 'bg-slate-200', text: 'text-slate-900' },
    'Beginner': { bg: 'bg-slate-100', text: 'text-slate-700' }
  };

  const config = proficiencyConfig[skill.proficiency_level] || proficiencyConfig['Intermediate'];

  return (
    <span className={`inline-block px-3 py-1.5 ${config.bg} ${config.text} text-sm font-medium rounded print:border print:border-slate-300`}>
      {skill.name}
    </span>
  );
}

export function PublicResume() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResumeData();
  }, []);

  async function loadResumeData() {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true)
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

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Present';
    const [year, month] = dateString.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  function groupSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
    return skills.reduce((acc, skill) => {
      const category = skill.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>);
  }

  function handleDownloadPDF() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-slate-600 font-medium">Loading resume...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Resume Not Available</h2>
          <p className="text-slate-600">No public resume has been configured yet.</p>
        </div>
      </div>
    );
  }

  const skillsByCategory = groupSkillsByCategory(skills);

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 print:bg-white print:py-0">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={handleDownloadPDF}
          className="fixed top-8 right-8 z-50 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-all print:hidden"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium">Download PDF</span>
        </button>

        <div className="bg-white shadow-xl print:shadow-none">
          <div className="border-b-4 border-slate-900 px-12 py-10 print:py-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-3 tracking-tight">
              {profile.full_name}
            </h1>
            <p className="text-xl text-slate-700 mb-6 font-medium">{profile.title}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email}</span>
                </a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>{profile.phone}</span>
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>

        <div className="px-12 py-10 space-y-10 print:py-8">
          {profile.summary && (
            <section>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-slate-900">
                Professional Summary
              </h2>
              <p className="text-slate-700 leading-relaxed text-[15px] whitespace-pre-line">{profile.summary}</p>
            </section>
          )}

          {workExperiences.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-slate-900">
                Professional Experience
              </h2>
              <div className="space-y-6">
                {workExperiences.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">{exp.position}</h3>
                        <div className="text-base font-semibold text-slate-700">{exp.company}</div>
                      </div>
                      <div className="text-sm text-slate-600 whitespace-nowrap ml-4">
                        {formatDate(exp.start_date)} - {formatDate(exp.end_date)}
                      </div>
                    </div>
                    {exp.location && (
                      <div className="text-sm text-slate-600 mb-2">{exp.location}</div>
                    )}
                    {exp.description && (
                      <div className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line mt-2">
                        {exp.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {education.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-slate-900">
                Education
              </h2>
              <div className="space-y-6">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">{edu.degree}</h3>
                        <div className="text-base font-semibold text-slate-700">{edu.institution}</div>
                        {edu.field_of_study && (
                          <div className="text-sm text-slate-600 mt-1">{edu.field_of_study}</div>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 whitespace-nowrap ml-4">
                        {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                      </div>
                    </div>
                    {edu.description && (
                      <div className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line mt-2">
                        {edu.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {skills.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-slate-900">
                Skills & Expertise
              </h2>
              <div className="space-y-5">
                {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                  <div key={category}>
                    <h3 className="text-sm font-bold text-slate-800 mb-3">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {categorySkills.map((skill) => (
                        <SkillTag key={skill.id} skill={skill} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="border-t border-slate-200 px-12 py-6 bg-slate-50 print:bg-white text-center">
          <p className="text-xs text-slate-500">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
