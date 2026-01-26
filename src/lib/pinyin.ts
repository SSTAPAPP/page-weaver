import { pinyin } from 'pinyin-pro';

/**
 * 获取汉字的拼音首字母
 */
export function getPinyinFirstLetters(text: string): string {
  const result = pinyin(text, { pattern: 'first', toneType: 'none' });
  return result.replace(/\s/g, '').toLowerCase();
}

/**
 * 智能搜索会员 - 支持拼音首字母和手机号
 */
export function matchMemberSearch(
  name: string,
  phone: string,
  query: string
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // 姓名完整匹配
  if (name.toLowerCase().includes(q)) return true;

  // 手机号匹配（前四位或后四位）
  if (phone.startsWith(q) || phone.endsWith(q)) return true;

  // 手机号包含匹配
  if (phone.includes(q)) return true;

  // 拼音首字母匹配
  const pinyinLetters = getPinyinFirstLetters(name);
  if (pinyinLetters.includes(q)) return true;

  return false;
}
