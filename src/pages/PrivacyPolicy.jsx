import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../utils/pageTitle';
import logoImg from '../assets/img/logo.svg';

export default function PrivacyPolicy() {
  useEffect(() => { setPageTitle('プライバシーポリシー'); }, []);

  return (
    <section className="min-h-screen py-12" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[800px]">
          {/* ヘッダー */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <img src={logoImg} alt="GROW REPORTER" className="h-10 w-auto" />
            <Link to="/register" className="text-sm text-primary hover:underline">
              &larr; 登録画面に戻る
            </Link>
          </div>

          {/* コンテンツ */}
          <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-dark-2 lg:p-12">
            <h1 className="mb-8 text-center text-2xl font-bold text-dark dark:text-white">
              プライバシーポリシー
            </h1>

            <div className="prose prose-sm max-w-none text-dark dark:text-white/90 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1">
              <p>
                グローレポーター（以下「本サービス」）は、ユーザーの個人情報の保護を重要と考え、
                以下のとおりプライバシーポリシーを定めます。
              </p>

              <h2>1. 収集する個人情報</h2>
              <p>本サービスでは、以下の個人情報を収集します。</p>
              <ul>
                <li>氏名</li>
                <li>メールアドレス</li>
                <li>電話番号</li>
                <li>会社名・組織名</li>
                <li>Google Analytics 4 / Google Search Console の連携に必要なOAuth認証情報</li>
                <li>本サービスの利用履歴（アクセスログ、操作履歴等）</li>
                <li>お問い合わせ内容</li>
              </ul>

              <h2>2. 個人情報の利用目的</h2>
              <p>収集した個人情報は、以下の目的で利用します。</p>
              <ol>
                <li>本サービスの提供・運営</li>
                <li>ユーザーアカウントの管理・認証</li>
                <li>Google Analytics 4 / Google Search Console データの取得・分析</li>
                <li>AI分析結果および改善提案の生成・表示</li>
                <li>利用料金の請求・決済処理</li>
                <li>お問い合わせへの対応</li>
                <li>本サービスの改善・新機能の開発</li>
                <li>メンテナンス情報、重要な変更等の通知</li>
                <li>利用規約に違反する行為への対応</li>
              </ol>

              <h2>3. 外部サービスとの連携</h2>
              <p>本サービスでは、以下の外部サービスを利用しています。各サービスにおける個人情報の取り扱いについては、各サービスのプライバシーポリシーをご確認ください。</p>
              <ul>
                <li><strong>Google Analytics 4 / Google Search Console</strong>: ウェブサイトのアクセスデータ取得のため、OAuth 2.0 による認証連携を行います。取得したアクセストークンは暗号化して保存されます。</li>
                <li><strong>Firebase (Google Cloud)</strong>: ユーザー認証、データベース、ホスティングに利用しています。</li>
                <li><strong>Anthropic Claude / Google Gemini</strong>: AI分析機能の提供に利用しています。分析に使用するデータは匿名化された統計データであり、個人を特定できる情報は送信しません。</li>
                <li><strong>Stripe</strong>: 決済処理に利用する場合があります。クレジットカード情報は当社では保持せず、Stripeが安全に管理します。</li>
              </ul>

              <h2>4. Cookie の使用</h2>
              <p>
                本サービスでは、ユーザー認証の維持およびサービス利用状況の把握のためにCookieを使用しています。
                ユーザーはブラウザの設定によりCookieの受け入れを拒否することができますが、
                その場合、本サービスの一部機能が利用できなくなる可能性があります。
              </p>

              <h2>5. 個人情報の第三者提供</h2>
              <p>当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
              <ol>
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要な場合</li>
                <li>公衆衛生の向上または児童の健全な育成のために特に必要な場合</li>
                <li>国の機関等が法令の定める事務を遂行するために協力する必要がある場合</li>
              </ol>

              <h2>6. データの安全管理</h2>
              <p>当社は、個人情報の漏洩、紛失、改ざん等を防止するため、以下の安全管理措置を講じています。</p>
              <ul>
                <li>通信の暗号化（SSL/TLS）</li>
                <li>OAuth トークンの暗号化保存</li>
                <li>Firebase Security Rules によるアクセス制御</li>
                <li>管理者権限の適切な設定と管理</li>
                <li>定期的なセキュリティレビュー</li>
              </ul>

              <h2>7. データの保存期間</h2>
              <p>
                ユーザーの個人情報は、アカウントが有効な期間中保存されます。
                アカウント削除後は、法令で保存が義務付けられている場合を除き、合理的な期間内に削除します。
                分析データのキャッシュは一定期間後に自動的に削除されます。
              </p>

              <h2>8. ユーザーの権利</h2>
              <p>ユーザーは、自己の個人情報について以下の権利を有します。</p>
              <ol>
                <li><strong>開示請求</strong>: 当社が保有する個人情報の開示を請求できます。</li>
                <li><strong>訂正・追加・削除</strong>: 個人情報の内容が事実でない場合、訂正・追加・削除を請求できます。</li>
                <li><strong>利用停止</strong>: 個人情報の利用停止を請求できます。</li>
                <li><strong>アカウント削除</strong>: アカウント設定画面からいつでもアカウントを削除できます。</li>
              </ol>

              <h2>9. お問い合わせ</h2>
              <p>
                個人情報の取り扱いに関するお問い合わせは、本サービス内のお問い合わせ機能またはサポート窓口までご連絡ください。
              </p>

              <h2>10. プライバシーポリシーの変更</h2>
              <p>
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。
                重要な変更については、本サービス上での通知またはメールにてお知らせします。
              </p>

              <p className="mt-8 text-sm text-body-color">
                制定日: 2026年3月1日<br />
                最終更新日: 2026年3月1日
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
