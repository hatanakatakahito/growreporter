'use client';

import React, { useState } from 'react';
import { VendorRequestGenerator } from '@/lib/improvements/requestGenerator';
import { UserImprovement } from '@/lib/improvements/types';

interface VendorRequestModalProps {
  suggestion: any; // AI提案
  siteInfo: any;
  onClose: () => void;
}

export default function VendorRequestModal({ suggestion, siteInfo, onClose }: VendorRequestModalProps) {
  const [selectedActions, setSelectedActions] = useState<string[]>(suggestion.actions || []);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [requestDocument, setRequestDocument] = useState('');
  const [generated, setGenerated] = useState(false);
  
  const handleGenerate = () => {
    // UserImprovement形式に変換
    const improvement: any = {
      title: suggestion.title,
      issueType: 'kpi_not_achieved', // TODO: 適切な値を設定
      expectedEffect: suggestion.expectedEffect,
      estimatedCost: suggestion.estimatedCost,
      scheduledDate: null
    };
    
    const document = VendorRequestGenerator.generate({
      improvement,
      siteInfo,
      selectedActions,
      additionalNotes
    });
    
    setRequestDocument(document);
    setGenerated(true);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(requestDocument);
    alert('依頼書をクリップボードにコピーしました');
  };
  
  const handleDownload = () => {
    const blob = new Blob([requestDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `依頼書_${suggestion.title}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const toggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      setSelectedActions(selectedActions.filter(a => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-lg bg-white p-6 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              業者依頼書を作成
            </h3>
            <p className="mt-1 text-sm text-body-color">
              {suggestion.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-body-color hover:text-dark dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {!generated ? (
          <>
            {/* 実施内容の選択 */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-medium text-dark dark:text-white">
                実施内容を選択
              </h4>
              <div className="space-y-2">
                {suggestion.actions.map((action: string, index: number) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 cursor-pointer rounded-md border border-stroke p-3 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActions.includes(action)}
                      onChange={() => toggleAction(action)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-dark dark:text-white">
                      {action}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* 補足事項 */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                補足事項（任意）
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="特別な要望や注意事項があれば記入してください..."
                className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark placeholder-body-color focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                rows={4}
              />
            </div>
            
            {/* アクション */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedActions.length === 0}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                依頼書を生成
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 依頼書プレビュー */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-medium text-dark dark:text-white">
                依頼書プレビュー
              </h4>
              <div className="rounded-md border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-gray-900">
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-xs text-dark dark:text-white">
                  {requestDocument}
                </pre>
              </div>
            </div>
            
            {/* アクション */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                閉じる
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                コピー
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                ダウンロード
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

