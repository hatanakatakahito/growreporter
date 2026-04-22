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
  // IT・Web・通信 → it_communication
  'SaaS・クラウド': { major: 'it_communication', minor: 'SaaS・クラウドサービス' },
  'Webサービス': { major: 'it_communication', minor: 'Webサービス・ポータル' },
  'EC・通販': { major: 'retail_ec', minor: 'EC・通販' },
  'メディア・ポータル': { major: 'media_advertising', minor: 'Webメディア・キュレーション' },
  'アプリ開発': { major: 'it_communication', minor: 'アプリ開発' },
  'Web制作・開発': { major: 'it_communication', minor: 'Web制作・ホームページ制作' },
  'SI・システム開発': { major: 'it_communication', minor: '受託開発・SI' },
  '通信・インフラ': { major: 'it_communication', minor: '通信キャリア・ISP' },
  // 製造業 → manufacturer
  '機械・電機': { major: 'manufacturer', minor: '機械・電機・精密機器' },
  '食品・飲料': { major: 'manufacturer', minor: '食品・飲料(メーカー)' },
  '化学・素材': { major: 'manufacturer', minor: '化学・素材・繊維' },
  '自動車・部品': { major: 'manufacturer', minor: '自動車・輸送機器' },
  '建材・住設': { major: 'manufacturer', minor: '建材・住宅設備' },
  'その他製造': { major: 'manufacturer', minor: 'その他' },
  // 小売・EC → retail_ec
  'アパレル・ファッション': { major: 'retail_ec', minor: 'アパレル・ファッション小売' },
  '食品・日用品': { major: 'retail_ec', minor: 'スーパー・コンビニ' },
  '家電・家具': { major: 'retail_ec', minor: '専門店(家電・家具等)' },
  '雑貨・ギフト': { major: 'retail_ec', minor: '専門店(家電・家具等)' },
  'その他小売': { major: 'retail_ec', minor: 'その他' },
  // 金融・保険 → finance
  '銀行・証券': { major: 'finance', minor: '銀行' },
  '保険': { major: 'finance', minor: '生命保険・損害保険' },
  'フィンテック': { major: 'finance', minor: 'FinTech・金融サービス' },
  '不動産投資': { major: 'finance', minor: '不動産投資・投資運用' },
  'その他金融': { major: 'finance', minor: 'その他' },
  // 不動産・建設 → realestate_construction
  '売買仲介': { major: 'realestate_construction', minor: '不動産売買・仲介' },
  '賃貸管理': { major: 'realestate_construction', minor: '不動産賃貸・管理' },
  '建設・工事': { major: 'realestate_construction', minor: '建設・ゼネコン' },
  'リフォーム・リノベ': { major: 'realestate_construction', minor: 'リフォーム・リノベーション' },
  'その他不動産': { major: 'realestate_construction', minor: 'その他' },
  // 飲食・宿泊 → food_beverage / entertainment
  'レストラン・カフェ': { major: 'food_beverage', minor: 'レストラン・カフェ' },
  'デリバリー・テイクアウト': { major: 'food_beverage', minor: 'デリバリー・テイクアウト' },
  'ホテル・旅館': { major: 'entertainment', minor: 'ホテル・旅館' },
  '旅行・観光': { major: 'entertainment', minor: '旅行・観光業' },
  'その他飲食宿泊': { major: 'food_beverage', minor: 'その他' },
  // 医療・福祉・美容 → healthcare / beauty_lifestyle
  '病院・クリニック': { major: 'healthcare', minor: '病院・クリニック(医科)' },
  '歯科': { major: 'healthcare', minor: '歯科・歯科医院' },
  '介護・福祉': { major: 'healthcare', minor: '介護・福祉・障害者支援' },
  '美容・エステ': { major: 'beauty_lifestyle', minor: 'エステ・ネイル・サロン' },
  '美容室・サロン': { major: 'beauty_lifestyle', minor: '美容室・理容' },
  '薬局・ドラッグ': { major: 'healthcare', minor: '調剤薬局・ドラッグ' },
  'その他医療': { major: 'healthcare', minor: 'その他' },
  // 教育・スクール → education
  '学校・大学': { major: 'education', minor: '学校・大学・専門学校' },
  '学習塾・予備校': { major: 'education', minor: '学習塾・予備校' },
  'オンライン講座': { major: 'education', minor: 'オンライン教育・e-learning' },
  '資格・研修': { major: 'education', minor: '資格・スキル講座' },
  'その他教育': { major: 'education', minor: 'その他' },
  // 士業・コンサルティング → consulting_professional
  '弁護士・法律事務所': { major: 'consulting_professional', minor: '弁護士・法律事務所' },
  '税理士・会計事務所': { major: 'consulting_professional', minor: '税理士・会計事務所' },
  '社労士・行政書士': { major: 'consulting_professional', minor: '社労士・行政書士' },
  '経営コンサルティング': { major: 'consulting_professional', minor: '経営・戦略コンサル' },
  'ITコンサルティング': { major: 'consulting_professional', minor: 'IT・システムコンサル' },
  'その他士業': { major: 'consulting_professional', minor: 'その他士業' },
  // 人材・広告・メディア → hr_bpo / media_advertising
  '人材紹介・派遣': { major: 'hr_bpo', minor: '人材紹介・人材派遣' },
  '広告代理店': { major: 'media_advertising', minor: '広告代理店・マーケティング' },
  'PR・マーケティング': { major: 'media_advertising', minor: 'PR・広報支援' },
  '出版・メディア': { major: 'media_advertising', minor: '出版・新聞' },
  '映像・デザイン': { major: 'media_advertising', minor: 'デザイン・クリエイティブ' },
  'その他広告': { major: 'media_advertising', minor: 'その他' },
  // サービス業 → other_services / beauty_lifestyle / entertainment
  '清掃・メンテナンス': { major: 'other_services', minor: '清掃・ビルメンテナンス' },
  '冠婚葬祭': { major: 'beauty_lifestyle', minor: 'ブライダル・冠婚葬祭' },
  'レンタル・リース': { major: 'other_services', minor: 'レンタル・リース' },
  'フィットネス・スポーツ': { major: 'entertainment', minor: 'スポーツ・フィットネス' },
  'ペット関連': { major: 'beauty_lifestyle', minor: 'ペット関連' },
  'その他サービス': { major: 'other_services', minor: 'その他' },
  // 官公庁・団体 → public_nonprofit
  '自治体・行政': { major: 'public_nonprofit', minor: '官公庁・自治体' },
  '公的機関': { major: 'public_nonprofit', minor: '公的機関・独立行政法人' },
  'NPO・NGO': { major: 'public_nonprofit', minor: 'NPO・NGO・財団' },
  '業界団体': { major: 'public_nonprofit', minor: '業界団体・協会' },
  'その他団体': { major: 'public_nonprofit', minor: 'その他' },
  // その他
  'その他': { major: 'other_services', minor: 'その他' },
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
  return { major: 'other_services', minor: 'その他', confident: false };
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
