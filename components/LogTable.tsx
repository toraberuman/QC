import React, { useState, useMemo } from 'react';
import { QCLog, QCStatus } from '../types';
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface LogTableProps {
  logs: QCLog[];
}

type SortKey = keyof QCLog | 'status';
type SortDirection = 'asc' | 'desc';

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'checkDate', direction: 'desc' });

  // Filtering and Sorting
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.productName.toLowerCase().includes(lowerTerm) ||
        log.productId.toLowerCase().includes(lowerTerm) ||
        log.inspector.toLowerCase().includes(lowerTerm) ||
        log.notes.toLowerCase().includes(lowerTerm) ||
        (log.shippingOrderNo && log.shippingOrderNo.toLowerCase().includes(lowerTerm)) ||
        log.checkDate.includes(lowerTerm)
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) return 0;
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [logs, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (current && current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const downloadCSV = () => {
    // CSV Header
    const headers = ["ID", "Check Date", "Shipping Order No", "Product ID", "Product Name", "Inspector", "Status", "Notes", "AI Analysis"];
    
    // Map rows
    const rows = processedLogs.map(log => [
      log.id,
      log.checkDate,
      log.shippingOrderNo || '',
      log.productId,
      `"${log.productName.replace(/"/g, '""')}"`, // Escape quotes
      log.inspector,
      log.status,
      `"${log.notes.replace(/"/g, '""')}"`,
      `"${(log.aiAnalysis || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `qc_logs_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: QCStatus) => {
    switch (status) {
      case QCStatus.PASS:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">合格 (PASS)</span>;
      case QCStatus.FAIL:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">不合格 (FAIL)</span>;
      case QCStatus.WARNING:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">警告 (WARNING)</span>;
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-30 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600 ml-1" /> 
      : <ArrowDown className="w-3 h-3 text-indigo-600 ml-1" />;
  };

  const HeaderCell = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
    <th 
      scope="col" 
      onClick={() => handleSort(sortKey)}
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors select-none group ${className}`}
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={sortKey} />
      </div>
    </th>
  );

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">找不到紀錄</h3>
        <p className="mt-1 text-gray-500">請開始新增第一筆檢驗。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out text-gray-900"
            placeholder="搜尋單號、商品、人員或備註..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={downloadCSV}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors bg-white px-3 py-2 rounded-md border border-gray-200 shadow-sm"
        >
          <Download className="w-4 h-4" />
          匯出 CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <HeaderCell label="日期" sortKey="checkDate" />
              <HeaderCell label="出貨單號" sortKey="shippingOrderNo" />
              <HeaderCell label="商品" sortKey="productName" />
              <HeaderCell label="檢驗員" sortKey="inspector" />
              <HeaderCell label="狀態" sortKey="status" />
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                備註 / AI 分析
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {log.checkDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-mono">
                  {log.shippingOrderNo || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{log.productName}</span>
                    <span className="text-xs text-gray-500">{log.productId}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {log.inspector}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(log.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <p className="line-clamp-2">{log.notes}</p>
                  {log.aiAnalysis && (
                     <p className="mt-1 text-xs text-indigo-600 font-medium flex items-center gap-1">
                       <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                       {log.aiAnalysis}
                     </p>
                  )}
                </td>
              </tr>
            ))}
            {processedLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  沒有符合搜尋條件的資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};