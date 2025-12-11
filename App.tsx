import React, { useState, useEffect } from 'react';
import { getProducts, getQCLogs, saveQCLog, getSettings, getInspectors } from './services/dataService';
import { Product, QCLog, QCStatus, Inspector } from './types';
import { QCForm } from './components/QCForm';
import { LogTable } from './components/LogTable';
import { StatsCard } from './components/StatsCard';
import { SettingsModal } from './components/SettingsModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ClipboardList, LayoutDashboard, PlusCircle, CheckCircle2, XCircle, AlertTriangle, Settings, RefreshCw } from 'lucide-react';

enum View {
  DASHBOARD = 'DASHBOARD',
  NEW_ENTRY = 'NEW_ENTRY',
  LOGS = 'LOGS'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [logs, setLogs] = useState<QCLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedProducts, loadedInspectors, loadedLogs] = await Promise.all([
        getProducts(),
        getInspectors(),
        getQCLogs()
      ]);
      setProducts(loadedProducts);
      setInspectors(loadedInspectors);
      setLogs(loadedLogs);
      
      const settings = getSettings();
      setIsConnected(!!settings.googleAccessToken);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLog = async (logData: Omit<QCLog, 'id' | 'timestamp'>) => {
    const newLog = await saveQCLog(logData);
    setLogs(prev => [newLog, ...prev]);
    setCurrentView(View.LOGS);
  };

  // Stats Calculation
  const stats = {
    total: logs.length,
    pass: logs.filter(l => l.status === QCStatus.PASS).length,
    fail: logs.filter(l => l.status === QCStatus.FAIL).length,
    warning: logs.filter(l => l.status === QCStatus.WARNING).length,
  };

  const chartData = [
    { name: '合格', value: stats.pass, color: '#22c55e' },
    { name: '警告', value: stats.warning, color: '#eab308' },
    { name: '不合格', value: stats.fail, color: '#ef4444' },
  ];

  if (loading && logs.length === 0 && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">系統載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => loadData()}
      />

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">QualityGuard 智慧品管</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 hidden sm:block">智慧化商品檢驗日誌</p>
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      已連結試算表
                    </span>
                  ) : (
                     <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                      本地模式
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <NavButton 
                active={currentView === View.DASHBOARD} 
                onClick={() => setCurrentView(View.DASHBOARD)}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="儀表板"
              />
              <NavButton 
                active={currentView === View.LOGS} 
                onClick={() => setCurrentView(View.LOGS)}
                icon={<ClipboardList className="w-4 h-4" />}
                label="檢驗紀錄"
              />
              <button 
                onClick={() => setCurrentView(View.NEW_ENTRY)}
                className="ml-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">新增檢驗</span>
              </button>
              
              <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
              
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-all"
                title="Google 試算表設定"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentView === View.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard 
                title="檢驗合格" 
                value={stats.pass} 
                icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
                colorClass="bg-green-100"
                trend={`合格率 ${Math.round((stats.pass / (stats.total || 1)) * 100)}%`}
              />
              <StatsCard 
                title="警告" 
                value={stats.warning} 
                icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />}
                colorClass="bg-yellow-100"
              />
              <StatsCard 
                title="檢驗不合格" 
                value={stats.fail} 
                icon={<XCircle className="w-6 h-6 text-red-600" />}
                colorClass="bg-red-100"
              />
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">檢驗結果總覽</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{fill: '#6b7280'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: 'transparent'}}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">近期活動</h3>
                  <button onClick={loadData} className="text-gray-400 hover:text-indigo-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        log.status === QCStatus.PASS ? 'bg-green-500' : 
                        log.status === QCStatus.FAIL ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.productName}</p>
                        <p className="text-xs text-gray-500">{log.checkDate} • {log.inspector}</p>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && <p className="text-sm text-gray-400 italic">尚無活動。</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === View.NEW_ENTRY && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">新增品質檢驗</h2>
              <p className="text-gray-500 mt-1">從商品來源試算表選擇商品，並記錄檢驗結果。</p>
              {!isConnected && (
                <div className="mt-2 text-xs bg-yellow-50 text-yellow-700 px-3 py-2 rounded-md border border-yellow-200 inline-block">
                  注意：目前使用範例商品資料。請在設定中連結 Google 試算表以使用真實資料。
                </div>
              )}
            </div>
            <QCForm products={products} inspectors={inspectors} onSubmit={handleCreateLog} />
          </div>
        )}

        {currentView === View.LOGS && (
          <div className="animate-in fade-in duration-500">
             <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">檢驗歷史紀錄</h2>
                <p className="text-gray-500 mt-1">所有品質檢驗的完整歷程。</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 shadow-sm">
                總筆數： <span className="font-semibold text-gray-900">{logs.length}</span>
              </div>
            </div>
            <LogTable logs={logs} />
          </div>
        )}

      </main>
    </div>
  );
};

// Helper Component for Nav
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active 
        ? 'bg-indigo-50 text-indigo-700' 
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

export default App;