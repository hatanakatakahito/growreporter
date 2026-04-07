import { useState } from 'react';
import { format, addMonths } from 'date-fns';

/** 翌月〜6ヶ月先の月選択肢を生成 */
export function getStartMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = addMonths(now, i);
    const value = format(d, 'yyyy-MM');
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

/** 郵便番号をハイフン付き形式に整形 */
export function formatZipCode(value) {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
  }
  return digits;
}

/** 郵便番号から住所を自動補完 */
export async function fetchAddress(zipCode) {
  const cleaned = zipCode.replace(/[^0-9]/g, '');
  if (cleaned.length !== 7) return null;
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 200 && data.results?.length > 0) {
      const r = data.results[0];
      return { prefecture: r.address1, city: `${r.address2}${r.address3}` };
    }
  } catch {
    try {
      const res2 = await fetch(`https://api.zipaddress.net/?zipcode=${cleaned}`);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.code === 200 && data2.data) {
          return { prefecture: data2.data.pref, city: `${data2.data.city}${data2.data.town}` };
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

/** ビジネスプラン用フォーム初期値 */
export const BUSINESS_FORM_INITIAL = {
  department: '',
  lastName: '',
  firstName: '',
  zipCode: '',
  prefecture: '',
  city: '',
  building: '',
  paymentTiming: '',
  startDatePref: '',
  startMonth: '',
  message: '',
};

const requiredMark = <span className="text-red-500">*</span>;

/**
 * ビジネスプラン申込用の共用フォーム部品
 * UpgradeModal と Register の両方で使用
 */
export default function BusinessPlanFormFields({
  form,
  updateField,
  setForm,
  inputClass = 'w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white',
  labelClass = 'mb-1.5 block text-sm font-medium text-dark dark:text-white',
  showNameFields = true,
  showDepartmentField = true,
  showPhoneField = false,
  showEmailField = false,
  radioNamePrefix = '',
}) {
  const [isZipLoading, setIsZipLoading] = useState(false);

  const handleZipChange = async (e) => {
    const raw = e.target.value;
    const filtered = raw.replace(/[^0-9-]/g, '');
    const digits = filtered.replace(/[^0-9]/g, '');
    const formatted = formatZipCode(filtered);
    updateField('zipCode', formatted);

    if (digits.length === 7) {
      setIsZipLoading(true);
      const addr = await fetchAddress(digits);
      if (addr && setForm) {
        setForm(prev => ({ ...prev, prefecture: addr.prefecture, city: addr.city }));
      } else if (addr) {
        updateField('prefecture', addr.prefecture);
        updateField('city', addr.city);
      }
      setIsZipLoading(false);
    }
  };

  return (
    <>
      {/* 部署名 */}
      {showDepartmentField && (
        <div>
          <label className={labelClass}>部署名</label>
          <input type="text" value={form.department} onChange={(e) => updateField('department', e.target.value)}
            className={inputClass} placeholder="マーケティング部" />
        </div>
      )}

      {/* 姓・名 */}
      {showNameFields && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>姓 {requiredMark}</label>
            <input type="text" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} required
              className={inputClass} placeholder="山田" />
          </div>
          <div>
            <label className={labelClass}>名 {requiredMark}</label>
            <input type="text" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} required
              className={inputClass} placeholder="太郎" />
          </div>
        </div>
      )}

      {/* 電話番号 */}
      {showPhoneField && (
        <div>
          <label className={labelClass}>電話番号 {requiredMark}</label>
          <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required
            className={inputClass} placeholder="03-1234-5678" />
        </div>
      )}

      {/* メールアドレス */}
      {showEmailField && (
        <div>
          <label className={labelClass}>メールアドレス {requiredMark}</label>
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required
            className={inputClass} placeholder="example@company.com" />
        </div>
      )}

      {/* 住所 */}
      <div className="space-y-3">
        <h4 className="mt-8 text-sm font-medium text-dark dark:text-white border-b border-stroke pb-2 dark:border-dark-3">ご住所</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>郵便番号 {requiredMark}</label>
            <div className="relative">
              <input type="text" value={form.zipCode} onChange={handleZipChange} required
                maxLength={8} inputMode="numeric"
                className={inputClass} placeholder="123-4567" />
              {isZipLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>都道府県 {requiredMark}</label>
            <input type="text" value={form.prefecture} onChange={(e) => updateField('prefecture', e.target.value)} required
              className={inputClass} placeholder="東京都" />
          </div>
        </div>
        <div>
          <label className={labelClass}>市区町村・番地 {requiredMark}</label>
          <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} required
            className={inputClass} placeholder="渋谷区神宮前1-2-3" />
        </div>
        <div>
          <label className={labelClass}>建物名</label>
          <input type="text" value={form.building} onChange={(e) => updateField('building', e.target.value)}
            className={inputClass} placeholder="〇〇ビル 5F" />
        </div>
      </div>

      {/* 契約条件 */}
      <div className="space-y-3">
        <h4 className="mt-8 text-sm font-medium text-dark dark:text-white border-b border-stroke pb-2 dark:border-dark-3">ご契約条件</h4>
        <div>
          <label className={labelClass}>お支払い方法 {requiredMark}</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${form.paymentTiming === 'bulk' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' : 'border-stroke dark:border-dark-3 hover:border-gray-300'}`}>
              <input type="radio" name={`${radioNamePrefix}paymentTiming`} value="bulk" checked={form.paymentTiming === 'bulk'}
                onChange={(e) => updateField('paymentTiming', e.target.value)} required
                className="h-4 w-4 text-primary accent-primary" />
              <div>
                <div className="text-sm font-medium text-dark dark:text-white">一括請求</div>
                <div className="text-xs text-body-color dark:text-dark-6">年額一括でのお支払い</div>
              </div>
            </label>
            <label className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${form.paymentTiming === 'recurring' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' : 'border-stroke dark:border-dark-3 hover:border-gray-300'}`}>
              <input type="radio" name={`${radioNamePrefix}paymentTiming`} value="recurring" checked={form.paymentTiming === 'recurring'}
                onChange={(e) => updateField('paymentTiming', e.target.value)}
                className="h-4 w-4 text-primary accent-primary" />
              <div>
                <div className="text-sm font-medium text-dark dark:text-white">定期請求</div>
                <div className="text-xs text-body-color dark:text-dark-6">毎月のお支払い</div>
              </div>
            </label>
          </div>
        </div>
        <div>
          <label className={labelClass}>ご利用開始希望月 {requiredMark}</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${form.startDatePref === 'preferred' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' : 'border-stroke dark:border-dark-3 hover:border-gray-300'}`}>
              <input type="radio" name={`${radioNamePrefix}startDatePref`} value="preferred" checked={form.startDatePref === 'preferred'}
                onChange={(e) => updateField('startDatePref', e.target.value)} required
                className="h-4 w-4 text-primary accent-primary" />
              <div className="text-sm font-medium text-dark dark:text-white">希望あり</div>
            </label>
            <label className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${form.startDatePref === 'none' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' : 'border-stroke dark:border-dark-3 hover:border-gray-300'}`}>
              <input type="radio" name={`${radioNamePrefix}startDatePref`} value="none" checked={form.startDatePref === 'none'}
                onChange={(e) => { updateField('startDatePref', e.target.value); updateField('startMonth', ''); }}
                className="h-4 w-4 text-primary accent-primary" />
              <div className="text-sm font-medium text-dark dark:text-white">希望なし</div>
            </label>
          </div>
          {form.startDatePref === 'preferred' && (
            <div className="mt-3">
              <select
                value={form.startMonth}
                onChange={(e) => updateField('startMonth', e.target.value)}
                required
                className={inputClass}
              >
                <option value="">開始月を選択してください</option>
                {getStartMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <p className="mt-2 text-xs text-body-color dark:text-dark-6">
            <span className="font-bold underline">お申し込み月は無料</span>でお使いいただけます。課金は開始月の1日からとなります。
          </p>
        </div>
      </div>

      {/* 質問・要望 */}
      <div className="mt-8">
        <label className={labelClass}>ご質問・ご要望</label>
        <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} rows={3}
          className={inputClass} placeholder="ご不明点があればお気軽にお書きください" />
      </div>
    </>
  );
}
