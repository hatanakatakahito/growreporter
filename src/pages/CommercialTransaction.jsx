import React, { useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import logoImg from '../assets/img/logo.svg';

export default function CommercialTransaction() {
  useEffect(() => { setPageTitle('特定商取引法に基づく表記'); }, []);

  return (
    <section className="min-h-screen py-12" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[800px]">
          {/* ヘッダー */}
          <div className="mb-6 flex justify-center">
            <img src={logoImg} alt="GROW REPORTER" className="h-10 w-auto" />
          </div>

          {/* コンテンツ */}
          <div className="rounded-2xl bg-white p-8 shadow-sm lg:p-12">
            <h1 className="mb-8 text-center text-2xl font-bold text-dark">
              特定商取引法に基づく表記
            </h1>

            <div className="text-dark">
              <table className="w-full">
                <tbody className="[&_tr]:border-b [&_tr]:border-stroke [&_td]:py-4 [&_td]:align-top [&_td]:text-sm [&_td]:leading-relaxed">
                  <tr>
                    <td className="w-1/3 pr-4 font-semibold">販売業者</td>
                    <td>Grow Group 株式会社（Grow Group Co.,Ltd.）</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">運営統括責任者</td>
                    <td>代表取締役 畑中 孝仁</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">所在地</td>
                    <td>
                      〒464-0850<br />愛知県名古屋市千種区今池3丁目12-20 KAビル 6F
                      <p className="mt-2 text-xs text-body-color">東京オフィス: 〒141-0022 東京都品川区東五反田5-22-37 2F</p>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">メールアドレス</td>
                    <td><a href="mailto:info@grow-reporter.com" className="text-primary hover:underline">info@grow-reporter.com</a></td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">電話番号</td>
                    <td>052-753-6413</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">サービス名</td>
                    <td>グローレポーター</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">販売価格</td>
                    <td>
                      各プランの料金は以下の通りです（税込）。<br />
                      <ul className="mt-2 list-disc pl-6 space-y-1">
                        <li>無料プラン: ¥0</li>
                        <li>ビジネスプラン: ¥54,780/月（税抜 ¥49,800）</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">販売価格以外の必要料金</td>
                    <td>インターネット接続に必要な通信費はお客様のご負担となります。</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">支払方法</td>
                    <td>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>クレジットカード決済（Visa、Mastercard、American Express、JCB）</li>
                        <li>請求書払い（銀行振込）</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">支払時期</td>
                    <td>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>クレジットカード: 有料プラン申込時に初回決済、以降毎月（または毎年）自動決済</li>
                        <li>請求書払い: 請求書発行日から30日以内</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">サービス提供時期</td>
                    <td>利用登録完了後、ただちにご利用いただけます。有料プランは決済確認後にプランが適用されます。</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">契約期間</td>
                    <td>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>月額払い: 1ヶ月単位（自動更新）</li>
                        <li>年額払い: 1年単位（自動更新）</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">解約・返金について</td>
                    <td>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>ユーザーはいつでも解約することができます。</li>
                        <li>解約後も契約期間の末日まで有料プランの機能をご利用いただけます。</li>
                        <li>契約期間途中での解約に伴う日割り返金は行いません。</li>
                        <li>契約期間終了後は自動的に無料プランに移行します。</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold">動作環境</td>
                    <td>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Google Chrome、Microsoft Edge、Safari、Firefox の最新バージョン</li>
                        <li>インターネット接続環境</li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-8 text-sm text-body-color">
                制定日: 2026年3月28日<br />
                最終更新日: 2026年3月28日
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
