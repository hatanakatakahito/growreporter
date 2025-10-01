'use client';

import React, { useState } from 'react';
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
  MDBCheckbox
} from 'mdb-react-ui-kit';

// GA4レポートタイプの定義
export interface GA4ReportType {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  dimensions: string[];
}

// 利用可能なGA4レポート
const GA4_REPORTS: GA4ReportType[] = [
  {
    id: 'overview',
    name: '概要レポート',
    description: 'セッション、ユーザー、ページビューなどの基本指標',
    metrics: ['sessions', 'users', 'pageviews', 'bounceRate'],
    dimensions: ['date']
  },
  {
    id: 'traffic_sources',
    name: 'トラフィック ソース',
    description: '参照元、メディア、キャンペーン別の分析',
    metrics: ['sessions', 'users', 'conversions'],
    dimensions: ['source', 'medium', 'campaign']
  },
  {
    id: 'pages',
    name: 'ページとスクリーン',
    description: 'ページ別のパフォーマンス分析',
    metrics: ['pageviews', 'uniquePageviews', 'avgTimeOnPage'],
    dimensions: ['pagePath', 'pageTitle']
  },
  {
    id: 'demographics',
    name: 'ユーザー属性',
    description: '年齢、性別、地域別の分析',
    metrics: ['users', 'sessions'],
    dimensions: ['age', 'gender', 'country']
  },
  {
    id: 'conversions',
    name: 'コンバージョン',
    description: 'コンバージョンイベントの分析',
    metrics: ['conversions', 'conversionRate', 'conversionValue'],
    dimensions: ['eventName', 'conversionEventName']
  }
];

interface ReportSelectorProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (selectedReports: GA4ReportType[]) => void;
  type: 'ga4' | 'gsc';
}

const ReportSelector: React.FC<ReportSelectorProps> = ({
  show,
  onClose,
  onConfirm,
  type
}) => {
  const [selectedReports, setSelectedReports] = useState<GA4ReportType[]>([]);

  const handleReportToggle = (report: GA4ReportType) => {
    setSelectedReports(prev => {
      const isSelected = prev.some(r => r.id === report.id);
      if (isSelected) {
        return prev.filter(r => r.id !== report.id);
      } else {
        return [...prev, report];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedReports);
    onClose();
  };

  const handleClose = () => {
    setSelectedReports([]);
    onClose();
  };

  return (
    <MDBModal open={show} onClose={handleClose} tabIndex="-1" size="lg">
      <MDBModalDialog>
        <MDBModalContent>
          <MDBModalHeader>
            <MDBModalTitle>
              {type === 'ga4' ? (
                <>
                  <MDBIcon fas icon="chart-line" className="me-2 text-primary" />
                  GA4レポートを選択
                </>
              ) : (
                <>
                  <MDBIcon fas icon="search" className="me-2 text-warning" />
                  Search Consoleレポートを選択
                </>
              )}
            </MDBModalTitle>
          </MDBModalHeader>
          <MDBModalBody>
            <p className="text-muted mb-4">
              分析に使用するレポートタイプを選択してください。
            </p>

            {type === 'ga4' && (
              <MDBListGroup>
                {GA4_REPORTS.map((report) => (
                  <MDBListGroupItem key={report.id} className="d-flex align-items-start">
                    <MDBCheckbox
                      id={`report-${report.id}`}
                      checked={selectedReports.some(r => r.id === report.id)}
                      onChange={() => handleReportToggle(report)}
                      className="me-3"
                    />
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{report.name}</h6>
                      <p className="text-muted mb-2 small">{report.description}</p>
                      <div>
                        <small className="text-primary">
                          指標: {report.metrics.join(', ')}
                        </small>
                        <br />
                        <small className="text-secondary">
                          ディメンション: {report.dimensions.join(', ')}
                        </small>
                      </div>
                    </div>
                  </MDBListGroupItem>
                ))}
              </MDBListGroup>
            )}

            {type === 'gsc' && (
              <div className="text-center py-4">
                <MDBIcon fas icon="construction" size="3x" className="text-muted mb-3" />
                <p className="text-muted">Search Consoleレポート選択機能は開発中です</p>
              </div>
            )}
          </MDBModalBody>
          <MDBModalFooter>
            <MDBBtn color="secondary" onClick={handleClose}>
              キャンセル
            </MDBBtn>
            <MDBBtn 
              color="primary" 
              onClick={handleConfirm}
              disabled={selectedReports.length === 0}
            >
              <MDBIcon fas icon="check" className="me-2" />
              選択完了 ({selectedReports.length}個)
            </MDBBtn>
          </MDBModalFooter>
        </MDBModalContent>
      </MDBModalDialog>
    </MDBModal>
  );
};

export default ReportSelector;


