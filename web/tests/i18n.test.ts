import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERSONA_IDS } from '../src/lib/art';
import { COPY, personaIn } from '../src/lib/i18n';
import {
  ACHIEVEMENT_ORDER, calendarMonths, sharePost, shareLink, timeline, visitSnapshot, X_MAX, xLength, xIntentUrl, type WrappedData,
} from '../src/lib/wrapped';

const load = (name: string) =>
  JSON.parse(readFileSync(path.join(__dirname, '../fixtures', `${name}.json`), 'utf8')) as WrappedData;
const FIXTURES = ['full', 'no-builder-no-defi', 'day-one', 'whale', 'newcomer'];
const { en, ko } = COPY;

describe('English copy', () => {
  it('is the wrapped.ts wording, unchanged', () => {
    const d = load('full');
    expect(en.sharePost(d)).toBe(sharePost(d));
    expect(xIntentUrl(d)).toBe(xIntentUrl(d, en.sharePost));
    expect(timeline(d, en.milestone, en.firstTransaction)).toEqual(timeline(d));
  });
});

describe('Korean copy', () => {
  it('names every persona and achievement', () => {
    for (const id of PERSONA_IDS) {
      expect(ko.personaTitle(id, 'EN'), id).not.toBe('EN');
      expect(ko.personaLine(id, 'EN'), id).not.toBe('EN');
    }
    for (const id of ACHIEVEMENT_ORDER) {
      const a = ko.achievement(id);
      expect(a.title, id).not.toBe(en.achievement(id).title);
      expect(a.rule, id).toMatch(/[가-힣]/);
      expect(a.text(3, ['gno.land/r/demo/boards']), id).toMatch(/[가-힣]/);
    }
  });

  it('translates the persona the batch sent in English', () => {
    const d = load('full');
    const p = personaIn(ko, d.persona)!;
    expect(p.id).toBe(d.persona!.id);
    expect(p.title).not.toBe(d.persona!.title);
    expect(personaIn(en, d.persona)).toEqual(d.persona);
  });

  it('share post: Korean, with the link, and within X’s limit', () => {
    for (const f of FIXTURES) {
      const d = load(f);
      const post = ko.sharePost(d);
      expect(post, f).toMatch(/^나의 메인넷 시즌 1, gno\.land/);
      expect(post, f).toContain(shareLink(d));
      expect(xLength(post), f).toBeLessThanOrEqual(X_MAX);
    }
    const huge = ko.sharePost({ ...load('whale'), txCount: 123456789, deployedRealms: Array(99999).fill('gno.land/r/x'), swaps: { ...load('whale').swaps, count: 987654321 } });
    expect(xLength(huge)).toBeLessThanOrEqual(X_MAX);
  });

  it('dates, months and the timeline', () => {
    expect(ko.date('2026-10-04')).toBe('2026년 10월 4일');
    expect(ko.short_('2026-09-12')).toBe('9월 12일');
    expect(ko.week(0, '2026-09-12')).toBe('9월 12일–18일');
    expect(ko.week(2, '2026-09-12')).toBe('9월 26일–10월 2일');
    const d = load('full');
    expect(calendarMonths(d, ko.month)[0].label).toBe('9월');
    expect(timeline(d, ko.milestone, ko.firstTransaction)[0].label).toBe('첫 트랜잭션');
  });

  it('since your last visit', () => {
    const d = load('full');
    const prev = { ...visitSnapshot(d), txCount: d.txCount - 5, achievements: [] };
    const lines = ko.visitDiff(prev, d);
    expect(lines[0]).toBe('트랜잭션 +5');
    expect(lines.some((l) => l.startsWith('새 업적: '))).toBe(true);
  });

  it('success rate and GnoSwap detail', () => {
    expect(ko.successText(load('full'))).toMatch(/^트랜잭션의 \d+%가 성공했어요\(실패 7건\)\.$/);
    expect(ko.topPairText(load('full'))).toBe('GNOT ↔ GNS · 스왑 24회');
    expect(ko.governanceLines(load('whale')).map((l) => l.label)).toEqual(['투표', '제안', 'GNS 위임']);
  });
});

describe('Korean next up and clock', () => {
  it('has its own words for both', () => {
    expect(ko.progressText({ id: 'century', have: 77, need: 100 })).toBe('트랜잭션 77/100회. 23회 남았어요.');
    expect(ko.progressText({ id: 'triple-threat', have: 1, need: 3, missing: ['collect', 'play'] })).toBe('1/3 완료. 남은 것: NFT, 온체인 게임.');
    for (const p of load('newcomer').progress!) expect(ko.progressText(p), p.id).toMatch(/[가-힣]/);
    for (const id of ['night-owl', 'early-bird', 'afternoon', 'evening'] as const) expect(ko.chronotype(id)).not.toBe(en.chronotype(id));
    expect(ko.chronotypeLine({ from: 0, share: 0.6 })).toBe('트랜잭션의 60%가 00:00–06:00 사이에 있었어요.');
    expect(ko.clockTz('UTC+9', false)).toBe('내 시간대(UTC+9) 기준이에요.');
  });
});

describe('Korean story outro', () => {
  it('picks 이었어요 or 였어요 by how the season number ends', () => {
    expect(ko.story.outro(false, { id: 's1', start: '', end: '' }, true)).toBe('나의 메인넷 시즌 1이었어요.');
    expect(ko.story.outro(true, { id: 's2', start: '', end: '' }, false)).toBe('지금까지 메인넷 시즌 2였어요.');
  });
});
