import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { subDays, format } from 'date-fns';

const SiteContext = createContext();

// デフォルトの日付範囲（過去30日）
const getDefaultDateRange = () => {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  return {
    from: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
};

export function SiteProvider({ children }) {
  const { currentUser } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    try {
      // LocalStorageから復元
      const saved = localStorage.getItem('dateRange');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 形式チェック
        if (parsed && typeof parsed === 'object' && parsed.from && parsed.to) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('[SiteContext] dateRange復元エラー:', error);
      // エラー時は古いデータを削除
      localStorage.removeItem('dateRange');
      localStorage.removeItem('dateRange_v1');
    }
    // デフォルト値を返す
    return getDefaultDateRange();
  });

  // ユーザーのサイト一覧を取得
  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser) {
        setSites([]);
        setSelectedSiteId(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log('[SiteContext] ユーザーID:', currentUser.uid);
        
        const q = query(
          collection(db, 'sites'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('[SiteContext] 取得したサイト数:', querySnapshot.size);
        
        const sitesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // クライアント側でソート
        sitesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        
        setSites(sitesData);

        // 最後に選択したサイトをLocalStorageから復元
        const lastSelectedSiteId = localStorage.getItem('lastSelectedSiteId');
        if (lastSelectedSiteId && sitesData.some(site => site.id === lastSelectedSiteId)) {
          setSelectedSiteId(lastSelectedSiteId);
        } else if (sitesData.length > 0) {
          // LocalStorageにない場合は最初のサイトを選択
          setSelectedSiteId(sitesData[0].id);
        }
      } catch (error) {
        console.error('[SiteContext] Error fetching sites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSites();
  }, [currentUser]);

  // 日付範囲をLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem('dateRange', JSON.stringify(dateRange));
    } catch (error) {
      console.error('[SiteContext] dateRange保存エラー:', error);
    }
  }, [dateRange]);

  // 選択中のサイト情報
  const selectedSite = sites.find(site => site.id === selectedSiteId);

  // サイトを選択
  const selectSite = (siteId) => {
    setSelectedSiteId(siteId);
    // LocalStorageに保存
    localStorage.setItem('lastSelectedSiteId', siteId);
  };

  // 日付範囲を更新
  const updateDateRange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  // サイト一覧を再読み込み
  const reloadSites = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'sites'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const sitesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // クライアント側でソート
      sitesData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      setSites(sitesData);

      // 選択中のサイトが削除されていたら、最初のサイトを選択
      if (selectedSiteId && !sitesData.some(site => site.id === selectedSiteId)) {
        if (sitesData.length > 0) {
          selectSite(sitesData[0].id);
        } else {
          setSelectedSiteId(null);
        }
      }
    } catch (error) {
      console.error('[SiteContext] Error reloading sites:', error);
    }
  };

  const value = {
    sites,
    selectedSite,
    selectedSiteId,
    selectSite,
    reloadSites,
    isLoading,
    dateRange,
    updateDateRange,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}

