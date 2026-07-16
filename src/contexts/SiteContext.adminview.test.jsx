/**
 * 管理者が他人(引継ぎ済)サイトを ?siteId= で開き、サイドバーから ?siteId= の無い
 * 分析ページ(AI総合分析等)へ遷移しても、管理者ビュー(対象=JTB)が維持されることを
 * 実際の SiteContext.jsx を動かして検証する。
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';

// ---- モックデータ ----
const HATANAKA = 'hatanaka';
const adminUsers = { [HATANAKA]: { role: 'admin' } };
const users = {
  [HATANAKA]: {
    memberRole: 'owner',
    accountOwnerId: HATANAKA,
    memberships: { [HATANAKA]: { role: 'owner' } },
    email: 'hatanaka@grow-group.jp',
    // activeSiteIds 未設定
  },
};
const cAt = (s) => ({ toDate: () => new Date(s) });
const SITES = {
  jtb: { userId: 'jtb', siteName: 'JTBパブリッシング', setupCompleted: true, createdAt: cAt('2026-04-22') },
  own1: { userId: HATANAKA, siteName: 'GrowGroup株式会社', setupCompleted: true, createdAt: cAt('2026-04-01') },
  own2: { userId: HATANAKA, siteName: '工藤建設', setupCompleted: true, createdAt: cAt('2026-03-01') },
  own3: { userId: HATANAKA, siteName: 'つばめタクシー', setupCompleted: true, createdAt: cAt('2026-02-01') },
  own4: { userId: HATANAKA, siteName: '小川電機', setupCompleted: true, createdAt: cAt('2026-01-01') },
  own5: { userId: HATANAKA, siteName: '中屋万年筆', setupCompleted: true, createdAt: cAt('2025-12-01') },
};

const snap = (coll, id) => {
  const data = coll === 'adminUsers' ? adminUsers[id] : coll === 'users' ? users[id] : SITES[id];
  return { id, exists: () => !!data, data: () => data };
};

vi.mock('../config/firebase', () => ({ db: {}, auth: {}, functions: {}, storage: {} }));
vi.mock('../hooks/usePlan', () => ({
  usePlan: () => ({
    plan: { features: { maxSites: 3 } },
    isLoading: false,
    effectiveMaxSites: 3,
    extraSitesCount: 0,
    extraSitesValidUntil: null,
  }),
}));
const CURRENT_USER = { uid: HATANAKA };
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    currentUser: CURRENT_USER,
    userProfile: users[HATANAKA],
  }),
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db, coll, id) => ({ __t: 'doc', coll, id }),
  collection: (_db, name) => ({ __t: 'collection', name }),
  where: (field, op, value) => ({ field, op, value }),
  query: (coll, ...constraints) => ({ __t: 'query', coll, constraints }),
  getDoc: async (ref) => snap(ref.coll, ref.id),
  getDocs: async (q) => {
    const w = q.constraints.find((c) => c.field === 'userId');
    const ids = Object.keys(SITES).filter((id) => SITES[id].userId === w.value);
    const docs = ids.map((id) => ({ id, data: () => SITES[id] }));
    return { size: docs.length, docs, forEach: (fn) => docs.forEach(fn) };
  },
  onSnapshot: (ref, cb) => {
    Promise.resolve().then(() => cb(snap(ref.coll, ref.id)));
    return () => {};
  },
  updateDoc: async () => {},
}));

import { SiteProvider, useSite } from './SiteContext';

function Probe() {
  const { sites, selectedSiteId, isAdminViewing, isLoading, isMember, memberHasNoAllowedSites, adminRole } = useSite();
  const location = useLocation();
  const navigate = useNavigate();
  const hasSiteIdParam = new URLSearchParams(location.search).has('siteId');
  const isAdminViewingSession = !!window.sessionStorage.getItem('adminViewingSiteId');
  // MainLayout.jsx:271 のリダイレクト条件を忠実に再現
  const wouldRedirect =
    !isLoading && sites.length === 0 && !isMember && !adminRole && !isAdminViewing && !hasSiteIdParam && !isAdminViewingSession;
  return (
    <div>
      <div data-testid="path">{location.pathname}</div>
      <div data-testid="selected">{selectedSiteId || ''}</div>
      <div data-testid="adminViewing">{String(isAdminViewing)}</div>
      <div data-testid="sites">{sites.map((s) => s.id).join(',')}</div>
      <div data-testid="redirect">{String(wouldRedirect)}</div>
      <button onClick={() => navigate('/analysis/comprehensive')}>go</button>
    </div>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('管理者ビューのページ遷移保持', () => {
  it('JTBダッシュボード→AI総合分析へ遷移してもJTBのまま、/sites/newへ飛ばない', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?siteId=jtb']}>
        <SiteProvider>
          <Probe />
        </SiteProvider>
      </MemoryRouter>
    );

    // 初期: 管理者として JTB を閲覧中
    await waitFor(() => {
      expect(screen.getByTestId('selected').textContent).toBe('jtb');
      expect(screen.getByTestId('adminViewing').textContent).toBe('true');
    });
    expect(screen.getByTestId('sites').textContent).toBe('jtb');
    expect(screen.getByTestId('redirect').textContent).toBe('false');

    // AI総合分析へ遷移（?siteId= なし）
    await act(async () => {
      fireEvent.click(screen.getByText('go'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toBe('/analysis/comprehensive');
    });

    // 遷移後も JTB のまま・自分のサイトにすり替わらない・リダイレクトしない
    await waitFor(() => {
      expect(screen.getByTestId('selected').textContent).toBe('jtb');
    });
    expect(screen.getByTestId('adminViewing').textContent).toBe('true');
    expect(screen.getByTestId('sites').textContent).toBe('jtb');
    expect(screen.getByTestId('redirect').textContent).toBe('false');
  });
});
