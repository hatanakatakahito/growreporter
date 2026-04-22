import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * タクソノミー V2 への移行スクリプト
 *
 * 対象: sites コレクションの全ドキュメントで taxonomyVersion !== 2 のもの
 *
 * 処理:
 *   1. 旧 industry[] / siteType[] / sitePurpose[] / businessType から V2 4 軸を推定
 *      （taxonomyMigration.js のロジックを踏襲）
 *   2. 新フィールド (businessModel / industryMajor / industryMinor / siteRole /
 *      taxonomyVersion=2 / needsManualReclassify) を書き込み
 *   3. 旧フィールドを FieldValue.delete() で同時削除（legacy_* は作らない）
 *   4. 推定結果を taxonomyMigrationLogs/{siteId} に記録
 *
 * 実行方法:
 *   cd functions
 *   node --loader ./loader.mjs src/scripts/migrateTaxonomyV2.js            # 本番実行
 *   node --loader ./loader.mjs src/scripts/migrateTaxonomyV2.js --dry-run  # dry-run
 *
 * 注意:
 *   - 本番前に gcloud firestore export でフルバックアップを取得すること
 *   - dry-run では書き込みを行わず、推定結果だけを console.log で確認できる
 */

initializeApp();

const DRY_RUN = process.argv.includes('--dry-run');

// --- 推定マップ（src/constants/taxonomyMigration.js と同等。backend 独立版） ---

const SITE_ROLE_INFERENCE = {
  'corporate|branding': 'corporate',
  'corporate|lead': 'corporate',
  'corporate|media': 'corporate',
  'corporate|recruit': 'corporate',
  'corporate|internal': 'closed',
  'service|lead': 'service_product',
  'service|sales': 'service_product',
  'service|branding': 'service_product',
  'product|sales': 'service_product',
  'product|lead': 'service_product',
  'product|branding': 'service_product',
  'lp|lead': 'service_product',
  'lp|sales': 'service_product',
  'lp|branding': 'service_product',
  'ec|sales': 'ec',
  'ec|branding': 'ec',
  'ec|media': 'ec',
  'recruit|recruit': 'recruit',
  'recruit|branding': 'recruit',
  'recruit|lead': 'recruit',
  'owned_media|media': 'owned_media',
  'owned_media|branding': 'owned_media',
  'owned_media|lead': 'owned_media',
  'ir|ir': 'closed',
  'ir|branding': 'closed',
  'member|member': 'closed',
  'member|internal': 'closed',
  'intranet|internal': 'closed',
  'business_system|internal': 'closed',
  'global|branding': 'corporate',
  'global|lead': 'corporate',
};

const SITE_ROLE_FALLBACK_BY_TYPE = {
  corporate: 'corporate',
  service: 'service_product',
  product: 'service_product',
  lp: 'service_product',
  ec: 'ec',
  recruit: 'recruit',
  ir: 'closed',
  owned_media: 'owned_media',
  member: 'closed',
  intranet: 'closed',
  business_system: 'closed',
  global: 'corporate',
  other: 'other',
};

const SITE_ROLE_FALLBACK_BY_PURPOSE = {
  branding: 'corporate',
  lead: 'service_product',
  sales: 'service_product',
  recruit: 'recruit',
  media: 'owned_media',
  ir: 'closed',
  internal: 'closed',
  member: 'closed',
  other: 'other',
};

const BUSINESS_TYPE_TO_MODEL = {
  btob: 'b2b',
  btoc: 'b2c',
  btobtoc: 'b2b2c',
  other: 'other',
};

const INDUSTRY_V1_TO_V2 = {
  'SaaS・クラウド': { major: 'b2b_saas', minor: 'SaaS・クラウド' },
  'Webサービス': { major: 'b2b_saas', minor: 'Webサービス（BtoB）' },
  'EC・通販': { major: 'b2c_retail', minor: 'EC・通販' },
  'メディア・ポータル': { major: 'b2c_media', minor: 'メディア・ポータル' },
  'アプリ開発': { major: 'b2b_saas', minor: 'アプリ開発' },
  'Web制作・開発': { major: 'b2b_saas', minor: 'Web制作・開発' },
  'SI・システム開発': { major: 'b2b_saas', minor: 'SI・システム開発' },
  '通信・インフラ': { major: 'b2b_manufacturing', minor: '通信・インフラ' },
  '機械・電機': { major: 'b2b_manufacturing', minor: '機械・電機' },
  '食品・飲料': { major: 'b2c_retail', minor: '食品・飲料（メーカー）' },
  '化学・素材': { major: 'b2b_manufacturing', minor: '化学・素材' },
  '自動車・部品': { major: 'b2b_manufacturing', minor: '自動車・部品（BtoB）' },
  '建材・住設': { major: 'b2b_manufacturing', minor: '建材・住設' },
  'その他製造': { major: 'b2b_manufacturing', minor: 'その他製造' },
  'アパレル・ファッション': { major: 'b2c_retail', minor: 'アパレル・ファッション' },
  '食品・日用品': { major: 'b2c_retail', minor: '食品・日用品' },
  '家電・家具': { major: 'b2c_retail', minor: '家電・家具' },
  '雑貨・ギフト': { major: 'b2c_retail', minor: '雑貨・ギフト' },
  'その他小売': { major: 'b2c_retail', minor: 'その他小売' },
  '銀行・証券': { major: 'finance', minor: '銀行・証券' },
  '保険': { major: 'finance', minor: '保険' },
  'フィンテック': { major: 'finance', minor: 'フィンテック' },
  '不動産投資': { major: 'finance', minor: '不動産投資' },
  'その他金融': { major: 'finance', minor: 'その他金融' },
  '売買仲介': { major: 'local_service', minor: '不動産売買仲介' },
  '賃貸管理': { major: 'local_service', minor: '不動産賃貸管理' },
  '建設・工事': { major: 'local_service', minor: '建設・工事' },
  'リフォーム・リノベ': { major: 'local_service', minor: 'リフォーム・リノベ' },
  'その他不動産': { major: 'local_service', minor: 'その他' },
  'レストラン・カフェ': { major: 'local_service', minor: 'レストラン・カフェ' },
  'デリバリー・テイクアウト': { major: 'local_service', minor: 'デリバリー・テイクアウト' },
  'ホテル・旅館': { major: 'b2c_experience', minor: 'ホテル・旅館' },
  '旅行・観光': { major: 'b2c_experience', minor: '旅行・観光' },
  'その他飲食宿泊': { major: 'local_service', minor: 'その他' },
  '病院・クリニック': { major: 'local_service', minor: '病院・クリニック' },
  '歯科': { major: 'local_service', minor: '歯科' },
  '介護・福祉': { major: 'local_service', minor: '介護・福祉' },
  '美容・エステ': { major: 'local_service', minor: '美容・エステ' },
  '美容室・サロン': { major: 'local_service', minor: '美容室・サロン' },
  '薬局・ドラッグ': { major: 'local_service', minor: '薬局・ドラッグ' },
  'その他医療': { major: 'local_service', minor: 'その他' },
  '学校・大学': { major: 'public_education', minor: '学校・大学' },
  '学習塾・予備校': { major: 'local_service', minor: '学習塾・予備校' },
  'オンライン講座': { major: 'b2c_experience', minor: 'オンライン講座' },
  '資格・研修': { major: 'b2c_experience', minor: '資格・研修' },
  'その他教育': { major: 'public_education', minor: 'その他教育' },
  '弁護士・法律事務所': { major: 'professional', minor: '弁護士・法律事務所' },
  '税理士・会計事務所': { major: 'professional', minor: '税理士・会計事務所' },
  '社労士・行政書士': { major: 'professional', minor: '社労士・行政書士' },
  '経営コンサルティング': { major: 'professional', minor: '経営コンサルティング' },
  'ITコンサルティング': { major: 'professional', minor: 'ITコンサルティング' },
  'その他士業': { major: 'professional', minor: 'その他士業' },
  '人材紹介・派遣': { major: 'professional', minor: '人材紹介・派遣' },
  '広告代理店': { major: 'professional', minor: '広告代理店' },
  'PR・マーケティング': { major: 'professional', minor: 'PR・マーケティング' },
  '出版・メディア': { major: 'b2c_media', minor: '出版・メディア' },
  '映像・デザイン': { major: 'professional', minor: '映像・デザイン' },
  'その他広告': { major: 'professional', minor: 'その他' },
  '清掃・メンテナンス': { major: 'local_service', minor: '清掃・メンテナンス' },
  '冠婚葬祭': { major: 'local_service', minor: '冠婚葬祭' },
  'レンタル・リース': { major: 'b2c_experience', minor: 'レンタル・リース' },
  'フィットネス・スポーツ': { major: 'local_service', minor: 'フィットネス・スポーツ' },
  'ペット関連': { major: 'local_service', minor: 'ペット関連' },
  'その他サービス': { major: 'local_service', minor: 'その他' },
  '自治体・行政': { major: 'public_education', minor: '自治体・行政' },
  '公的機関': { major: 'public_education', minor: '公的機関' },
  'NPO・NGO': { major: 'public_education', minor: 'NPO・NGO' },
  '業界団体': { major: 'public_education', minor: '業界団体' },
  'その他団体': { major: 'public_education', minor: 'その他団体' },
  'その他': { major: 'public_education', minor: 'その他' },
};

// --- 推定関数 ---

function inferSiteRole(siteTypeArr, sitePurposeArr) {
  const t = Array.isArray(siteTypeArr) ? siteTypeArr : [];
  const p = Array.isArray(sitePurposeArr) ? sitePurposeArr : [];
  const conflict = t.length > 1 || p.length > 1;
  const firstT = t[0];
  const firstP = p[0];
  if (firstT && firstP) {
    const hit = SITE_ROLE_INFERENCE[`${firstT}|${firstP}`];
    if (hit) return { role: hit, confident: !conflict };
  }
  if (firstT && SITE_ROLE_FALLBACK_BY_TYPE[firstT]) {
    return { role: SITE_ROLE_FALLBACK_BY_TYPE[firstT], confident: !conflict };
  }
  if (firstP && SITE_ROLE_FALLBACK_BY_PURPOSE[firstP]) {
    return { role: SITE_ROLE_FALLBACK_BY_PURPOSE[firstP], confident: !conflict };
  }
  return { role: 'other', confident: false };
}

function inferIndustry(industryArr) {
  const arr = Array.isArray(industryArr) ? industryArr : [];
  const first = arr[0];
  if (!first) return { major: '', minor: '', confident: false };
  const mapped = INDUSTRY_V1_TO_V2[first];
  if (mapped) return { ...mapped, confident: arr.length === 1 };
  return { major: 'public_education', minor: 'その他', confident: false };
}

function inferBusinessModel(businessType, siteRole) {
  if (businessType && BUSINESS_TYPE_TO_MODEL[businessType]) {
    return { model: BUSINESS_TYPE_TO_MODEL[businessType], confident: true };
  }
  switch (siteRole) {
    case 'ec':
      return { model: 'b2c', confident: false };
    case 'recruit':
    case 'closed':
      return { model: 'b2b', confident: false };
    default:
      return { model: '', confident: false };
  }
}

// --- メイン処理 ---

async function migrateTaxonomyV2() {
  const db = getFirestore();

  console.log(`[migrateTaxonomyV2] 開始 (dryRun=${DRY_RUN})`);

  const snapshot = await db.collection('sites').get();
  console.log(`[migrateTaxonomyV2] 対象サイト候補: ${snapshot.size}件`);

  let skipped = 0;
  let migrated = 0;
  let needsManual = 0;
  let errors = 0;

  for (const siteDoc of snapshot.docs) {
    const siteId = siteDoc.id;
    const data = siteDoc.data() || {};

    if (Number(data.taxonomyVersion) === 2) {
      skipped++;
      continue;
    }

    try {
      const legacyIndustry = Array.isArray(data.industry) ? data.industry : (data.industry ? [data.industry] : []);
      const legacySiteType = Array.isArray(data.siteType) ? data.siteType : (data.siteType ? [data.siteType] : []);
      const legacySitePurpose = Array.isArray(data.sitePurpose) ? data.sitePurpose : (data.sitePurpose ? [data.sitePurpose] : []);
      const legacyBusinessType = data.businessType || '';

      const roleResult = inferSiteRole(legacySiteType, legacySitePurpose);
      const industryResult = inferIndustry(legacyIndustry);
      const bmResult = inferBusinessModel(legacyBusinessType, roleResult.role);

      const confident =
        roleResult.confident && industryResult.confident && bmResult.confident;

      const result = {
        businessModel: bmResult.model || '',
        industryMajor: industryResult.major || '',
        industryMinor: industryResult.minor || '',
        siteRole: roleResult.role || 'other',
        needsManualReclassify: !confident,
      };

      if (!result.businessModel) {
        // 推定不能時は空のままで needsManualReclassify: true
        result.needsManualReclassify = true;
      }

      console.log(
        `[migrateTaxonomyV2] ${siteId}: ${data.siteName || '(no name)'}`,
        JSON.stringify({
          legacy: {
            industry: legacyIndustry,
            siteType: legacySiteType,
            sitePurpose: legacySitePurpose,
            businessType: legacyBusinessType,
          },
          v2: result,
        })
      );

      if (result.needsManualReclassify) needsManual++;

      if (DRY_RUN) {
        migrated++;
        continue;
      }

      // 本番書き込み: V2 フィールド + legacy 削除
      await siteDoc.ref.update({
        businessModel: result.businessModel,
        industryMajor: result.industryMajor,
        industryMinor: result.industryMinor,
        siteRole: result.siteRole,
        taxonomyVersion: 2,
        needsManualReclassify: result.needsManualReclassify,
        // 旧フィールドを即削除
        industry: FieldValue.delete(),
        siteType: FieldValue.delete(),
        sitePurpose: FieldValue.delete(),
        businessType: FieldValue.delete(),
        taxonomyMigratedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('taxonomyMigrationLogs').add({
        siteId,
        siteName: data.siteName || '',
        siteUrl: data.siteUrl || '',
        legacy: {
          industry: legacyIndustry,
          siteType: legacySiteType,
          sitePurpose: legacySitePurpose,
          businessType: legacyBusinessType,
        },
        v2: result,
        confidence: {
          role: roleResult.confident,
          industry: industryResult.confident,
          businessModel: bmResult.confident,
        },
        needsManualReclassify: result.needsManualReclassify,
        migratedAt: FieldValue.serverTimestamp(),
      });

      migrated++;
    } catch (error) {
      console.error(`[migrateTaxonomyV2] ${siteId} エラー:`, error);
      errors++;
    }
  }

  console.log('[migrateTaxonomyV2] 完了');
  console.log(`  スキップ(既にV2): ${skipped}`);
  console.log(`  移行: ${migrated}`);
  console.log(`  要再分類フラグ付与: ${needsManual}`);
  console.log(`  エラー: ${errors}`);
  if (DRY_RUN) {
    console.log('  ※ dry-run のため実際の書き込みは行っていません');
  }
}

migrateTaxonomyV2()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrateTaxonomyV2] 致命的エラー:', err);
    process.exit(1);
  });
