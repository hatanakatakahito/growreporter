import React, { useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import logoImg from '../assets/img/logo.svg';

export default function PrivacyPolicy() {
  useEffect(() => { setPageTitle('プライバシーポリシー'); }, []);

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
              プライバシーポリシー
            </h1>

            <div className="prose prose-sm max-w-none text-dark [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1">
              <p>
                GrowGroup株式会社（以下「当社」）は、当社が提供するグローレポーター（以下「本サービス」）におけるユーザーの個人情報の保護を重要と考え、
                以下のとおりプライバシーポリシーを定めます。
              </p>

              <h2>1. 収集する個人情報</h2>
              <p>本サービスでは、以下の個人情報を収集します。</p>

              <h3>1-1. ユーザーから直接提供される情報</h3>
              <ul>
                <li>氏名</li>
                <li>メールアドレス</li>
                <li>電話番号</li>
                <li>会社名・組織名</li>
                <li>パスワード（暗号化して保存）</li>
              </ul>

              <h3>1-2. 外部認証サービスから取得する情報</h3>
              <ul>
                <li>Google アカウント情報（Google SSO 認証時: 表示名、メールアドレス、プロフィール画像）</li>
                <li>Microsoft アカウント情報（Microsoft SSO 認証時: 表示名、メールアドレス、プロフィール画像）</li>
                <li>Google Analytics 4 / Google Search Console の連携に必要なOAuth認証情報（アクセストークン、リフレッシュトークン）</li>
              </ul>

              <h3>1-3. サービス利用に伴い自動的に収集する情報</h3>
              <ul>
                <li>本サービスの利用履歴（アクセスログ、操作履歴、最終ログイン日時等）</li>
                <li>ユーザーが登録したウェブサイトのスクレイピングデータ（HTML構造、メタ情報、テキスト内容、フォーム構成等）</li>
                <li>Google Analytics 4 から取得したアクセス解析データ</li>
                <li>Google Search Console から取得した検索パフォーマンスデータ</li>
              </ul>

              <h3>1-4. 決済に関する情報</h3>
              <ul>
                <li>請求書払いに必要な情報（請求先名称、住所等）</li>
              </ul>

              <h2>2. 個人情報の利用目的</h2>
              <p>収集した個人情報は、以下の目的で利用します。</p>
              <ol>
                <li>本サービスの提供・運営</li>
                <li>ユーザーアカウントの管理・認証</li>
                <li>Google Analytics 4 / Google Search Console データの取得・分析</li>
                <li>ウェブサイトのスクレイピングによるデータ取得および AI 分析・改善提案の生成</li>
                <li>AI分析結果および改善提案の表示</li>
                <li>週次レポート、月次レポート、アラート通知等のメール送信</li>
                <li>分析データの Excel / PowerPoint 形式でのエクスポート</li>
                <li>利用料金の請求・決済処理</li>
                <li>お問い合わせへの対応</li>
                <li>本サービスの改善・新機能の開発</li>
                <li>メンテナンス情報、重要な変更等の通知</li>
                <li>利用規約に違反する行為への対応</li>
              </ol>

              <h2>3. マルチメンバー制度におけるデータ共有</h2>
              <p>
                本サービスのマルチメンバー機能を利用する場合、アカウントオーナーが招待したメンバーは、
                当該アカウントに登録されたサイトのアクセス解析データ、AI分析結果、レポート等を閲覧することができます。
                アカウントオーナーは、メンバーの招待にあたり、当該メンバーにデータが共有されることについて同意するものとします。
              </p>

              <h2>4. 外部サービスとの連携</h2>
              <p>本サービスでは、以下の外部サービスを利用しています。各サービスにおける個人情報の取り扱いについては、各サービスのプライバシーポリシーをご確認ください。</p>
              <ul>
                <li><strong>Google Analytics 4 / Google Search Console</strong>: ウェブサイトのアクセスデータ取得のため、OAuth 2.0 による認証連携を行います。取得したアクセストークンおよびリフレッシュトークンは暗号化して保存されます。</li>
                <li><strong>Firebase (Google Cloud)</strong>: ユーザー認証、データベース、ファイルストレージ、ホスティングに利用しています。</li>
                <li><strong>Anthropic Claude / Google Gemini</strong>: AI分析機能の提供に利用しています。分析に使用するデータは匿名化された統計データおよびサイト構造データであり、個人を特定できる情報は送信しません。</li>
                <li><strong>Google アカウント認証</strong>: Google SSO によるユーザー認証に利用しています。</li>
                <li><strong>Microsoft アカウント認証</strong>: Microsoft SSO によるユーザー認証に利用しています。</li>
              </ul>

              <h2>5. Cookie の使用</h2>
              <p>
                本サービスでは、ユーザー認証の維持およびサービス利用状況の把握のためにCookieを使用しています。
                ユーザーはブラウザの設定によりCookieの受け入れを拒否することができますが、
                その場合、本サービスの一部機能が利用できなくなる可能性があります。
              </p>

              <h2>6. 個人情報の第三者提供</h2>
              <p>当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
              <ol>
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要な場合</li>
                <li>公衆衛生の向上または児童の健全な育成のために特に必要な場合</li>
                <li>国の機関等が法令の定める事務を遂行するために協力する必要がある場合</li>
                <li>マルチメンバー機能により、同一アカウント内のメンバー間でサイトデータが共有される場合</li>
              </ol>

              <h2>7. データの安全管理</h2>
              <p>当社は、個人情報の漏洩、紛失、改ざん等を防止するため、以下の安全管理措置を講じています。</p>
              <ul>
                <li>通信の暗号化（SSL/TLS）</li>
                <li>OAuth トークンの暗号化保存</li>
                <li>Firebase Security Rules によるアクセス制御</li>
                <li>管理者権限の適切な設定と管理（管理者・エディタ・ビューア等のロールベースアクセス制御）</li>
                <li>定期的なセキュリティレビュー</li>
              </ul>

              <h2>8. データの保存期間</h2>
              <ol>
                <li>ユーザーの個人情報は、アカウントが有効な期間中保存されます。</li>
                <li>アカウント削除後は、法令で保存が義務付けられている場合を除き、合理的な期間内に削除します。</li>
                <li>分析データのキャッシュは一定期間後に自動的に削除されます。</li>
                <li>AIキャッシュ（AI分析結果のキャッシュ）は定期的にクリーンアップされます。</li>
                <li>スクレイピングデータは、サイト登録が有効な期間中保存され、サイト削除後に削除されます。</li>
              </ol>

              <h2>9. ユーザーの権利</h2>
              <p>ユーザーは、自己の個人情報について以下の権利を有します。</p>
              <ol>
                <li><strong>開示請求</strong>: 当社が保有する個人情報の開示を請求できます。</li>
                <li><strong>訂正・追加・削除</strong>: 個人情報の内容が事実でない場合、訂正・追加・削除を請求できます。</li>
                <li><strong>利用停止</strong>: 個人情報の利用停止を請求できます。</li>
                <li><strong>メール配信停止</strong>: 週次レポート、月次レポート、アラート通知はアカウント設定から個別に配信停止できます。</li>
                <li><strong>アカウント削除</strong>: アカウント設定画面からいつでもアカウントを削除できます。</li>
              </ol>

              <h2>10. お問い合わせ</h2>
              <p>
                個人情報の取り扱いに関するお問い合わせは、以下の窓口までご連絡ください。
              </p>
              <ul>
                <li>メール: <a href="mailto:info@grow-reporter.com" className="text-primary hover:underline">info@grow-reporter.com</a></li>
              </ul>

              <h2>11. プライバシーポリシーの変更</h2>
              <p>
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。
                重要な変更については、本サービス上での通知またはメールにてお知らせします。
              </p>

              <p className="mt-8 text-sm text-body-color">
                制定日: 2026年3月1日<br />
                最終更新日: 2026年3月28日
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
