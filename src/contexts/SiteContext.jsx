import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

const SiteContext = createContext();

// デフォルトの日付範囲（前月の1日～末日）
const getDefaultDateRange = () => {
  const today = new Date();
  
  // 前月の1日を取得
  const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  // 前月の末日を取得（今月の0日 = 前月の末日）
  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return {
    from: format(firstDayOfLastMonth, 'yyyy-MM-dd'),
    to: format(lastDayOfLastMonth, 'yyyy-MM-dd'),
  };
};

export function SiteProvider({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSiteLive, setSelectedSiteLive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminViewing, setIsAdminViewing] = useState(false); // 管理者として他のサイトを閲覧中かどうか
  const [adminRole, setAdminRole] = useState(null); // admin/editor/viewer
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

  // 管理者権限をチェック
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setAdminRole(null);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
        if (adminDoc.exists()) {
          const role = adminDoc.data().role;
          if (['admin', 'editor', 'viewer'].includes(role)) {
            setAdminRole(role);
            console.log('[SiteContext] 管理者権限:', role);
          }
        }
      } catch (error) {
        console.error('[SiteContext] 管理者権限チェックエラー:', error);
      }
    };

    checkAdminRole();
  }, [currentUser]);

  // URLパラメータから siteId を読み取り、特定のサイトを取得（管理者用）
  useEffect(() => {
    const checkUrlParams = async () => {
      if (!currentUser) return;

      const params = new URLSearchParams(location.search);
      const urlSiteId = params.get('siteId');

      if (!urlSiteId) return;

      console.log('[SiteContext] URLパラメータから siteId を検出:', urlSiteId);
      setIsLoading(true);
      
      try {
        // まず管理者権限をチェック
        const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
        const hasAdminRole = adminDoc.exists() && ['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role);
        
        // サイト情報を取得
        const siteDoc = await getDoc(doc(db, 'sites', urlSiteId));
        if (!siteDoc.exists()) {
          console.error('[SiteContext] 指定されたサイトが見つかりません:', urlSiteId);
          setIsLoading(false);
          return;
        }

        const siteData = { id: siteDoc.id, ...siteDoc.data() };
        
        // 自分のサイトでない場合は管理者権限が必要
        if (siteData.userId !== currentUser.uid) {
          if (!hasAdminRole) {
            console.error('[SiteContext] 管理者権限がないため、他ユーザーのサイトにアクセスできません');
            setIsLoading(false);
            return;
          }
          console.log('[SiteContext] 管理者として他ユーザーのサイトを閲覧');
          setIsAdminViewing(true);
          setSites([siteData]); // 一時的にこのサイトのみを表示
          setSelectedSiteId(urlSiteId);
        } else {
          // 自分のサイトの場合は通常通り
          console.log('[SiteContext] 自分のサイトを表示');
          setIsAdminViewing(false);
          setSelectedSiteId(urlSiteId);
        }
      } catch (error) {
        console.error('[SiteContext] URLパラメータからのサイト取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUrlParams();
  }, [location.search, currentUser]);

  // ユーザーのサイト一覧を取得（アカウント全体のサイトを取得）
  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser) {
        setSites([]);
        setSelectedSiteId(null);
        setIsLoading(false);
        return;
      }

      // URLパラメータに siteId が指定されている場合はスキップ
      const params = new URLSearchParams(location.search);
      const urlSiteId = params.get('siteId');
      if (urlSiteId) {
        console.log('[SiteContext] URLパラメータによるサイト指定があるため、通常のサイト取得をスキップ');
        return;
      }

      setIsLoading(true);
      try {
        console.log('[SiteContext] ユーザーID:', currentUser.uid);
        
        // 自分のユーザー情報を取得
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        // memberships から accountOwnerId を取得（複数ある場合は最初の1つ）
        const memberships = userData?.memberships || {};
        const accountOwnerIds = Object.keys(memberships);
        
        let accountOwnerId;
        if (accountOwnerIds.length > 0) {
          // memberships がある場合、最初のアカウントを使用
          accountOwnerId = accountOwnerIds[0];
          console.log('[SiteContext] Memberships から取得したアカウントオーナーID:', accountOwnerId);
        } else {
          // memberships がない場合、自分自身をオーナーとする（後方互換性）
          accountOwnerId = userData?.accountOwnerId || currentUser.uid;
          console.log('[SiteContext] 従来方式でアカウントオーナーID取得:', accountOwnerId);
        }
        
        console.log('[SiteContext] 使用するアカウントオーナーID:', accountOwnerId);
        
        // accountOwnerIdが一致するサイトを全て取得
        const q = query(
          collection(db, 'sites'),
          where('userId', '==', accountOwnerId)
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
        setIsAdminViewing(false); // 通常モードに戻す

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
  }, [currentUser, location.search]);

  // 選択中サイトをリアルタイム購読（メタデータ・スクショは登録後にトリガーで入るため、更新を即反映）
  useEffect(() => {
    if (!selectedSiteId) {
      setSelectedSiteLive(null);
      return;
    }
    const ref = doc(db, 'sites', selectedSiteId);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setSelectedSiteLive({ id: snapshot.id, ...snapshot.data() });
      } else {
        setSelectedSiteLive(null);
      }
    }, (err) => {
      console.error('[SiteContext] 選択中サイトの購読エラー:', err);
      setSelectedSiteLive(null);
    });
    return () => unsubscribe();
  }, [selectedSiteId]);

  // 日付範囲をLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem('dateRange', JSON.stringify(dateRange));
    } catch (error) {
      console.error('[SiteContext] dateRange保存エラー:', error);
    }
  }, [dateRange]);

  // 選択中のサイト情報（リアルタイムデータがあればそれを優先＝カバー表示がトリガー完了後に更新される）
  const selectedSite = useMemo(() => {
    if (selectedSiteLive) return selectedSiteLive;
    return sites.find(site => site.id === selectedSiteId) || null;
  }, [sites, selectedSiteId, selectedSiteLive]);

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
    isAdminViewing, // 管理者として他のサイトを閲覧中かどうか
    adminRole, // admin/editor/viewer
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

