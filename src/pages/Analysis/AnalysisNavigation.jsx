import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import { setPageTitle } from '../../utils/pageTitle';
import {
  BarChart3,
  Users,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  TrendingUp,
  Search,
  ExternalLink as ExternalLinkIcon,
  MousePointerClick,
  FileText,
  LayoutGrid,
  FolderTree,
  Target,
  GitMerge,
  Sparkles,
} from 'lucide-react';

/**
 * 分析ナビゲーション画面
 * 各分析メニューへのリンクと説明を表示
 */
export default function AnalysisNavigation() {
  const { dateRange, updateDateRange } = useSite();

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('分析する');
  }, []);

  // 3つの大分類に分けたナビゲーション構造
  const analysisGroups = [
    {
      groupTitle: 'アクセス解析',
      groupDescription: 'GA4とSearch Consoleのデータを統合し、サイトのアクセス状況を多角的に分析します。',
      categories: [
        {
          title: '基本分析',
          items: [
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: '全体サマリー',
              description: 'サイト全体の主要指標、コンバージョン内訳、KPI予実を確認できます。',
              path: '/analysis/summary',
            },
            {
              icon: <Users className="h-6 w-6" />,
              title: 'ユーザー属性',
              description: '年齢、性別、地域などユーザーの属性データを分析します。',
              path: '/analysis/users',
            },
          ],
        },
        {
          title: '時系列分析',
          items: [
            {
              icon: <CalendarRange className="h-6 w-6" />,
              title: '月別',
              description: '月別のトレンドを把握し、中長期的な傾向を分析します。',
              path: '/analysis/month',
            },
            {
              icon: <Calendar className="h-6 w-6" />,
              title: '日別',
              description: '日別のトレンドとパターンを把握し、最適な施策タイミングを見つけます。',
              path: '/analysis/day',
            },
            {
              icon: <CalendarDays className="h-6 w-6" />,
              title: '曜日別',
              description: '曜日ごとのパフォーマンスを比較し、曜日特性を理解します。',
              path: '/analysis/week',
            },
            {
              icon: <Clock className="h-6 w-6" />,
              title: '時間帯別',
              description: '時間帯別のアクセス傾向から、ユーザーの行動パターンを分析します。',
              path: '/analysis/hour',
            },
          ],
        },
        {
          title: '集客分析',
          items: [
            {
              icon: <TrendingUp className="h-6 w-6" />,
              title: '集客チャネル',
              description: 'オーガニック検索、SNS、広告など流入経路別の効果を測定します。',
              path: '/analysis/channels',
            },
            {
              icon: <Search className="h-6 w-6" />,
              title: '流入キーワード元',
              description: '検索キーワードのパフォーマンスから、SEO改善のヒントを得ます。',
              path: '/analysis/keywords',
            },
            {
              icon: <ExternalLinkIcon className="h-6 w-6" />,
              title: '被リンク元',
              description: '参照元サイトからのトラフィックを分析し、効果的な連携先を特定します。',
              path: '/analysis/referrals',
            },
          ],
        },
        {
          title: 'エンゲージメント分析',
          items: [
            {
              icon: <FileText className="h-6 w-6" />,
              title: 'ページ別',
              description: '各ページのパフォーマンスを詳細に分析し、改善ポイントを発見します。',
              path: '/analysis/pages',
            },
            {
              icon: <FolderTree className="h-6 w-6" />,
              title: 'ページ分類別',
              description: 'ディレクトリ単位でコンテンツの傾向を把握します。',
              path: '/analysis/page-categories',
            },
            {
              icon: <LayoutGrid className="h-6 w-6" />,
              title: 'ランディングページ',
              description: '最初に訪問されるページの効果を測定し、導線を最適化します。',
              path: '/analysis/landing-pages',
            },
            {
              icon: <FileText className="h-6 w-6" />,
              title: 'ファイルダウンロード',
              description: 'ダウンロードされた資料やファイルの人気度を確認します。',
              path: '/analysis/file-downloads',
            },
            {
              icon: <MousePointerClick className="h-6 w-6" />,
              title: '外部リンククリック',
              description: 'サイトから外部へのリンククリック状況を追跡します。',
              path: '/analysis/external-links',
            },
          ],
        },
        {
          title: 'コンバージョン分析',
          items: [
            {
              icon: <Target className="h-6 w-6" />,
              title: 'コンバージョン一覧',
              description: '登録済みコンバージョンの月次推移と達成状況を一覧表示します。',
              path: '/analysis/conversions',
            },
            {
              icon: <GitMerge className="h-6 w-6" />,
              title: '逆算フロー',
              description: 'コンバージョンまでのステップを逆算し、離脱ポイントを特定します。',
              path: '/analysis/reverse-flow',
            },
          ],
        },
        {
          title: 'AI分析',
          items: [
            {
              icon: <Sparkles className="h-6 w-6" />,
              title: 'AI総合分析',
              description: '全データを横断してAIが自動分析し、サイトの現状と次に取り組むべきことを明らかにします。',
              path: '/analysis/comprehensive',
            },
          ],
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          {/* ページタイトル */}
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-dark dark:text-white">分析する</h2>
            <p className="text-base text-body-color">
              GA4とSearch Consoleのデータを統合し、詳細な分析レポートとAIによる分析ができます。
            </p>
          </div>

          {/* 分析グループ */}
          <div className="space-y-12">
            {analysisGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* グループヘッダー */}
                <div className="mb-6 flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-dark dark:text-white">
                    {group.groupTitle}
                  </h3>
                  <span className="text-sm text-body-color">
                    {group.groupDescription}
                  </span>
                </div>

                {/* カテゴリ */}
                <div className="space-y-8">
                  {group.categories.map((category, categoryIndex) => (
                    <div key={categoryIndex}>
                      {category.title && (
                        <h4 className="mb-3 text-lg font-semibold text-dark/80 dark:text-white/80">
                          {category.title}
                        </h4>
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {category.items.map((item, itemIndex) => (
                          <Link
                            key={itemIndex}
                            to={item.path}
                            className="group relative overflow-hidden rounded-lg border border-stroke bg-white p-6 transition-all hover:border-primary hover:shadow-lg dark:border-dark-3 dark:bg-dark-2"
                          >
                            <div>
                              {/* アイコンとタイトル行 */}
                              <div className="mb-2 flex items-center gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110 dark:bg-primary/20">
                                  {item.icon}
                                </div>
                                <h4 className="flex-1 text-lg font-semibold text-dark transition-colors group-hover:text-primary dark:text-white">
                                  {item.title}
                                </h4>
                                <svg
                                  className="h-5 w-5 flex-shrink-0 text-body-color transition-all group-hover:translate-x-1 group-hover:text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <p className="ml-16 text-sm leading-relaxed text-body-color">
                                {item.description}
                              </p>
                            </div>
                            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* グループ間の区切り線 */}
                {groupIndex < analysisGroups.length - 1 && (
                  <hr className="mt-12 border-stroke/50 dark:border-dark-3/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

