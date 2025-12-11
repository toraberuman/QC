import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { getSettings, saveSettings } from '../services/dataService';
import { X, Save, AlertCircle, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';

// Declare Google Identity Services global
declare global {
  interface Window {
    google: any;
  }
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<AppSettings>({ sheetId: '', googleAccessToken: '', googleClientId: '' });
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
    }
  }, [isOpen]);

  // Initialize Google Token Client when Client ID is available
  useEffect(() => {
    if (window.google && settings.googleClientId) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: settings.googleClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setSettings(prev => ({ ...prev, googleAccessToken: tokenResponse.access_token }));
            }
            setIsAuthorizing(false);
          },
        });
        setTokenClient(client);
      } catch (e) {
        console.error("Error initializing Google Token Client", e);
      }
    }
  }, [settings.googleClientId, isOpen]);

  const handleAuthClick = () => {
    if (tokenClient) {
      setIsAuthorizing(true);
      // Request access token. 
      // prompt: '' allows immediate refresh if already consented, 
      // prompt: 'consent' forces the consent screen.
      tokenClient.requestAccessToken({ prompt: '' }); 
    } else {
      alert("請先輸入有效的 Client ID");
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-green-600 text-white p-1 rounded">
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14h-2v-4h2v4zm0-6h-2v-2h2v2zm6 6h-2v-4h2v4zm0-6h-2v-2h2v2z"/></svg>
            </span>
            Google 試算表整合
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>
              為了讀寫您的私人試算表，請進行授權。您可以選擇手動輸入 Token 或使用 OAuth Client ID 自動登入。
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">試算表 ID (Spreadsheet ID)</label>
            <input
              type="text"
              value={settings.sheetId}
              onChange={(e) => setSettings({ ...settings, sheetId: e.target.value })}
              className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-mono bg-white text-gray-900"
              placeholder="例如：1z8dRzmp..."
            />
            <p className="text-xs text-gray-400">試算表網址中的 ID 部分。</p>
          </div>

          <hr className="border-gray-100" />

          {/* OAuth Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">自動授權 (推薦)</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">OAuth Client ID</label>
              <input
                type="text"
                value={settings.googleClientId || ''}
                onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-mono bg-white text-gray-900"
                placeholder="例如：123456-abcde.apps.googleusercontent.com"
              />
              <p className="text-[10px] text-gray-400">
                請在 Google Cloud Console 建立 OAuth 2.0 Client ID (Web Application)。
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAuthClick}
                disabled={!settings.googleClientId || isAuthorizing}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-all flex items-center justify-center gap-2 ${
                  settings.googleAccessToken 
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${(!settings.googleClientId) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                 {settings.googleAccessToken ? (
                   <>
                    <CheckCircle className="w-4 h-4" />
                    已取得授權 (更新)
                   </>
                 ) : (
                   <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                    {isAuthorizing ? '授權中...' : '使用 Google 帳號登入'}
                   </>
                 )}
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">或手動輸入</span>
              <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Manual Token Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Access Token (手動)</label>
            <div className="relative">
              <input
                type="password"
                value={settings.googleAccessToken}
                onChange={(e) => setSettings({ ...settings, googleAccessToken: e.target.value })}
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-mono pr-10 bg-white text-gray-900"
                placeholder="ya29.a0..."
              />
              {settings.googleAccessToken && (
                <div className="absolute right-3 top-2.5 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
};