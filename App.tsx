
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Server, 
  FileText, 
  Sparkles, 
  Search, 
  Bell, 
  User, 
  Activity,
  Globe,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  Wifi,
  WifiOff,
  Edit2,
  Bot
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { View, UpstreamServer, DNSRequest, StatItem } from './types';
import { analyzeConfig, explainRule, askAiWithContext } from './services/geminiService';
import { api, setApiUrl, getApiUrl, setInstanceName, getInstanceName } from './services/api';

// --- Components ---

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard: React.FC<StatItem & { icon: React.ReactNode }> = ({ label, value, change, trend, icon }) => (
  <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:border-blue-500/50 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-900 rounded-lg text-blue-400">
        {icon}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
        trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 
        trend === 'down' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'
      }`}>
        {change}
      </span>
    </div>
    <div className="space-y-1">
      <p className="text-slate-400 text-sm">{label}</p>
      <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
    </div>
  </div>
);

const ConnectionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (url: string, name: string) => void }> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState(getApiUrl());
  const [name, setName] = useState(getInstanceName());

  useEffect(() => {
    if (isOpen) {
      setUrl(getApiUrl());
      setName(getInstanceName());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold mb-2">Connect to MosDNS API</h3>
        <p className="text-slate-400 text-sm mb-6">Enter the URL of your MosDNS Admin API endpoint. You can also name this instance to easily identify it.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Instance Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-700"
              placeholder="e.g., Home Router, Office Server"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Endpoint URL</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-700"
              placeholder="http://localhost:5335"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={() => { onSave(url, name); onClose(); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20">
              Save Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  
  // Data State
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [topDomains, setTopDomains] = useState<any[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamServer[]>([]);
  const [logs, setLogs] = useState<DNSRequest[]>([]);
  const [configYaml, setConfigYaml] = useState("");
  
  // UI State
  const [isRealConnection, setIsRealConnection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [currentInstanceName, setCurrentInstanceName] = useState(getInstanceName());
  
  // AI & Search
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your MosDNS expert. I have access to your current logs and status. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Data Logic
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    const s = await api.getStats();
    setStats(s.data);
    setIsRealConnection(s.isReal);

    if (activeView === View.DASHBOARD) {
      const h = await api.getHistory();
      const d = await api.getTopDomains();
      setHistory(h.data);
      setTopDomains(d.data);
    }
    
    if (activeView === View.UPSTREAMS) {
      const u = await api.getUpstreams();
      setUpstreams(u.data);
    }
    
    if (activeView === View.LOGS || activeView === View.AI_ASSISTANT) {
      const l = await api.getLogs();
      setLogs(l.data);
    }
    
    if (activeView === View.CONFIG && !configYaml) {
      const c = await api.getConfig();
      setConfigYaml(c.data.yaml);
    }

    setIsLoading(false);
  }, [activeView, configYaml]);

  // Initial Load & Auto-refresh
  useEffect(() => {
    fetchData();
    let interval: number;
    if ([View.DASHBOARD, View.LOGS, View.AI_ASSISTANT].includes(activeView)) {
       interval = window.setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [fetchData, activeView]);

  useEffect(() => {
    if (activeView === View.AI_ASSISTANT) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeView]);

  const handleUpdateApiUrl = (url: string, name: string) => {
    setApiUrl(url);
    setInstanceName(name);
    setCurrentInstanceName(name);
    fetchData();
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeConfig(configYaml);
    setAiAnalysis(result || "No issues found.");
    setIsAnalyzing(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    const contextData = {
      systemStats: stats,
      recentLogs: logs.slice(0, 10),
      view: activeView
    };

    const answer = await askAiWithContext(userMsg, contextData);
    
    setChatMessages(prev => [...prev, { role: 'assistant', content: answer || "Sorry, I couldn't get an answer." }]);
    setIsChatting(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <ConnectionModal 
        isOpen={showConnectionModal} 
        onClose={() => setShowConnectionModal(false)} 
        onSave={handleUpdateApiUrl} 
      />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col space-y-8">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Globe className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            MosDNS
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeView === View.DASHBOARD} 
            onClick={() => setActiveView(View.DASHBOARD)}
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Config Editor" 
            active={activeView === View.CONFIG} 
            onClick={() => setActiveView(View.CONFIG)}
          />
          <SidebarItem 
            icon={<Server size={20} />} 
            label="Upstreams" 
            active={activeView === View.UPSTREAMS} 
            onClick={() => setActiveView(View.UPSTREAMS)}
          />
          <SidebarItem 
            icon={<FileText size={20} />} 
            label="Query Logs" 
            active={activeView === View.LOGS} 
            onClick={() => setActiveView(View.LOGS)}
          />
          <SidebarItem 
            icon={<Sparkles size={20} />} 
            label="AI Assistant" 
            active={activeView === View.AI_ASSISTANT} 
            onClick={() => setActiveView(View.AI_ASSISTANT)}
          />
        </nav>

        {/* System Status / Connection Info */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 group relative">
           <button 
             onClick={() => setShowConnectionModal(true)} 
             className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-white bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
             title="Edit Connection"
           >
             <Edit2 size={12} />
           </button>

          <div className="flex items-center space-x-3 mb-3">
            {isRealConnection ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : (
              <WifiOff size={16} className="text-amber-500" />
            )}
            <span className={`text-xs font-semibold uppercase tracking-wider ${isRealConnection ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isRealConnection ? 'Online' : 'Demo Mode'}
            </span>
          </div>
          <div className="space-y-2">
             <div className="flex justify-between text-xs items-center">
              <span className="text-slate-500">Instance</span>
              <span className="text-slate-200 font-medium max-w-[100px] truncate" title={currentInstanceName}>{currentInstanceName}</span>
            </div>
             <div className="flex justify-between text-xs items-center">
              <span className="text-slate-500">Host</span>
              <span className="text-slate-400 max-w-[100px] truncate" title={getApiUrl()}>{getApiUrl().replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Version</span>
              <span className="text-slate-300">v5.3.1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search domains, clients, or logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="flex items-center space-x-6">
             {isLoading && (
              <div className="flex items-center space-x-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}

            <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950" />
            </button>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold group-hover:text-blue-400 transition-colors">Admin User</p>
                <p className="text-xs text-slate-500">{currentInstanceName}</p>
              </div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
          {activeView === View.DASHBOARD && stats && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Queries (24h)" 
                  value={stats.totalQueries.toLocaleString()} 
                  change="+12.5%" 
                  trend="up" 
                  icon={<Activity size={24} />} 
                />
                <StatCard 
                  label="Avg Latency" 
                  value={`${stats.avgLatency}ms`} 
                  change="-4ms" 
                  trend="up" 
                  icon={<Zap size={24} />} 
                />
                <StatCard 
                  label="Cache Hit Rate" 
                  value={`${stats.cacheHitRate}%`} 
                  change="+2.1%" 
                  trend="up" 
                  icon={<ShieldCheck size={24} />} 
                />
                <StatCard 
                  label="Active Clients" 
                  value={stats.activeClients} 
                  change="0%" 
                  trend="neutral" 
                  icon={<User size={24} />} 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-slate-800/30 border border-slate-800 p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold">Traffic Overview</h3>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs outline-none">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                        <Area type="monotone" dataKey="queries" stroke="#3b82f6" fillOpacity={1} fill="url(#colorQueries)" strokeWidth={2} />
                        <Area type="monotone" dataKey="cacheHits" stroke="#10b981" fillOpacity={1} fill="url(#colorHits)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Domains */}
                <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6">Top Domains</h3>
                  <div className="space-y-5">
                    {topDomains.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300 font-medium truncate max-w-[150px]">{item.domain}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === View.CONFIG && (
            <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Config Editor</h2>
                  <p className="text-slate-400">Modify your MosDNS configuration YAML</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    <span>AI Review</span>
                  </button>
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-all font-semibold">
                    Apply Changes
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col min-h-0">
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">config.yaml</span>
                    <span className="text-xs text-slate-600">YAML Format</span>
                  </div>
                  <textarea 
                    value={configYaml}
                    onChange={(e) => setConfigYaml(e.target.value)}
                    className="flex-1 p-6 bg-transparent text-slate-300 mono text-sm resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </div>

                <div className="bg-slate-800/20 border border-slate-800 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center space-x-2 mb-4 text-indigo-400">
                    <Sparkles size={20} />
                    <h3 className="font-bold">AI Analysis Result</h3>
                  </div>
                  {isAnalyzing ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                      <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                      <p>Scanning configuration for optimizations...</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="prose prose-invert prose-sm max-w-none overflow-y-auto">
                      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50">
                        {aiAnalysis.split('\n').map((line, i) => (
                          <p key={i} className="mb-2 last:mb-0 leading-relaxed text-slate-300">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-12 text-slate-500 space-y-4">
                      <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                        <ShieldCheck className="w-8 h-8 opacity-20" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Ready for Analysis</p>
                        <p className="text-sm">Click "AI Review" to get expert feedback on your configuration.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === View.UPSTREAMS && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Upstream Servers</h2>
                  <p className="text-slate-400">Manage and monitor your DNS forwarders</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all">
                  + Add Upstream
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upstreams.map((server) => (
                  <div key={server.id} className="bg-slate-800/30 border border-slate-800 p-6 rounded-2xl hover:border-slate-600 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${
                          server.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 
                          server.status === 'degraded' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          <Server size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{server.name}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{server.protocol}</span>
                            <span className="text-xs text-slate-500">{server.address}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                          server.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          server.status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            server.status === 'online' ? 'bg-emerald-500' : 
                            server.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span className="uppercase">{server.status}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Latency</p>
                        <p className="text-lg font-bold text-slate-200">{server.latency}ms</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Total Requests</p>
                        <p className="text-lg font-bold text-slate-200">{(server.requests / 1000).toFixed(1)}k</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === View.LOGS && (
            <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Query History</h2>
                  <p className="text-slate-400">Real-time log of DNS traffic</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-2 text-xs font-medium text-emerald-500">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Live Streaming</span>
                  </span>
                  <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all text-sm">
                    Clear Logs
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Timestamp</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Domain</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Client</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {logs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="px-6 py-4 text-sm text-slate-400 mono">{log.timestamp.split(' ')[1]}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-200">{log.domain}</td>
                          <td className="px-6 py-4 text-xs"><span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded font-bold">{log.type}</span></td>
                          <td className="px-6 py-4 text-sm text-slate-400">{log.client}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                              log.status === 'NOERROR' ? 'bg-emerald-500/10 text-emerald-400' : 
                              log.status === 'NXDOMAIN' ? 'bg-slate-500/10 text-slate-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {log.status === 'NOERROR' ? <CheckCircle2 size={12} /> : 
                               log.status === 'NXDOMAIN' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-300 group-hover:text-blue-400">{log.latency}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-center">
                  <button className="text-xs text-slate-500 hover:text-slate-300 flex items-center space-x-2">
                    <span>Load more history</span>
                    <Activity size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === View.AI_ASSISTANT && (
            <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2 py-8">
                <div className="inline-flex p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4">
                  <Bot className="text-white w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
                <p className="text-slate-400 max-w-lg mx-auto">Ask questions about your configuration, troubleshoot rules, or get advice on DNS security best practices.</p>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex space-x-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Bot size={16} className="text-indigo-400" />
                        </div>
                      )}
                      <div className={`${
                        msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 border border-slate-700 text-slate-300'
                      } p-4 rounded-2xl max-w-[80%]`}>
                         {msg.role === 'assistant' ? (
                           <div className="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                         ) : (
                           <p className="text-sm">{msg.content}</p>
                         )}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex space-x-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Bot size={16} className="text-indigo-400" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <Loader2 className="animate-spin w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                  <form onSubmit={handleChatSubmit} className="relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your question..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      disabled={isChatting}
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim() || isChatting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
