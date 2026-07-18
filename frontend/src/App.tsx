import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import type { 
  User, InterviewSession, DashboardStats, FeedbackReport 
} from './types';
import { api } from './api';
import { 
  Briefcase, GraduationCap, Award, Flame, Play, Clock, ArrowLeft, Send, 
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, LogOut, Check, X 
} from 'lucide-react';

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation / Views
  const [view, setView] = useState<'dashboard' | 'wizard' | 'chat' | 'feedback'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App domain states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [selectedCompletedSession, setSelectedCompletedSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isWaitingForEvaluation, setIsWaitingForEvaluation] = useState(false);

  // Wizard inputs
  const [wizardRole, setWizardRole] = useState('Backend Java Developer');
  const [wizardType, setWizardType] = useState('TECHNICAL');
  const [wizardDifficulty, setWizardDifficulty] = useState('MEDIUM');
  const [wizardLength, setWizardLength] = useState<number>(-1);
  const [geminiKey, setGeminiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Auth inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Backend Java Developer');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');

  // Accordion state for feedback
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Chat scroll anchor
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Auth
  useEffect(() => {
    if (token) {
      const emailVal = localStorage.getItem('userEmail') || '';
      const nameVal = localStorage.getItem('userName') || '';
      const targetRoleVal = localStorage.getItem('userTargetRole') || '';
      const expVal = localStorage.getItem('userExperienceLevel') || '';
      const idVal = localStorage.getItem('userId') || '';

      setUser({
        userId: idVal,
        email: emailVal,
        name: nameVal,
        targetRole: targetRoleVal,
        experienceLevel: expVal
      });
      setView('dashboard');
    }
  }, [token]);

  // Load Dashboard stats when view switches to dashboard
  useEffect(() => {
    if (token && view === 'dashboard') {
      fetchDashboardStats();
    }
  }, [token, view]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (view === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession, view, isSubmittingAnswer, isWaitingForEvaluation]);

  // Poll for background evaluation updates while in the chat room
  useEffect(() => {
    let interval: any;
    if (view === 'chat' && activeSession && isWaitingForEvaluation) {
      interval = setInterval(async () => {
        try {
          const updated = await api.interviews.get(activeSession.id);
          
          // Check if the current question has received its evaluation
          const curQInSession = activeSession.questions[currentQuestionIndex];
          const updatedQ = updated.questions.find((q: any) => q.id === curQInSession.id);

          if (updatedQ && updatedQ.score !== null && updatedQ.aiFeedback !== null) {
            setActiveSession(updated);
            setIsWaitingForEvaluation(false);
            
            // Advance question index or complete session
            if (currentQuestionIndex + 1 < updated.questions.length) {
              setCurrentQuestionIndex(prev => prev + 1);
              setUserAnswer('');
            } else {
              // All questions answered, session complete!
              // Let's poll or wait a second and fetch the final evaluated session
              setLoading(true);
              setTimeout(async () => {
                const finalSession = await api.interviews.get(activeSession.id);
                setActiveSession(finalSession);
                setSelectedCompletedSession(finalSession);
                setLoading(false);
                setView('feedback');
              }, 1500);
            }
          }
        } catch (err) {
          console.error("Polling evaluation failed: ", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [view, activeSession, currentQuestionIndex, isWaitingForEvaluation]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await api.dashboard.getStats();
      setDashboardStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('userEmail', res.email);
      localStorage.setItem('userName', res.name);
      localStorage.setItem('userTargetRole', res.targetRole || '');
      localStorage.setItem('userExperienceLevel', res.experienceLevel || '');
      localStorage.setItem('userId', res.userId);
      
      setToken(res.token);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await api.auth.signup({
        email,
        password,
        name,
        targetRole,
        experienceLevel
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('userEmail', res.email);
      localStorage.setItem('userName', res.name);
      localStorage.setItem('userTargetRole', res.targetRole || '');
      localStorage.setItem('userExperienceLevel', res.experienceLevel || '');
      localStorage.setItem('userId', res.userId);
      
      setToken(res.token);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setView('dashboard');
    setEmail('');
    setPassword('');
    setName('');
  };

  const startNewInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await api.interviews.create({
        role: wizardRole,
        type: wizardType,
        difficulty: wizardDifficulty,
        questionsCount: wizardLength
      });
      setActiveSession(session);
      setCurrentQuestionIndex(0);
      setUserAnswer('');
      setIsSubmittingAnswer(false);
      setIsWaitingForEvaluation(false);
      setView('chat');
    } catch (err: any) {
      setError(err.message || 'Failed to start interview session.');
    } finally {
      setLoading(false);
    }
  };

  const endInterviewManually = async () => {
    if (!activeSession) return;
    setLoading(true);
    setError(null);
    try {
      const finalSession = await api.interviews.complete(activeSession.id);
      setActiveSession(finalSession);
      setSelectedCompletedSession(finalSession);
      setView('feedback');
    } catch (err: any) {
      setError(err.message || 'Failed to complete interview session.');
    } finally {
      setLoading(false);
    }
  };

  const submitCurrentAnswer = async () => {
    if (!userAnswer.trim() || !activeSession) return;
    setIsSubmittingAnswer(true);
    setError(null);
    const questionId = activeSession.questions[currentQuestionIndex].id;

    try {
      const updated = await api.interviews.submitAnswer(activeSession.id, questionId, userAnswer);
      setActiveSession(updated);
      setIsWaitingForEvaluation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer.');
      setIsSubmittingAnswer(false);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const revisitSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.interviews.get(sessionId);
      setSelectedCompletedSession(session);
      setView('feedback');
    } catch (err: any) {
      setError(err.message || 'Failed to load session details.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session? This will remove all associated AI feedback and responses.")) return;
    setLoading(true);
    setError(null);
    try {
      await api.interviews.delete(sessionId);
      fetchDashboardStats();
    } catch (err: any) {
      setError(err.message || 'Failed to delete session.');
    } finally {
      setLoading(false);
    }
  };

  // Helper parser for stringified JSON AI Feedback
  const parseAiFeedback = (feedbackStr?: string): FeedbackReport | null => {
    if (!feedbackStr) return null;
    try {
      return JSON.parse(feedbackStr) as FeedbackReport;
    } catch {
      // Fallback if not JSON string
      return {
        score: 70,
        correctness: feedbackStr,
        clarity: 'Could not parse clarity report',
        structure: 'Could not parse structure report',
        communication: 'Could not parse communication report',
        strengths: ['Response provided'],
        weaknesses: ['Evaluation parser error'],
        suggestedImprovements: 'Elaborate on details.',
        modelAnswer: 'Model answer comparison unavailable.'
      };
    }
  };

  // Styles utility
  const getDifficultyColor = (diff: string) => {
    switch (diff.toUpperCase()) {
      case 'EASY': return 'text-green-400 bg-green-950/40 border-green-800/40';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40';
      case 'HARD': return 'text-red-400 bg-red-950/40 border-red-800/40';
      default: return 'text-blue-400 bg-blue-950/40 border-blue-800/40';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'TECHNICAL': return '💻 Tech';
      case 'BEHAVIORAL': return '🤝 Behavioral';
      case 'SYSTEM_DESIGN': return '📐 System Design';
      case 'HR': return '👤 HR';
      default: return type;
    }
  };

  // Render Auth Mode
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md p-8 rounded-2xl glass-card relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Prepped.AI
            </h1>
            <p className="text-sm text-slate-400 mt-2">Elevate your interview game with AI-driven prep</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 cursor-pointer text-sm"
              >
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Role</label>
                <input 
                  type="text" 
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-slate-200"
                  placeholder="e.g. Backend Java Developer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Experience Level</label>
                <select 
                  value={experienceLevel} 
                  onChange={e => setExperienceLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-slate-200"
                >
                  <option value="Junior">Junior (0-2 years)</option>
                  <option value="Mid-Level">Mid-Level (2-5 years)</option>
                  <option value="Senior">Senior (5+ years)</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 cursor-pointer text-sm"
              >
                Create Account
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm">
            {authMode === 'login' ? (
              <span className="text-slate-400">
                Don't have an account?{' '}
                <button onClick={() => setAuthMode('signup')} className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline">
                  Sign Up
                </button>
              </span>
            ) : (
              <span className="text-slate-400">
                Already have an account?{' '}
                <button onClick={() => setAuthMode('login')} className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline">
                  Sign In
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loaded Shell Layout
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">P</div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Prepped.AI
          </span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="relative flex items-center gap-2">
              <input
                type="password"
                placeholder="Paste Gemini API Key..."
                value={geminiKey}
                onChange={e => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem('gemini_api_key', e.target.value);
                }}
                className="px-3 py-1.5 rounded-lg glass-input text-xs w-36 sm:w-48 placeholder-slate-500"
                title="Enter Gemini API Key to enable real AI feedback"
              />
              {geminiKey ? (
                <span className="text-[10px] text-emerald-400 font-semibold border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-1 rounded">Real AI</span>
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold border border-amber-500/20 bg-amber-950/40 px-2.5 py-1 rounded">Mock Mode</span>
              )}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-200">{user.name}</p>
              <p className="text-xs text-indigo-400">{user.targetRole || 'Software Engineer'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-lg border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-start gap-2 max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Operation Error</span>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-semibold cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Global Loading Spinner */}
        {loading && view !== 'chat' && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin"></div>
              <p className="text-sm text-slate-400">Loading data...</p>
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && dashboardStats && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Row Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Profile Card */}
              <div className="md:col-span-1 rounded-2xl glass-card p-6 flex flex-col justify-between border-l-2 border-l-indigo-500">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Profile</h3>
                  <h2 className="text-xl font-bold text-slate-200 mt-2">{user?.name}</h2>
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    {user?.targetRole || 'Not Set'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    {user?.experienceLevel || 'Not Set'}
                  </p>
                </div>
                <button 
                  onClick={() => setView('wizard')}
                  className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-indigo-600/20"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Practice
                </button>
              </div>

              {/* Stats Metrics Card 1 */}
              <div className="rounded-2xl glass-card p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-violet-650/20 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</h4>
                  <p className="text-3xl font-extrabold text-slate-200 mt-1">
                    {dashboardStats.overallAverageScore ? `${dashboardStats.overallAverageScore}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Across all completed sessions</p>
                </div>
              </div>

              {/* Stats Metrics Card 2 */}
              <div className="rounded-2xl glass-card p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-650/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sessions Practiced</h4>
                  <p className="text-3xl font-extrabold text-slate-200 mt-1">{dashboardStats.totalSessions}</p>
                  <p className="text-xs text-slate-400 mt-1">Active and completed interviews</p>
                </div>
              </div>

              {/* Stats Metrics Card 3 */}
              <div className="rounded-2xl glass-card p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-amber-650/20 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Flame className="w-6 h-6 fill-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Streak</h4>
                  <p className="text-3xl font-extrabold text-slate-200 mt-1">{dashboardStats.currentStreak} Days</p>
                  <p className="text-xs text-slate-400 mt-1">Keep the momentum going!</p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Trend Line Chart */}
              <div className="lg:col-span-2 rounded-2xl glass-card p-6 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Performance Trend</h3>
                <div className="h-72 w-full">
                  {dashboardStats.recentSessions.filter(s => s.overallScore !== null).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...dashboardStats.recentSessions]
                          .filter(s => s.overallScore !== null)
                          .reverse()}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="endedAt" 
                          stroke="#94a3b8" 
                          tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          fontSize={11}
                        />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                        <Line type="monotone" dataKey="overallScore" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} name="Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                      Complete sessions to see your score trend
                    </div>
                  )}
                </div>
              </div>

              {/* Category Strength Bar Chart */}
              <div className="rounded-2xl glass-card p-6 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Category Breakdown</h3>
                <div className="h-72 w-full">
                  {Object.keys(dashboardStats.categoryAverages).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(dashboardStats.categoryAverages).map(([k, v]) => ({ name: k, score: v }))}
                        margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {Object.entries(dashboardStats.categoryAverages).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                      No category metrics available yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Sessions List */}
            <div className="rounded-2xl glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Recent Sessions</h3>
              {dashboardStats.recentSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400">
                        <th className="pb-3 font-semibold">Type</th>
                        <th className="pb-3 font-semibold">Target Role</th>
                        <th className="pb-3 font-semibold">Difficulty</th>
                        <th className="pb-3 font-semibold">Score</th>
                        <th className="pb-3 font-semibold">Ended At</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dashboardStats.recentSessions.map((session) => (
                        <tr key={session.id} className="group hover:bg-slate-800/25 transition-all">
                          <td className="py-4 pr-3 font-medium">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-white/5 bg-slate-900 text-indigo-300">
                              {getTypeBadge(session.type)}
                            </span>
                          </td>
                          <td className="py-4 pr-3 text-slate-200">{session.role}</td>
                          <td className="py-4 pr-3">
                            <span className={`px-2 py-0.5 rounded text-xs border font-medium ${getDifficultyColor(session.difficulty)}`}>
                              {session.difficulty}
                            </span>
                          </td>
                          <td className="py-4 pr-3 font-semibold text-slate-200">
                            {session.overallScore !== null && session.overallScore !== undefined ? (
                              <span className={session.overallScore >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                                {session.overallScore}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> In Progress
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-slate-400">
                            {session.endedAt ? new Date(session.endedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => revisitSession(session.id)}
                                className="text-xs bg-indigo-900/60 hover:bg-indigo-600 text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-700/30 font-semibold transition-all cursor-pointer"
                              >
                                View Report
                              </button>
                              <button 
                                onClick={() => deleteSession(session.id)}
                                className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/10 hover:border-red-500/25 transition-all cursor-pointer flex items-center justify-center"
                                title="Delete Session"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <p>You haven't practiced any interview sessions yet.</p>
                  <button 
                    onClick={() => setView('wizard')}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-indigo-600/20"
                  >
                    Create Your First Interview
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SETUP WIZARD */}
        {view === 'wizard' && (
          <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 border-t-2 border-t-indigo-500 shadow-2xl animate-fadeIn">
            <button 
              onClick={() => setView('dashboard')}
              className="mb-6 flex items-center gap-1 text-xs text-slate-400 hover:text-white font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            
            <h2 className="text-2xl font-extrabold text-slate-200 mb-2">Configure Practice Session</h2>
            <p className="text-sm text-slate-400 mb-8">Custom generate a tailored set of mock questions matching your parameters.</p>

            <form onSubmit={startNewInterview} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Role</label>
                <input 
                  type="text"
                  value={wizardRole}
                  onChange={e => setWizardRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm"
                  placeholder="e.g. Senior Java Developer, Frontend Lead"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Interview Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'TECHNICAL', label: '💻 Technical', desc: 'Coding, language underpinnings, systems' },
                    { id: 'BEHAVIORAL', label: '🤝 Behavioral', desc: 'STAR situational, soft skills, culture' },
                    { id: 'SYSTEM_DESIGN', label: '📐 System Design', desc: 'Architecture, databases, scaling' },
                    { id: 'HR', label: '👤 HR / Screening', desc: 'Aspirations, background checks, HR fit' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setWizardType(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        wizardType === t.id 
                          ? 'border-indigo-500 bg-indigo-950/20' 
                          : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/40'
                      }`}
                    >
                      <h4 className="text-sm font-semibold text-slate-200">{t.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'EASY', label: 'Junior', color: 'border-green-500/20 hover:border-green-500/40' },
                    { id: 'MEDIUM', label: 'Mid-Level', color: 'border-yellow-500/20 hover:border-yellow-500/40' },
                    { id: 'HARD', label: 'Senior / Expert', color: 'border-red-500/20 hover:border-red-500/40' }
                  ].map(d => (
                    <div 
                      key={d.id}
                      onClick={() => setWizardDifficulty(d.id)}
                      className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                        wizardDifficulty === d.id 
                          ? 'border-indigo-500 bg-indigo-950/30' 
                          : `border-white/5 bg-slate-900/40 ${d.color}`
                      }`}
                    >
                      <h4 className="text-sm font-bold text-slate-200">{d.id}</h4>
                      <p className="text-xs text-slate-400 mt-1">{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Interview Length</label>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { id: 3, label: '3 Questions', desc: 'Short practice' },
                    { id: 5, label: '5 Questions', desc: 'Standard set' },
                    { id: 10, label: '10 Questions', desc: 'Deep dive' },
                    { id: -1, label: 'Endless Mode', desc: 'Infinite loop' }
                  ].map(l => (
                    <div 
                      key={l.id}
                      onClick={() => setWizardLength(l.id)}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        wizardLength === l.id 
                          ? 'border-indigo-500 bg-indigo-950/30' 
                          : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/40'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-200">{l.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{l.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-indigo-600/30 cursor-pointer active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" /> Generate & Start Interview
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: CHAT ROOM */}
        {view === 'chat' && activeSession && (
          <div className="max-w-4xl mx-auto rounded-2xl glass-card flex flex-col h-[75vh] relative overflow-hidden border border-white/10 shadow-2xl animate-fadeIn">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Interview Active
                </span>
                <h3 className="text-md font-bold text-slate-200 mt-0.5">
                  {getTypeBadge(activeSession.type)} Interview &middot; {activeSession.role}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/20 bg-indigo-950/40 text-indigo-300">
                  {activeSession.questionsCount === -1 
                    ? `Question ${currentQuestionIndex + 1}`
                    : `Question ${Math.min(currentQuestionIndex + 1, activeSession.questions.length)} of ${activeSession.questions.length}`
                  }
                </span>
              </div>
            </div>

            {/* Chat Timeline Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20">
              {/* Introduction prompt */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-650 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 max-w-[80%]">
                  <p className="text-sm text-slate-200">
                    Welcome to your mock interview! I am your AI interviewer. I've tailored a custom question set matching the target role of <strong>{activeSession.role}</strong> ({activeSession.difficulty} level).
                  </p>
                  <p className="text-sm text-slate-200 mt-2">
                    Let's begin. Here is your first question:
                  </p>
                </div>
              </div>

              {/* Display questions up to the current index */}
              {activeSession.questions.slice(0, currentQuestionIndex + 1).map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = q.userAnswer !== null;

                return (
                  <div key={q.id} className="space-y-6">
                    {/* AI Question */}
                    <div className="flex items-start gap-4 animate-fadeIn">
                      <div className="w-8 h-8 rounded-full bg-indigo-650 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                      <div className="p-4 rounded-2xl bg-indigo-950/35 border border-indigo-500/10 max-w-[80%]">
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded uppercase border border-indigo-900/30">
                          {q.topic}
                        </span>
                        <p className="text-sm font-semibold text-slate-100 mt-2 leading-relaxed">{q.text}</p>
                      </div>
                    </div>

                    {/* Candidate's Answer (if submitted) */}
                    {isAnswered && (
                      <div className="flex items-start gap-4 justify-end animate-fadeIn">
                        <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 max-w-[80%] text-slate-200 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                          {q.userAnswer}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-850 border border-indigo-500/30 flex items-center justify-center text-slate-200 text-xs font-bold shrink-0 uppercase">ME</div>
                      </div>
                    )}

                    {/* AI transition state after submitting but waiting for evaluation */}
                    {isCurrent && isWaitingForEvaluation && (
                      <div className="flex items-start gap-4 animate-fadeIn">
                        <div className="w-8 h-8 rounded-full bg-indigo-650 flex items-center justify-center text-white text-xs font-bold shrink-0 animate-pulse">AI</div>
                        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 max-w-[80%] flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-xs text-slate-400 font-semibold animate-pulse">Evaluating response & generating feedback...</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Dock */}
            <div className="p-4 border-t border-white/5 bg-slate-900/40">
              {!isWaitingForEvaluation ? (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      placeholder="Type your detailed response here..."
                      className="w-full min-h-[90px] max-h-[180px] p-4 pr-12 rounded-xl glass-input text-sm resize-y leading-relaxed"
                      disabled={isSubmittingAnswer}
                      onKeyDown={(e) => {
                        // Enter alone sends, Shift+Enter inserts newline
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitCurrentAnswer();
                        }
                      }}
                    />
                    <button
                      onClick={submitCurrentAnswer}
                      disabled={isSubmittingAnswer || !userAnswer.trim()}
                      className="absolute bottom-4 right-4 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/20 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <div className="flex items-center gap-4">
                      <span>Press Enter to submit, Shift + Enter for new line.</span>
                      {activeSession.questionsCount === -1 && (
                        <button
                          onClick={endInterviewManually}
                          className="px-3 py-1 bg-red-950/40 hover:bg-red-600/30 text-red-200 hover:text-white rounded-lg border border-red-500/20 font-semibold transition-all cursor-pointer active:scale-95 animate-fadeIn"
                        >
                          🔴 End Interview
                        </button>
                      )}
                    </div>
                    <span>Aim for structured explanation (e.g. STAR method for behavioral).</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-indigo-300 font-semibold bg-indigo-950/20 rounded-xl border border-indigo-900/30 flex items-center justify-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-t-indigo-400 border-indigo-900/30 rounded-full animate-spin"></div>
                  Analyzing response details. Please wait...
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: FEEDBACK REPORT */}
        {view === 'feedback' && selectedCompletedSession && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            
            {/* Top Info Bar */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setView('dashboard')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white font-semibold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
              
              <span className="px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Evaluation Completed
              </span>
            </div>

            {/* Score & Profile Header Card */}
            <div className="rounded-2xl glass-card p-8 border-t-2 border-t-emerald-500 relative overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              <div className="md:col-span-2 space-y-3">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Session Summary Report</span>
                <h1 className="text-3xl font-extrabold text-slate-200">
                  {selectedCompletedSession.role}
                </h1>
                <p className="text-sm text-slate-400">
                  Type: <strong>{getTypeBadge(selectedCompletedSession.type)}</strong> &middot; Difficulty: <strong>{selectedCompletedSession.difficulty}</strong>
                </p>
                <div className="flex gap-4 pt-3 text-xs text-slate-400">
                  <span>Started: {new Date(selectedCompletedSession.startedAt).toLocaleDateString()}</span>
                  {selectedCompletedSession.endedAt && (
                    <span>Duration: {Math.max(1, Math.round((new Date(selectedCompletedSession.endedAt).getTime() - new Date(selectedCompletedSession.startedAt).getTime()) / 60000))} min</span>
                  )}
                </div>
              </div>

              {/* Circular Score Gauge */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Background Circle */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="64" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="72" cy="72" r="64" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * (selectedCompletedSession.overallScore || 0)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-4xl font-black text-slate-200">{selectedCompletedSession.overallScore || '—'}</span>
                    <span className="text-xs block text-slate-400 font-semibold mt-0.5">OVERALL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aggregate strengths/weaknesses (derived from individual questions if available) */}
            {/* Accordion Questions List */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-300">Question-by-Question Analysis</h2>
              
              {selectedCompletedSession.questions.map((q, idx) => {
                const feedback = parseAiFeedback(q.aiFeedback);
                const isExpanded = expandedQuestionId === q.id;

                return (
                  <div key={q.id} className="rounded-xl glass-card overflow-hidden border border-white/5 shadow-md">
                    {/* Accordion Header */}
                    <div 
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-800/10 transition-all select-none"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Question {idx + 1} &middot; {q.topic}</span>
                        <h3 className="text-sm font-semibold text-slate-200">{q.text}</h3>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {q.score !== null && q.score !== undefined ? (
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${
                            q.score >= 80 ? 'text-green-400 border-green-500/20 bg-green-950/20' :
                            q.score >= 60 ? 'text-yellow-400 border-yellow-500/20 bg-yellow-950/20' :
                            'text-red-400 border-red-500/20 bg-red-950/20'
                          }`}>
                            Score: {q.score}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not Graded</span>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-slate-950/30 p-6 space-y-6 animate-fadeIn">
                        
                        {/* Candidate Answer */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Your Submitted Answer</h4>
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {q.userAnswer || <em className="text-slate-500">No answer submitted</em>}
                          </div>
                        </div>

                        {/* AI Feedback Analysis */}
                        {feedback ? (
                          <div className="space-y-6">
                            {/* Score Matrix Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Correctness
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">{feedback.correctness}</p>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-violet-500"></span> Clarity & Explanations
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">{feedback.clarity}</p>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Structure (STAR Method)
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">{feedback.structure}</p>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Communication Quality
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">{feedback.communication}</p>
                              </div>
                            </div>

                            {/* Strengths / Weaknesses Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <h5 className="text-xs font-bold text-green-400 uppercase tracking-wide flex items-center gap-1">
                                  <Check className="w-4 h-4" /> Key Strengths
                                </h5>
                                <ul className="space-y-1.5">
                                  {feedback.strengths.map((str, sIdx) => (
                                    <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5"></span>
                                      <span>{str}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h5 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1">
                                  <X className="w-4 h-4" /> Weaknesses & Gaps
                                </h5>
                                <ul className="space-y-1.5">
                                  {feedback.weaknesses.map((weak, wIdx) => (
                                    <li key={wIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
                                      <span>{weak}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Suggested Improvements */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> Actionable Improvements
                              </h4>
                              <p className="text-xs text-slate-300 leading-relaxed bg-amber-950/20 border border-amber-900/35 p-4 rounded-xl">
                                {feedback.suggestedImprovements}
                              </p>
                            </div>

                            {/* Model Answer comparison */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Model Answer Comparison</h4>
                              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 leading-relaxed italic whitespace-pre-wrap">
                                {feedback.modelAnswer}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-xl bg-slate-900/30 border border-white/5 text-center text-xs text-slate-500 animate-pulse">
                            AI is still evaluating this question response in the background. Refresh in a moment...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Back Button CTA */}
            <div className="text-center pt-4">
              <button 
                onClick={() => setView('dashboard')}
                className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer text-sm"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </main>



      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Prepped.AI. Powered by Google Gemini. All rights reserved.
      </footer>
    </div>
  );
}
