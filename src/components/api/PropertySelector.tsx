'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MDBModal,
  MDBModalDialog,
  MDBModalContent,
  MDBModalHeader,
  MDBModalTitle,
  MDBModalBody,
  MDBModalFooter,
  MDBBtn,
  MDBIcon,
  MDBListGroup,
  MDBListGroupItem,
  MDBBadge,
  MDBCheckbox,
  MDBInputGroup,
  MDBInput
} from 'mdb-react-ui-kit';
import Loading from '@/components/common/Loading';
import { GA4Property } from '@/lib/api/googleAnalytics';
// GSCSite型を直接定義
export interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

interface PropertySelectorProps {
  show: boolean;
  onClose: () => void;
  ga4Properties: GA4Property[];
  gscSites: GSCSite[];
  onConfirm: (selectedGA4: GA4Property | null, selectedGSC: GSCSite | null) => void;
  mode?: 'ga4' | 'gsc' | 'both';
  initialSelectedGA4?: GA4Property | null;
  initialSelectedGSC?: GSCSite | null;
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  show,
  onClose,
  ga4Properties: initialGA4Properties,
  gscSites,
  onConfirm,
  mode = 'both',
  initialSelectedGA4 = null,
  initialSelectedGSC = null
}) => {
  const [selectedGA4, setSelectedGA4] = useState<GA4Property | null>(initialSelectedGA4);
  const [selectedGSC, setSelectedGSC] = useState<GSCSite | null>(initialSelectedGSC);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 段階的読み込み用の状態
  const [ga4Properties, setGA4Properties] = useState<GA4Property[]>(initialGA4Properties);
  const [loading, setLoading] = useState(false);
  const [hasMoreGA4, setHasMoreGA4] = useState(true);
  const [ga4Total, setGA4Total] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // デバッグ情報
  console.log('🔧 PropertySelector レンダリング:', {
    show,
    initialGA4Properties: initialGA4Properties.length,
    ga4Properties: ga4Properties.length,
    loading,
    hasMoreGA4,
    ga4Total
  });

  // GA4プロパティを段階的に読み込む関数
  const loadMoreGA4Properties = useCallback(async (search: string = '', reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      // アクセストークンを取得（Cookieまたはローカルストレージから）
      const accessToken = getCachedAccessToken();
      if (!accessToken) {
        console.warn('アクセストークンが見つかりません');
        return;
      }

      const currentOffset = reset ? 0 : ga4Properties.length;
      const response = await fetch(
        `/api/ga4/properties?access_token=${accessToken}&search=${encodeURIComponent(search)}&offset=${currentOffset}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setGA4Properties(data.properties);
        } else {
          setGA4Properties(prev => [...prev, ...data.properties]);
        }
        
        setHasMoreGA4(data.hasMore);
        setGA4Total(data.total);
        
        console.log(`🔧 GA4プロパティ読み込み完了: ${data.properties.length}個 (全${data.total}個中)`);
      } else {
        console.error('GA4プロパティの読み込みに失敗しました');
      }
    } catch (error) {
      console.error('GA4プロパティ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, ga4Properties.length]);

  // アクセストークンを取得する関数
  const getCachedAccessToken = () => {
    // Cookieからアクセストークンを取得
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('ga4_access_token='))
      ?.split('=')[1];
    
    if (cookieValue) {
      return decodeURIComponent(cookieValue);
    }
    
    // フォールバック: ローカルストレージから取得
    return localStorage.getItem('ga4_access_token');
  };

  // 検索時のデバウンス処理
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      loadMoreGA4Properties(value, true); // 検索時はリセット
    }, 500);
    
    setSearchTimeout(timeout);
  };

  // シンプルな初期化
  useEffect(() => {
    if (show && initialGA4Properties.length > 0) {
      setGA4Properties(initialGA4Properties);
      setGA4Total(initialGA4Properties.length);
    }
  }, [show, initialGA4Properties]);

  // 初期選択状態を復元
  useEffect(() => {
    if (show) {
      setSelectedGA4(initialSelectedGA4);
      setSelectedGSC(initialSelectedGSC);
      console.log('🔧 PropertySelector初期選択状態復元:', {
        ga4: initialSelectedGA4?.displayName || 'なし',
        gsc: initialSelectedGSC?.siteUrl || 'なし'
      });
    }
  }, [show, initialSelectedGA4, initialSelectedGSC]);

  const handleGA4Toggle = (property: GA4Property) => {
    setSelectedGA4(prev => {
      // 単一選択：同じプロパティなら解除、違うプロパティなら選択
      if (prev?.name === property.name) {
        return null;
      } else {
        return property;
      }
    });
  };

  const handleGSCToggle = (site: GSCSite) => {
    setSelectedGSC(prev => {
      // 単一選択：同じサイトなら解除、違うサイトなら選択
      if (prev?.siteUrl === site.siteUrl) {
        return null;
      } else {
        return site;
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedGA4, selectedGSC);
    onClose();
  };

  const handleClose = () => {
    // 検索状態をリセット
    setSearchTerm('');
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    // 選択状態はリセットしない（保持する）
    onClose();
  };

  const filteredGSCSites = gscSites.filter(site =>
    site.siteUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MDBModal open={show} onClose={handleClose} tabIndex="-1" size="lg">
      <MDBModalDialog>
        <MDBModalContent>
          <MDBModalHeader>
            <MDBModalTitle>
              {mode === 'ga4' ? (
                <>
                  <MDBIcon fas icon="chart-line" className="me-2 text-primary" />
                  GA4プロパティを選択
                </>
              ) : mode === 'gsc' ? (
                <>
                  <MDBIcon fas icon="search" className="me-2 text-warning" />
                  Search Consoleサイトを選択
                </>
              ) : (
                <>
                  <MDBIcon fas icon="chart-bar" className="me-2 text-primary" />
                  分析対象プロパティを選択
                </>
              )}
            </MDBModalTitle>
          </MDBModalHeader>
          <MDBModalBody>
            <p className="text-muted mb-4">
              分析に使用するGA4プロパティとSearch Consoleサイトを選択してください。
            </p>

            {/* 検索フィルター */}
            <MDBInputGroup className="mb-4">
          <MDBInput
            label="プロパティ・サイトを検索"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
              <MDBBtn outline color="secondary" style={{ zIndex: 1 }}>
                <MDBIcon fas icon="search" />
              </MDBBtn>
            </MDBInputGroup>

            {/* GA4プロパティ選択 */}
            {(mode === 'ga4' || mode === 'both') && (ga4Properties.length > 0 || loading) && (
              <div className="mb-4">
                <h6 className="mb-3">
                  <MDBIcon fab icon="google" className="me-2 text-danger" />
                  Google Analytics 4 プロパティ ({ga4Properties.length}個{ga4Total > 0 && ` / 全${ga4Total}個`})
                </h6>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {loading && ga4Properties.length === 0 ? (
                    <div className="text-center py-4">
                      <Loading size={32} />
                      <p className="mt-3 text-muted">プロパティを読み込んでいます...</p>
                    </div>
                  ) : (
                    <>
                      <MDBListGroup>
                        {ga4Properties.map((property) => (
                      <MDBListGroupItem key={property.name} className="d-flex align-items-center">
                        <MDBCheckbox
                          id={`ga4-${property.name}`}
                          checked={selectedGA4?.name === property.name}
                          onChange={() => handleGA4Toggle(property)}
                          className="me-3"
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{property.displayName}</h6>
                          <small className="text-muted">{property.name}</small>
                        </div>
                        <MDBBadge color="primary" pill>
                          GA4
                        </MDBBadge>
                      </MDBListGroupItem>
                    ))}
                      </MDBListGroup>
                      
                      {/* さらに読み込みボタン */}
                      {hasMoreGA4 && (
                        <div className="text-center mt-3">
                          <MDBBtn 
                            color="outline-primary" 
                            size="sm"
                            onClick={() => loadMoreGA4Properties(searchTerm)}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loading size={16} className="me-2" />
                                読み込み中...
                              </>
                            ) : (
                              <>
                                <MDBIcon fas icon="plus" className="me-2" />
                                さらに読み込む
                              </>
                            )}
                          </MDBBtn>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* プロパティが見つからない場合の表示 */}
            {!loading && ga4Properties.length === 0 && initialGA4Properties.length === 0 && (
              <div className="mb-4">
                <h6 className="mb-3">
                  <MDBIcon fab icon="google" className="me-2 text-danger" />
                  Google Analytics 4 プロパティ
                </h6>
                <div className="text-center py-4 bg-light rounded">
                  <MDBIcon fas icon="info-circle" size="2x" className="text-muted mb-2" />
                  <p className="text-muted mb-3">プロパティが見つかりませんでした</p>
                  <MDBBtn 
                    color="primary" 
                    size="sm"
                    onClick={() => loadMoreGA4Properties('', true)}
                  >
                    <MDBIcon fas icon="refresh" className="me-2" />
                    再読み込み
                  </MDBBtn>
                </div>
              </div>
            )}

            {/* Search Consoleサイト選択 */}
            {(mode === 'gsc' || mode === 'both') && filteredGSCSites.length > 0 && (
              <div className="mb-4">
                <h6 className="mb-3">
                  <MDBIcon fab icon="google" className="me-2 text-warning" />
                  Search Console サイト ({filteredGSCSites.length}個)
                </h6>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <MDBListGroup>
                    {filteredGSCSites.map((site) => (
                      <MDBListGroupItem key={site.siteUrl} className="d-flex align-items-center">
                          <MDBCheckbox
                            id={`gsc-${site.siteUrl}`}
                            checked={selectedGSC?.siteUrl === site.siteUrl}
                            onChange={() => handleGSCToggle(site)}
                            className="me-3"
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{site.siteUrl}</h6>
                          <small className="text-muted">権限: {site.permissionLevel}</small>
                        </div>
                        <MDBBadge color="warning" pill>
                          GSC
                        </MDBBadge>
                      </MDBListGroupItem>
                    ))}
                  </MDBListGroup>
                </div>
              </div>
            )}

            {/* 選択サマリー */}
            <div className="bg-light p-3 rounded">
              <h6 className="mb-2">選択サマリー:</h6>
              <div className="d-flex gap-3">
                <span>
                  <MDBIcon fas icon="chart-line" className="me-1 text-primary" />
                  GA4: {selectedGA4 ? 1 : 0}個
                </span>
                <span>
                  <MDBIcon fas icon="search" className="me-1 text-warning" />
                  GSC: {selectedGSC ? 1 : 0}個
                </span>
              </div>
            </div>
          </MDBModalBody>
          <MDBModalFooter>
            <MDBBtn color="secondary" onClick={handleClose}>
              キャンセル
            </MDBBtn>
            <MDBBtn 
              color="primary" 
              onClick={handleConfirm}
              disabled={!selectedGA4 && !selectedGSC}
            >
              <MDBIcon fas icon="check" className="me-2" />
              選択完了 ({(selectedGA4 ? 1 : 0) + (selectedGSC ? 1 : 0)}個)
            </MDBBtn>
          </MDBModalFooter>
        </MDBModalContent>
      </MDBModalDialog>
    </MDBModal>
  );
};

export default PropertySelector;
