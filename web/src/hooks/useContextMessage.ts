import { useMemo } from 'react';
import { Language } from './useSettings';

export type TimerState = 'work' | 'shortBreak' | 'longBreak';

/**
 * User statistics for personalized messages
 */
export interface UserStats {
  todayWorkSeconds: number;
  todaySessions: number;
  currentStreak: number;
  longestStreak: number;
  weekAvgSeconds: number; // Average daily work seconds over the past week
  yesterdaySeconds: number;
  totalSessions: number; // Total sessions ever completed
}

/**
 * Get rotation index based on seed
 */
function getRotationIndex(max: number, seed: number): number {
  return seed % max;
}

/**
 * Hook to get context-aware greeting message based on time, timer state, language, and user stats
 * Messages rotate every 10 seconds for variety
 * @param rotationTick - External tick value that changes every 10 seconds to trigger re-render
 * @param stats - User statistics for personalized messages
 */
export function useContextMessage(
  state: TimerState,
  isRunning: boolean,
  language: Language = 'ja',
  rotationTick: number = 0,
  stats?: UserStats
): string {
  return useMemo(() => {
    const hour = new Date().getHours();

    // Check for achievement messages first (these are special moments!)
    if (stats) {
      const achievementMsg = getAchievementMessage(stats, language, rotationTick);
      if (achievementMsg) {
        return achievementMsg;
      }
    }

    // State-specific messages take priority
    if (state === 'shortBreak') {
      return getShortBreakMessage(language, rotationTick, stats);
    }
    if (state === 'longBreak') {
      return getLongBreakMessage(language, rotationTick, stats);
    }

    // For work state
    if (!isRunning) {
      return getPausedMessage(hour, language, rotationTick, stats);
    }

    // Mix in stats-based encouragement during work
    if (stats && rotationTick % 3 === 0) {
      const encouragement = getEncouragementMessage(stats, language);
      if (encouragement) {
        return encouragement;
      }
    }

    return getTimeBasedMessage(hour, language, rotationTick);
  }, [state, isRunning, language, rotationTick, stats]);
}

/**
 * Achievement messages for special milestones
 */
function getAchievementMessage(stats: UserStats, lang: Language, tick: number): string | null {
  const todayHours = stats.todayWorkSeconds / 3600;
  const todayMinutes = stats.todayWorkSeconds / 60;

  // Check milestones (only show occasionally based on tick)
  if (tick % 6 !== 0) return null;

  if (lang === 'ja') {
    // First session ever!
    if (stats.totalSessions === 1) {
      return '🎉 記念すべき初セッション！素晴らしいスタート！';
    }
    // 10 sessions milestone
    if (stats.totalSessions === 10) {
      return '🏆 通算10セッション達成！習慣が身についてきた！';
    }
    // 50 sessions
    if (stats.totalSessions === 50) {
      return '⭐ 50セッション達成！ポモドーロの達人への道！';
    }
    // 100 sessions
    if (stats.totalSessions === 100) {
      return '👑 100セッション達成！レジェンドです！';
    }
    // Today's milestones
    if (todayHours >= 4 && todayHours < 4.5) {
      return '🔥 今日4時間突破！すごい集中力！';
    }
    if (todayHours >= 2 && todayHours < 2.5) {
      return '💪 2時間達成！絶好調ですね！';
    }
    if (todayMinutes >= 60 && todayMinutes < 65) {
      return '✨ 1時間達成！いいペースです！';
    }
    // Streak milestones
    if (stats.currentStreak === 7) {
      return '🔥 7日連続！1週間継続達成！';
    }
    if (stats.currentStreak === 30) {
      return '🏅 30日連続！1ヶ月継続、素晴らしい！';
    }
    if (stats.currentStreak === 3) {
      return '📈 3日連続！習慣になってきましたね！';
    }
  } else {
    // English
    if (stats.totalSessions === 1) {
      return '🎉 Your very first session! Great start!';
    }
    if (stats.totalSessions === 10) {
      return '🏆 10 sessions completed! Building great habits!';
    }
    if (stats.totalSessions === 50) {
      return '⭐ 50 sessions! On your way to mastery!';
    }
    if (stats.totalSessions === 100) {
      return '👑 100 sessions! You are a legend!';
    }
    if (todayHours >= 4 && todayHours < 4.5) {
      return '🔥 4 hours today! Incredible focus!';
    }
    if (todayHours >= 2 && todayHours < 2.5) {
      return '💪 2 hours done! You are on fire!';
    }
    if (todayMinutes >= 60 && todayMinutes < 65) {
      return '✨ 1 hour achieved! Great pace!';
    }
    if (stats.currentStreak === 7) {
      return '🔥 7-day streak! One week strong!';
    }
    if (stats.currentStreak === 30) {
      return '🏅 30-day streak! A month of dedication!';
    }
    if (stats.currentStreak === 3) {
      return '📈 3-day streak! Building momentum!';
    }
  }

  return null;
}

/**
 * Encouragement messages based on current stats
 */
function getEncouragementMessage(stats: UserStats, lang: Language): string | null {
  const todayHours = stats.todayWorkSeconds / 3600;

  if (lang === 'ja') {
    // Beating yesterday
    if (stats.todayWorkSeconds > stats.yesterdaySeconds && stats.yesterdaySeconds > 0) {
      return '昨日よりいいペース！その調子！';
    }
    // Above weekly average
    if (stats.todayWorkSeconds > stats.weekAvgSeconds && stats.weekAvgSeconds > 0) {
      return '週平均を超えてます！調子いいですね！';
    }
    // Long work day
    if (todayHours >= 3) {
      return 'たくさん集中できてますね。休憩も大事に';
    }
    // Maintaining streak
    if (stats.currentStreak >= 5) {
      return `${stats.currentStreak}日連続！継続は力なり`;
    }
  } else {
    if (stats.todayWorkSeconds > stats.yesterdaySeconds && stats.yesterdaySeconds > 0) {
      return 'Beating yesterday! Keep it up!';
    }
    if (stats.todayWorkSeconds > stats.weekAvgSeconds && stats.weekAvgSeconds > 0) {
      return 'Above your weekly average! Nice!';
    }
    if (todayHours >= 3) {
      return 'Great focus today! Remember to rest too.';
    }
    if (stats.currentStreak >= 5) {
      return `${stats.currentStreak}-day streak! Consistency is key!`;
    }
  }

  return null;
}

function getTimeBasedMessage(hour: number, lang: Language, tick: number): string {
  const idx = getRotationIndex(6, tick);

  if (lang === 'ja') {
    if (hour >= 6 && hour <= 10) {
      const msgs = [
        'おはようございます！今日も頑張りましょう',
        '朝の集中力は貴重です。活かしていきましょう',
        '素敵な朝ですね。良いスタートを切りましょう',
        '早起きは三文の徳。素晴らしい習慣です',
        '朝活お疲れ様です。一日の始まりに集中を',
        'モーニングセッション開始！気分上々？',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 11 && hour <= 13) {
      const msgs = [
        'お昼時ですね。あと少し頑張りましょう',
        'ランチ前のラストスパート！',
        '午前中の締めくくり、集中集中',
        'お腹空いてきた？もう少しで休憩です',
        '昼食前に一仕事、いい感じです',
        '午前の部、終盤戦です。ファイト！',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 14 && hour <= 17) {
      const msgs = [
        '午後も順調ですね。その調子！',
        '午後の眠気に負けず、素晴らしいです',
        '午後のゴールデンタイム、有効活用中',
        'この時間に集中できるのは才能です',
        '午後も絶好調！この波に乗っていこう',
        '夕方まであと少し。ペース配分も大事に',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 18 && hour <= 21) {
      const msgs = [
        'こんばんは、お疲れ様です',
        '夜のセッション、落ち着いて取り組めますね',
        '夜の集中タイム。静かな時間を活用',
        '一日の締めくくりに集中を',
        '夜の作業、自分のペースで進めましょう',
        '日中お疲れ様。夜もう一踏ん張り？',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 22 || hour <= 5) {
      const msgs = [
        '夜更かしですね。無理しないで',
        '深夜の集中、ほどほどにね',
        '遅い時間までお疲れ様です',
        '夜型さんですね。水分補給も忘れずに',
        '静かな夜、集中しやすいですよね',
        '深夜作業、体調には気をつけて',
      ];
      return msgs[idx % msgs.length];
    }
    return '集中していきましょう！';
  }

  // English
  if (hour >= 6 && hour <= 10) {
    const msgs = [
      "Good morning! Let's start the day strong.",
      'Morning focus is golden. Make it count!',
      "Rise and grind! You're off to a great start.",
      'Early bird catches the worm. Nice one!',
      'Morning productivity at its finest.',
      "Fresh start, fresh mind. Let's go!",
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 11 && hour <= 13) {
    const msgs = [
      'Lunchtime is near. Stay focused!',
      "Pre-lunch sprint! You've got this.",
      'Wrapping up the morning strong.',
      'Almost lunch break. Finish this session!',
      'Midday momentum. Keep it rolling!',
      'Morning finale! Strong finish ahead.',
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 14 && hour <= 17) {
    const msgs = [
      "Afternoon push! You're doing great.",
      'Beating the afternoon slump. Impressive!',
      'Afternoon productivity mode: activated.',
      'Prime time for deep work. Crush it!',
      'Afternoon excellence in progress.',
      "Evening's approaching. Great progress!",
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 18 && hour <= 21) {
    const msgs = [
      'Evening session. Thanks for your dedication.',
      'Night owl mode engaged. Nice focus!',
      'Evening work session. Steady and calm.',
      'Winding down the day productively.',
      "Evening dedication. That's commitment!",
      'After-hours hustle. Respect!',
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 22 || hour <= 5) {
    const msgs = [
      "Late night work? Don't forget to rest.",
      'Burning the midnight oil. Stay hydrated!',
      'Night shift vibes. Take care of yourself.',
      'The quiet hours. Perfect for focus.',
      'Late night dedication. Impressive!',
      'Deep night session. Rest soon, okay?',
    ];
    return msgs[idx % msgs.length];
  }
  return 'Keep up the great work!';
}

function getPausedMessage(hour: number, lang: Language, tick: number, stats?: UserStats): string {
  const idx = getRotationIndex(4, tick);

  // Stats-based paused messages (show occasionally)
  if (stats && tick % 2 === 1) {
    if (lang === 'ja') {
      if (stats.currentStreak > 0 && stats.todayWorkSeconds === 0) {
        return `${stats.currentStreak}日連続中！今日も始めますか？`;
      }
      if (stats.todaySessions > 0) {
        return `今日${stats.todaySessions}セッション完了。次もいきますか？`;
      }
    } else {
      if (stats.currentStreak > 0 && stats.todayWorkSeconds === 0) {
        return `${stats.currentStreak}-day streak! Ready to continue?`;
      }
      if (stats.todaySessions > 0) {
        return `${stats.todaySessions} session${stats.todaySessions > 1 ? 's' : ''} today. Another one?`;
      }
    }
  }

  if (lang === 'ja') {
    if (hour >= 6 && hour <= 10) {
      const msgs = [
        '朝のセッション、始めますか？',
        'おはようございます！準備はOK？',
        '朝イチの集中、最高ですよ',
        'モーニングセッション待機中...',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 11 && hour <= 13) {
      const msgs = [
        'お昼前にもうひと頑張り？',
        'ランチ前の一仕事、始めますか？',
        '午前中のラストスパートいきましょう',
        'お腹空く前にもう一本！',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 14 && hour <= 17) {
      const msgs = [
        '午後のセッション、準備OK？',
        '午後も頑張りますか？',
        '眠気覚ましに集中タイム？',
        '午後のスタート、切りましょう',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 18 && hour <= 21) {
      const msgs = [
        '夜のセッション、始めましょうか',
        '夜の集中タイム、準備完了？',
        '今夜も頑張りますか？',
        '夜の作業、スタートしますか？',
      ];
      return msgs[idx % msgs.length];
    }
    if (hour >= 22 || hour <= 5) {
      const msgs = [
        '深夜のセッション、無理しないで',
        '夜更かし作業？ほどほどにね',
        '深夜モード...体調に気をつけて',
        'こんな時間まで...お疲れ様',
      ];
      return msgs[idx % msgs.length];
    }
    return 'スタートボタンで開始できます';
  }

  // English
  if (hour >= 6 && hour <= 10) {
    const msgs = [
      'Ready to start your morning session?',
      'Good morning! Shall we begin?',
      'Morning focus awaits. Ready?',
      "Rise and shine! Let's do this.",
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 11 && hour <= 13) {
    const msgs = [
      'Ready for a pre-lunch focus session?',
      'One more before lunch?',
      'Finish the morning strong?',
      'Quick session before eating?',
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 14 && hour <= 17) {
    const msgs = [
      'Ready to power through the afternoon?',
      'Afternoon session ready?',
      'Beat the slump. Start now?',
      'Afternoon focus time?',
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 18 && hour <= 21) {
    const msgs = [
      'Ready for an evening session?',
      'Evening work mode?',
      'Night owl session?',
      'Wind down with focus?',
    ];
    return msgs[idx % msgs.length];
  }
  if (hour >= 22 || hour <= 5) {
    const msgs = [
      'Ready for a late-night session?',
      'Midnight focus? Take it easy.',
      'Night shift mode?',
      'Burning midnight oil?',
    ];
    return msgs[idx % msgs.length];
  }
  return 'Press to start.';
}

function getShortBreakMessage(lang: Language, tick: number, stats?: UserStats): string {
  const idx = getRotationIndex(10, tick);

  // Stats-based break messages
  if (stats && tick % 3 === 0) {
    const todayMinutes = Math.floor(stats.todayWorkSeconds / 60);
    if (lang === 'ja') {
      if (stats.todaySessions >= 4) {
        return `今日${stats.todaySessions}セッション目！よく頑張ってます！`;
      }
      if (todayMinutes >= 60) {
        return `今日${todayMinutes}分の集中！いい感じ！`;
      }
    } else {
      if (stats.todaySessions >= 4) {
        return `Session #${stats.todaySessions} today! Great work!`;
      }
      if (todayMinutes >= 60) {
        return `${todayMinutes} minutes focused today! Nice!`;
      }
    }
  }

  if (lang === 'ja') {
    const msgs = [
      '休憩タイム！軽くストレッチしましょう',
      '小休憩です。目を休めて',
      'いい調子！水分補給も忘れずに',
      '休憩中。立ち上がって体を動かそう',
      'リフレッシュタイム！お疲れ様',
      '深呼吸して、リラックス',
      'よく頑張りました！少し休んで',
      '窓の外を眺めてみては？',
      '肩をほぐして、次に備えよう',
      'コーヒーブレイク？お茶もいいね',
    ];
    return msgs[idx % msgs.length];
  }

  // English
  const msgs = [
    'Take a breather! Stretch those muscles.',
    'Quick break! Rest your eyes.',
    'Nice work! Grab some water.',
    'Break time! Stand up and move around.',
    "Refresh time! You've earned it.",
    "Deep breath. You're doing great.",
    'Well done! Take a moment.',
    'Look away from the screen. Relax.',
    'Roll those shoulders. Feel better?',
    'Coffee break? Tea works too!',
  ];
  return msgs[idx % msgs.length];
}

function getLongBreakMessage(lang: Language, tick: number, stats?: UserStats): string {
  const idx = getRotationIndex(8, tick);

  // Stats-based long break messages
  if (stats && tick % 2 === 0) {
    const todayHours = stats.todayWorkSeconds / 3600;
    if (lang === 'ja') {
      if (todayHours >= 2) {
        return `今日${Math.floor(todayHours)}時間超え！素晴らしい集中力！`;
      }
      if (stats.currentStreak >= 3) {
        return `${stats.currentStreak}日連続達成中！休憩もしっかり`;
      }
    } else {
      if (todayHours >= 2) {
        return `Over ${Math.floor(todayHours)} hours today! Amazing focus!`;
      }
      if (stats.currentStreak >= 3) {
        return `${stats.currentStreak}-day streak! Rest well, champion!`;
      }
    }
  }

  if (lang === 'ja') {
    const msgs = [
      '素晴らしい！ゆっくり休んでください',
      '頑張りましたね！しっかり休憩を',
      '1サイクル完了！おやつタイムかも？',
      '長めの休憩です。リラックスして',
      'お疲れ様！散歩してくるのもいいかも',
      '4セッション達成！自分を褒めよう',
      'しっかり休んで、次に備えましょう',
      '大休憩です。好きなことしていいよ',
    ];
    return msgs[idx % msgs.length];
  }

  // English
  const msgs = [
    'Great cycle! Take a well-deserved break.',
    'Excellent work! Relax and recharge.',
    'Cycle complete! Maybe grab a snack?',
    "Long break! You've earned some rest.",
    'Amazing! How about a short walk?',
    '4 sessions done! Celebrate a little.',
    'Rest up well. More to come!',
    'Big break time. Do something fun!',
  ];
  return msgs[idx % msgs.length];
}
