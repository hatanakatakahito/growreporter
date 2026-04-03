import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePlan } from '../hooks/usePlan';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { format, sub, differenceInCalendarDays } from 'date-fns';

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
  const { plan: currentPlan, isLoading: isPlanLoading } = usePlan();
  const maxSites = currentPlan?.features?.maxSites || 1;
  const [rawSites, setRawSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedSiteLive, setSelectedSiteLive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminViewing, setIsAdminViewing] = useState(false); // 管理者として他のサイトを閲覧中かどうか
  const [adminRole, setAdminRole] = useState(null); // admin/editor/viewer
  const [activeSiteIds, setActiveSiteIds] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    try {
      const saved = localStorage.getItem('dateRange');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.from && parsed.to) {
          // 月が変わったらデフォルト（前月）にリセット
          const savedMonth = localStorage.getItem('dateRange_month');
          const currentMonth = format(new Date(), 'yyyy-MM');
          if (!savedMonth || savedMonth !== currentMonth) {
            localStorage.removeItem('dateRange');
            localStorage.removeItem('dateRange_month');
            return getDefaultDateRange();
          }
          return parsed;
        }
      }
    } catch (error) {
      console.error('[SiteContext] dateRange復元エラー:', error);
      localStorage.removeItem('dateRange');
      localStorage.removeItem('dateRange_v1');
      localStorage.removeItem('dateRange_month');
    }
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

  // activeSiteIds をリアルタイム購読（管理者が変更した際に即反映）
  useEffect(() => {
    if (!currentUser) {
      setActiveSiteIds(null);
      return;
    }
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const ids = data.activeSiteIds || null;
        setActiveSiteIds(ids);
      }
    }, (err) => {
      console.error('[SiteContext] activeSiteIds購読エラー:', err);
    });
    return () => unsubscribe();
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
          setRawSites([siteData]); // 一時的にこのサイトのみを表示
          setSelectedSiteId(urlSiteId);
        } else {
          // 自分のサイトの場合 - 即座に表示できるようrawSitesにもセット
          // （Effect 2でフルのサイト一覧に置き換わる）
          console.log('[SiteContext] 自分のサイトを表示');
          setIsAdminViewing(false);
          setSelectedSiteId(urlSiteId);
          localStorage.setItem('lastSelectedSiteId', urlSiteId);
          setRawSites(prev => prev.length === 0 ? [siteData] : prev);
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
        setRawSites([]);
        setSelectedSiteId(null);
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams(location.search);
      const urlSiteId = params.get('siteId');

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

        // URLパラメータのサイトが自分のサイト一覧に含まれない場合は
        // 管理者として他ユーザーのサイトを閲覧中のため、上書きしない
        if (urlSiteId && !sitesData.some(site => site.id === urlSiteId)) {
          console.log('[SiteContext] 管理者閲覧中のため、サイト一覧の上書きをスキップ');
          return;
        }

        setRawSites(sitesData);
        setIsAdminViewing(false); // 通常モードに戻す

        // URLパラメータでサイト指定がある場合はそれを選択（サイト登録後のリダイレクト等）
        if (urlSiteId && sitesData.some(site => site.id === urlSiteId)) {
          setSelectedSiteId(urlSiteId);
          localStorage.setItem('lastSelectedSiteId', urlSiteId);
        } else {
          // 最後に選択したサイトをLocalStorageから復元
          const lastSelectedSiteId = localStorage.getItem('lastSelectedSiteId');
          if (lastSelectedSiteId && sitesData.some(site => site.id === lastSelectedSiteId)) {
            setSelectedSiteId(lastSelectedSiteId);
          } else if (sitesData.length > 0) {
            // LocalStorageにない場合は最初のサイトを選択
            setSelectedSiteId(sitesData[0].id);
          }
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

  // 日付範囲をLocalStorageに保存（月情報も一緒に保存）
  useEffect(() => {
    try {
      localStorage.setItem('dateRange', JSON.stringify(dateRange));
      localStorage.setItem('dateRange_month', format(new Date(), 'yyyy-MM'));
    } catch (error) {
      console.error('[SiteContext] dateRange保存エラー:', error);
    }
  }, [dateRange]);

  // === 期間比較機能 ===
  const [comparisonMode, setComparisonMode] = useState(() => {
    try {
      return localStorage.getItem('comparisonMode') || 'none';
    } catch { return 'none'; }
  });
  const [customComparisonRange, setCustomComparisonRange] = useState(null);

  // comparisonModeをlocalStorageに永続化
  useEffect(() => {
    try { localStorage.setItem('comparisonMode', comparisonMode); } catch {}
  }, [comparisonMode]);

  // 比較期間を自動算出
  const comparisonDateRange = useMemo(() => {
    if (comparisonMode === 'none' || !dateRange?.from || !dateRange?.to) return null;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const days = differenceInCalendarDays(to, from);

    if (comparisonMode === 'previous') {
      const compTo = sub(from, { days: 1 });
      const compFrom = sub(compTo, { days });
      return { from: format(compFrom, 'yyyy-MM-dd'), to: format(compTo, 'yyyy-MM-dd') };
    }
    if (comparisonMode === 'yearAgo') {
      const compFrom = sub(from, { years: 1 });
      const compTo = sub(to, { years: 1 });
      return { from: format(compFrom, 'yyyy-MM-dd'), to: format(compTo, 'yyyy-MM-dd') };
    }
    if (comparisonMode === 'custom' && customComparisonRange?.from && customComparisonRange?.to) {
      return customComparisonRange;
    }
    return null;
  }, [comparisonMode, dateRange, customComparisonRange]);

  // プラン制限に基づくサイトフィルタリング
  const needsSiteSelection = useMemo(() => {
    if (isLoading || isPlanLoading) return false;
    if (isAdminViewing || adminRole) return false;
    if (rawSites.length <= maxSites) return false;
    // activeSiteIdsが保存されていて有効なら選択不要
    if (activeSiteIds && activeSiteIds.length > 0) {
      const validIds = activeSiteIds.filter(id => rawSites.some(s => s.id === id));
      if (validIds.length > 0 && validIds.length <= maxSites) return false;
    }
    return true;
  }, [rawSites, maxSites, activeSiteIds, isLoading, isPlanLoading, isAdminViewing, adminRole, currentPlan]);

  // フィルタ済みサイト一覧（プラン制限適用後）
  const sites = useMemo(() => {
    if (isPlanLoading) return rawSites;
    if (isAdminViewing || adminRole) return rawSites;
    if (rawSites.length <= maxSites) return rawSites;
    if (activeSiteIds && activeSiteIds.length > 0) {
      const filtered = rawSites.filter(s => activeSiteIds.includes(s.id));
      if (filtered.length > 0 && filtered.length <= maxSites) return filtered;
    }
    return rawSites;
  }, [rawSites, maxSites, activeSiteIds, isAdminViewing, adminRole, isPlanLoading]);

  // サイト選択確定（ダウングレード時のサイト選択モーダル用）
  const confirmSiteSelection = useCallback(async (selectedIds) => {
    setActiveSiteIds(selectedIds);
    if (selectedIds.length > 0) {
      setSelectedSiteId(selectedIds[0]);
      localStorage.setItem('lastSelectedSiteId', selectedIds[0]);
    }
    // Firestoreに保存（onSnapshotで他端末・管理者にも即反映）
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { activeSiteIds: selectedIds });
      } catch (error) {
        console.error('[SiteContext] activeSiteIds保存エラー:', error);
      }
    }
  }, [currentUser]);

  // selectedSiteIdがフィルタ済みサイトに含まれない場合は補正
  useEffect(() => {
    if (isPlanLoading || isLoading || needsSiteSelection) return;
    if (sites.length > 0 && selectedSiteId && !sites.some(s => s.id === selectedSiteId)) {
      const newId = sites[0].id;
      setSelectedSiteId(newId);
      localStorage.setItem('lastSelectedSiteId', newId);
    }
  }, [sites, selectedSiteId, isPlanLoading, isLoading, needsSiteSelection]);

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
      
      setRawSites(sitesData);

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
    allSites: rawSites, // フィルタ前の全サイト（サイト選択モーダル用）
    selectedSite,
    selectedSiteId,
    selectSite,
    reloadSites,
    isLoading,
    dateRange,
    updateDateRange,
    isAdminViewing,
    adminRole,
    needsSiteSelection,
    confirmSiteSelection,
    maxSites,
    comparisonMode,
    setComparisonMode,
    comparisonDateRange,
    customComparisonRange,
    setCustomComparisonRange,
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

