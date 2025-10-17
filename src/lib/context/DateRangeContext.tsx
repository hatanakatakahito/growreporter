'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DateRangeContextType {
  startDate: string;
  endDate: string;
  dateRangeType: string;
  setDateRange: (start: string, end: string, type: string) => void;
  customStartDate: string;
  customEndDate: string;
  setCustomDates: (start: string, end: string) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

interface DateRangeProviderProps {
  children: ReactNode;
}

export function DateRangeProvider({ children }: DateRangeProviderProps) {
  // 日付範囲を計算する関数
  const calculateDateRange = (type: string, customStart?: string, customEnd?: string) => {
    if (type === 'custom' && customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd
      };
    }
    
    const today = new Date();
    let start: Date;
    let end: Date;
    
    if (type === 'last_month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    } else {
      start = today;
      end = today;
    }
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // 初期値を計算
  const initialRange = calculateDateRange('last_month');
  
  const [startDate, setStartDate] = useState<string>(initialRange.startDate);
  const [endDate, setEndDate] = useState<string>(initialRange.endDate);
  const [dateRangeType, setDateRangeType] = useState<string>('last_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // ローカルストレージから期間設定を復元
  useEffect(() => {
    const savedStartDate = localStorage.getItem('dateRange_startDate');
    const savedEndDate = localStorage.getItem('dateRange_endDate');
    const savedDateRangeType = localStorage.getItem('dateRange_type');
    const savedCustomStart = localStorage.getItem('dateRange_customStart');
    const savedCustomEnd = localStorage.getItem('dateRange_customEnd');

    if (savedStartDate && savedEndDate && savedDateRangeType) {
      setStartDate(savedStartDate);
      setEndDate(savedEndDate);
      setDateRangeType(savedDateRangeType);
      if (savedCustomStart) setCustomStartDate(savedCustomStart);
      if (savedCustomEnd) setCustomEndDate(savedCustomEnd);
    }
  }, []);

  // 期間設定を変更する関数
  const setDateRange = (start: string, end: string, type: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateRangeType(type);
    
    // ローカルストレージに保存
    localStorage.setItem('dateRange_startDate', start);
    localStorage.setItem('dateRange_endDate', end);
    localStorage.setItem('dateRange_type', type);
  };

  // カスタム日付を設定する関数
  const setCustomDates = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    localStorage.setItem('dateRange_customStart', start);
    localStorage.setItem('dateRange_customEnd', end);
  };

  const value: DateRangeContextType = {
    startDate,
    endDate,
    dateRangeType,
    setDateRange,
    customStartDate,
    customEndDate,
    setCustomDates,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
