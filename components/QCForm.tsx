import React, { useState, useEffect } from 'react';
import { Product, QCStatus, QCLog, Inspector } from '../types';
import { analyzeQCNotes } from '../services/geminiService';
import { Loader2, Sparkles, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface QCFormProps {
  products: Product[];
  inspectors: Inspector[];
  onSubmit: (log: Omit<QCLog, 'id' | 'timestamp'>) => Promise<void>;
}

export const QCForm: React.FC<QCFormProps> = ({ products, inspectors, onSubmit }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [shippingOrderNo, setShippingOrderNo] = useState('');
  const [inspector, setInspector] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<QCStatus>(QCStatus.PASS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ summary: string; category: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill product name when ID changes
  useEffect(() => {
    const product = products.find(p => p.id === selectedProductId);
    setProductName(product ? product.name : '');
  }, [selectedProductId, products]);

  const handleAIAnalyze = async () => {
    if (!notes.trim() || !productName) return;
    
    setIsAnalyzing(true);
    setAiSuggestion(null);
    
    const result = await analyzeQCNotes(notes, productName);
    
    setIsAnalyzing(false);
    if (result) {
      setStatus(result.suggestedStatus);
      setAiSuggestion({
        summary: result.summary,
        category: result.categoryTag
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        productId: selectedProductId,
        productName,
        shippingOrderNo,
        checkDate,
        inspector,
        notes,
        status,
        aiAnalysis: aiSuggestion ? `${aiSuggestion.category}: ${aiSuggestion.summary}` : undefined
      });
      
      // Reset form
      setNotes('');
      setAiSuggestion(null);
      setStatus(QCStatus.PASS);
      setShippingOrderNo('');
      // Keep inspector and date for convenience
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-indigo-600 px-6 py-4">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <span className="bg-white/20 p-1.5 rounded-md">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
          </span>
          新增檢驗項目
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Order No */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">出貨單號</label>
            <input
              type="text"
              required
              value={shippingOrderNo}
              onChange={(e) => setShippingOrderNo(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
              placeholder="例如：SO-20231001-01"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">檢驗日期</label>
            <input
              type="date"
              required
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
            />
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">商品 ID (來源)</label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 transition-colors bg-white text-gray-900"
            >
              <option value="">請選擇商品 ID...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-filled Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">商品名稱</label>
            <input
              type="text"
              readOnly
              value={productName}
              placeholder="自動從來源帶入"
              className="w-full rounded-lg border-gray-300 border bg-white text-gray-900 px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Inspector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">檢驗人員</label>
            <select
              required
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-4 py-2.5 focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
            >
              <option value="">請選擇檢驗人員...</option>
              {inspectors.map(i => (
                <option key={i.id} value={i.name}>
                  {i.name} ({i.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes & AI Analysis */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">檢驗備註</label>
            <button
              type="button"
              onClick={handleAIAnalyze}
              disabled={isAnalyzing || !notes || !selectedProductId}
              className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full border transition-all ${
                isAnalyzing || !notes 
                  ? 'bg-gray-100 text-gray-400 border-gray-200' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI 分析
            </button>
          </div>
          <textarea
            required
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border-gray-300 border px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm resize-none bg-white text-gray-900"
            placeholder="請描述商品狀況..."
          />
          {aiSuggestion && (
            <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm flex gap-3 animate-in fade-in slide-in-from-top-2">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-indigo-900">AI 洞察：</p>
                <p className="text-indigo-800">
                  偵測到 <span className="font-semibold">{aiSuggestion.category}</span> 問題。 
                  摘要：「{aiSuggestion.summary}」
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">檢驗結果狀態</label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { val: QCStatus.PASS, icon: CheckCircle, color: 'green', label: '合格 (Pass)' },
              { val: QCStatus.WARNING, icon: AlertCircle, color: 'yellow', label: '警告 (Warning)' },
              { val: QCStatus.FAIL, icon: XCircle, color: 'red', label: '不合格 (Fail)' }
            ].map((option) => (
              <label
                key={option.val}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  status === option.val
                    ? `border-${option.color}-500 bg-${option.color}-50 ring-1 ring-${option.color}-500`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-white bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.val}
                  checked={status === option.val}
                  onChange={() => setStatus(option.val)}
                  className="sr-only"
                />
                <option.icon className={`w-6 h-6 mb-2 ${status === option.val ? `text-${option.color}-600` : 'text-gray-400'}`} />
                <span className={`font-medium ${status === option.val ? `text-${option.color}-700` : 'text-gray-600'}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? '儲存中...' : '儲存檢驗紀錄'}
          </button>
        </div>
      </form>
    </div>
  );
};