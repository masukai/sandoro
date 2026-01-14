//! Context-aware greeting messages
//!
//! Provides friendly messages based on time of day and timer state
//! Supports multiple languages (ja, en)
//! Messages rotate every 10 seconds for variety
//! Includes stats-based encouragement and achievement messages

use chrono::{Local, Timelike};

use crate::timer::TimerState;

/// Language for context messages
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Language {
    Japanese,
    English,
}

impl Language {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "ja" | "japanese" | "日本語" => Language::Japanese,
            "en" | "english" => Language::English,
            _ => Language::Japanese, // Default to Japanese
        }
    }
}

/// User statistics for context-aware messages
#[derive(Debug, Clone, Default)]
pub struct UserStats {
    pub today_work_seconds: i32,
    pub today_sessions: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub week_avg_seconds: i32,
    pub yesterday_seconds: i32,
    pub total_sessions: i32,
}

/// Get rotation index based on current time (changes every 10 seconds)
fn get_rotation_index(max: usize) -> usize {
    let now = Local::now();
    // Combine seconds and minutes for more variety
    let seed = (now.second() / 10) as usize + (now.minute() as usize * 6);
    seed % max
}

/// Get a context-aware greeting message based on current time, timer state, and user stats
pub fn get_context_message(
    state: TimerState,
    is_running: bool,
    lang: Language,
    stats: Option<&UserStats>,
) -> String {
    let hour = Local::now().hour();

    // State-specific messages take priority
    match state {
        TimerState::ShortBreak => {
            return get_short_break_message(lang, stats).to_string();
        }
        TimerState::LongBreak => {
            return get_long_break_message(lang, stats).to_string();
        }
        TimerState::Work => {
            if !is_running {
                // Check for achievement messages first when paused
                if let Some(s) = stats {
                    if let Some(achievement) = get_achievement_message(s, lang) {
                        return achievement;
                    }
                }
                return get_paused_message(hour, lang, stats).to_string();
            }
        }
    }

    // Check for encouragement messages during work
    if let Some(s) = stats {
        if let Some(encouragement) = get_encouragement_message(s, lang) {
            // Mix encouragement with time-based messages (50% chance)
            let idx = get_rotation_index(2);
            if idx == 0 {
                return encouragement;
            }
        }
    }

    // Time-based messages for working state
    get_time_based_message(hour, lang).to_string()
}

/// Get achievement message based on milestones
fn get_achievement_message(stats: &UserStats, lang: Language) -> Option<String> {
    // Check for milestone achievements
    match lang {
        Language::Japanese => {
            // Session milestones
            if stats.total_sessions == 100 {
                return Some("🎉 通算100セッション達成！素晴らしい継続力！".to_string());
            }
            if stats.total_sessions == 50 {
                return Some("🎊 50セッション達成！半分の道のり、最高！".to_string());
            }
            if stats.total_sessions == 10 {
                return Some("⭐ 10セッション達成！いい調子です！".to_string());
            }
            if stats.total_sessions == 1 {
                return Some("🌟 初めてのセッション完了！おめでとう！".to_string());
            }

            // Daily hour milestones
            let today_hours = stats.today_work_seconds / 3600;
            if today_hours >= 4 && stats.today_work_seconds % 3600 < 300 {
                return Some("🔥 今日4時間達成！驚異的な集中力！".to_string());
            }
            if today_hours >= 2 && stats.today_work_seconds % 3600 < 300 {
                return Some("💪 今日2時間達成！素晴らしい！".to_string());
            }
            if today_hours >= 1 && stats.today_work_seconds % 3600 < 300 {
                return Some("✨ 今日1時間達成！いいペース！".to_string());
            }

            // Streak milestones
            if stats.current_streak == 30 {
                return Some("🏆 30日連続！伝説的な継続力！".to_string());
            }
            if stats.current_streak == 7 {
                return Some("🌈 1週間連続達成！習慣化の第一歩！".to_string());
            }
            if stats.current_streak == 3 {
                return Some("🔥 3日連続！いい流れです！".to_string());
            }

            // Longest streak beaten
            if stats.current_streak > 0
                && stats.current_streak == stats.longest_streak
                && stats.longest_streak > 1
            {
                return Some(format!("🏅 最長記録更新！{}日連続！", stats.current_streak));
            }
        }
        Language::English => {
            // Session milestones
            if stats.total_sessions == 100 {
                return Some("🎉 100 sessions! Amazing dedication!".to_string());
            }
            if stats.total_sessions == 50 {
                return Some("🎊 50 sessions! Halfway to greatness!".to_string());
            }
            if stats.total_sessions == 10 {
                return Some("⭐ 10 sessions! You're on a roll!".to_string());
            }
            if stats.total_sessions == 1 {
                return Some("🌟 First session complete! Welcome!".to_string());
            }

            // Daily hour milestones
            let today_hours = stats.today_work_seconds / 3600;
            if today_hours >= 4 && stats.today_work_seconds % 3600 < 300 {
                return Some("🔥 4 hours today! Incredible focus!".to_string());
            }
            if today_hours >= 2 && stats.today_work_seconds % 3600 < 300 {
                return Some("💪 2 hours today! Excellent work!".to_string());
            }
            if today_hours >= 1 && stats.today_work_seconds % 3600 < 300 {
                return Some("✨ 1 hour today! Great pace!".to_string());
            }

            // Streak milestones
            if stats.current_streak == 30 {
                return Some("🏆 30-day streak! Legendary!".to_string());
            }
            if stats.current_streak == 7 {
                return Some("🌈 1-week streak! Habit forming!".to_string());
            }
            if stats.current_streak == 3 {
                return Some("🔥 3-day streak! Keep it up!".to_string());
            }

            // Longest streak beaten
            if stats.current_streak > 0
                && stats.current_streak == stats.longest_streak
                && stats.longest_streak > 1
            {
                return Some(format!(
                    "🏅 New record! {}-day streak!",
                    stats.current_streak
                ));
            }
        }
    }

    None
}

/// Get encouragement message based on stats comparison
fn get_encouragement_message(stats: &UserStats, lang: Language) -> Option<String> {
    let idx = get_rotation_index(5);

    match lang {
        Language::Japanese => {
            // Beating yesterday
            if stats.today_work_seconds > stats.yesterday_seconds && stats.yesterday_seconds > 0 {
                let diff_min = (stats.today_work_seconds - stats.yesterday_seconds) / 60;
                if diff_min >= 30 {
                    return Some(format!("📈 昨日より{}分多く頑張ってます！", diff_min));
                }
            }

            // Above weekly average
            if stats.week_avg_seconds > 0 && stats.today_work_seconds > stats.week_avg_seconds {
                let msgs = [
                    "📊 週平均を超えてます！この調子！",
                    "💯 今日は週平均以上の成果！",
                ];
                return Some(msgs[idx % msgs.len()].to_string());
            }

            // Good streak
            if stats.current_streak >= 2 {
                let msgs = [
                    format!("🔥 {}日連続！素晴らしい継続力！", stats.current_streak),
                    format!("💪 連続{}日目！いい習慣です！", stats.current_streak),
                ];
                return Some(msgs[idx % msgs.len()].clone());
            }

            // Multiple sessions today
            if stats.today_sessions >= 3 {
                let msgs = [
                    format!("⭐ 今日{}回目！絶好調！", stats.today_sessions),
                    format!("🌟 {}セッション完了！素晴らしい！", stats.today_sessions),
                ];
                return Some(msgs[idx % msgs.len()].clone());
            }
        }
        Language::English => {
            // Beating yesterday
            if stats.today_work_seconds > stats.yesterday_seconds && stats.yesterday_seconds > 0 {
                let diff_min = (stats.today_work_seconds - stats.yesterday_seconds) / 60;
                if diff_min >= 30 {
                    return Some(format!("📈 {} min more than yesterday!", diff_min));
                }
            }

            // Above weekly average
            if stats.week_avg_seconds > 0 && stats.today_work_seconds > stats.week_avg_seconds {
                let msgs = [
                    "📊 Above weekly average! Keep going!",
                    "💯 Exceeding your weekly pace!",
                ];
                return Some(msgs[idx % msgs.len()].to_string());
            }

            // Good streak
            if stats.current_streak >= 2 {
                let msgs = [
                    format!("🔥 {}-day streak! Amazing!", stats.current_streak),
                    format!("💪 Day {} of your streak!", stats.current_streak),
                ];
                return Some(msgs[idx % msgs.len()].clone());
            }

            // Multiple sessions today
            if stats.today_sessions >= 3 {
                let msgs = [
                    format!("⭐ Session {} today! On fire!", stats.today_sessions),
                    format!("🌟 {} sessions done! Excellent!", stats.today_sessions),
                ];
                return Some(msgs[idx % msgs.len()].clone());
            }
        }
    }

    None
}

fn get_time_based_message(hour: u32, lang: Language) -> &'static str {
    let idx = get_rotation_index(6);

    match lang {
        Language::Japanese => match hour {
            6..=10 => {
                const MSGS: &[&str] = &[
                    "おはようございます！今日も頑張りましょう",
                    "朝の集中力は貴重です。活かしていきましょう",
                    "素敵な朝ですね。良いスタートを切りましょう",
                    "早起きは三文の徳。素晴らしい習慣です",
                    "朝活お疲れ様です。一日の始まりに集中を",
                    "モーニングセッション開始！気分上々？",
                ];
                MSGS[idx % MSGS.len()]
            }
            11..=13 => {
                const MSGS: &[&str] = &[
                    "お昼時ですね。あと少し頑張りましょう",
                    "ランチ前のラストスパート！",
                    "午前中の締めくくり、集中集中",
                    "お腹空いてきた？もう少しで休憩です",
                    "昼食前に一仕事、いい感じです",
                    "午前の部、終盤戦です。ファイト！",
                ];
                MSGS[idx % MSGS.len()]
            }
            14..=17 => {
                const MSGS: &[&str] = &[
                    "午後も順調ですね。その調子！",
                    "午後の眠気に負けず、素晴らしいです",
                    "午後のゴールデンタイム、有効活用中",
                    "この時間に集中できるのは才能です",
                    "午後も絶好調！この波に乗っていこう",
                    "夕方まであと少し。ペース配分も大事に",
                ];
                MSGS[idx % MSGS.len()]
            }
            18..=21 => {
                const MSGS: &[&str] = &[
                    "こんばんは、お疲れ様です",
                    "夜のセッション、落ち着いて取り組めますね",
                    "夜の集中タイム。静かな時間を活用",
                    "一日の締めくくりに集中を",
                    "夜の作業、自分のペースで進めましょう",
                    "日中お疲れ様。夜もう一踏ん張り？",
                ];
                MSGS[idx % MSGS.len()]
            }
            22..=23 | 0..=5 => {
                const MSGS: &[&str] = &[
                    "夜更かしですね。無理しないで",
                    "深夜の集中、ほどほどにね",
                    "遅い時間までお疲れ様です",
                    "夜型さんですね。水分補給も忘れずに",
                    "静かな夜、集中しやすいですよね",
                    "深夜作業、体調には気をつけて",
                ];
                MSGS[idx % MSGS.len()]
            }
            _ => "集中していきましょう！",
        },
        Language::English => match hour {
            6..=10 => {
                const MSGS: &[&str] = &[
                    "Good morning! Let's start the day strong.",
                    "Morning focus is golden. Make it count!",
                    "Rise and grind! You're off to a great start.",
                    "Early bird catches the worm. Nice one!",
                    "Morning productivity at its finest.",
                    "Fresh start, fresh mind. Let's go!",
                ];
                MSGS[idx % MSGS.len()]
            }
            11..=13 => {
                const MSGS: &[&str] = &[
                    "Lunchtime is near. Stay focused!",
                    "Pre-lunch sprint! You've got this.",
                    "Wrapping up the morning strong.",
                    "Almost lunch break. Finish this session!",
                    "Midday momentum. Keep it rolling!",
                    "Morning finale! Strong finish ahead.",
                ];
                MSGS[idx % MSGS.len()]
            }
            14..=17 => {
                const MSGS: &[&str] = &[
                    "Afternoon push! You're doing great.",
                    "Beating the afternoon slump. Impressive!",
                    "Afternoon productivity mode: activated.",
                    "Prime time for deep work. Crush it!",
                    "Afternoon excellence in progress.",
                    "Evening's approaching. Great progress!",
                ];
                MSGS[idx % MSGS.len()]
            }
            18..=21 => {
                const MSGS: &[&str] = &[
                    "Evening session. Thanks for your dedication.",
                    "Night owl mode engaged. Nice focus!",
                    "Evening work session. Steady and calm.",
                    "Winding down the day productively.",
                    "Evening dedication. That's commitment!",
                    "After-hours hustle. Respect!",
                ];
                MSGS[idx % MSGS.len()]
            }
            22..=23 | 0..=5 => {
                const MSGS: &[&str] = &[
                    "Late night work? Don't forget to rest.",
                    "Burning the midnight oil. Stay hydrated!",
                    "Night shift vibes. Take care of yourself.",
                    "The quiet hours. Perfect for focus.",
                    "Late night dedication. Impressive!",
                    "Deep night session. Rest soon, okay?",
                ];
                MSGS[idx % MSGS.len()]
            }
            _ => "Keep up the great work!",
        },
    }
}

fn get_paused_message(hour: u32, lang: Language, stats: Option<&UserStats>) -> &'static str {
    let idx = get_rotation_index(4);

    // Stats-aware message variations (when stats available and notable)
    if let Some(s) = stats {
        if s.current_streak >= 3 {
            match lang {
                Language::Japanese => {
                    const MSGS: &[&str] = &[
                        "連続記録継続中！今日も始めますか？",
                        "ストリーク維持中！準備OK？",
                        "連続日数を伸ばしましょう！",
                        "今日もやれば記録更新！",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
                Language::English => {
                    const MSGS: &[&str] = &[
                        "Keep your streak going! Ready?",
                        "Streak in progress! Start now?",
                        "Extend your streak!",
                        "One more day for the record!",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
            }
        }
    }

    match lang {
        Language::Japanese => match hour {
            6..=10 => {
                const MSGS: &[&str] = &[
                    "朝のセッション、始めますか？",
                    "おはようございます！準備はOK？",
                    "朝イチの集中、最高ですよ",
                    "モーニングセッション待機中...",
                ];
                MSGS[idx % MSGS.len()]
            }
            11..=13 => {
                const MSGS: &[&str] = &[
                    "お昼前にもうひと頑張り？",
                    "ランチ前の一仕事、始めますか？",
                    "午前中のラストスパートいきましょう",
                    "お腹空く前にもう一本！",
                ];
                MSGS[idx % MSGS.len()]
            }
            14..=17 => {
                const MSGS: &[&str] = &[
                    "午後のセッション、準備OK？",
                    "午後も頑張りますか？",
                    "眠気覚ましに集中タイム？",
                    "午後のスタート、切りましょう",
                ];
                MSGS[idx % MSGS.len()]
            }
            18..=21 => {
                const MSGS: &[&str] = &[
                    "夜のセッション、始めましょうか",
                    "夜の集中タイム、準備完了？",
                    "今夜も頑張りますか？",
                    "夜の作業、スタートしますか？",
                ];
                MSGS[idx % MSGS.len()]
            }
            22..=23 | 0..=5 => {
                const MSGS: &[&str] = &[
                    "深夜のセッション、無理しないで",
                    "夜更かし作業？ほどほどにね",
                    "深夜モード...体調に気をつけて",
                    "こんな時間まで...お疲れ様",
                ];
                MSGS[idx % MSGS.len()]
            }
            _ => "Spaceキーで開始できます",
        },
        Language::English => match hour {
            6..=10 => {
                const MSGS: &[&str] = &[
                    "Ready to start your morning session?",
                    "Good morning! Shall we begin?",
                    "Morning focus awaits. Ready?",
                    "Rise and shine! Let's do this.",
                ];
                MSGS[idx % MSGS.len()]
            }
            11..=13 => {
                const MSGS: &[&str] = &[
                    "Ready for a pre-lunch focus session?",
                    "One more before lunch?",
                    "Finish the morning strong?",
                    "Quick session before eating?",
                ];
                MSGS[idx % MSGS.len()]
            }
            14..=17 => {
                const MSGS: &[&str] = &[
                    "Ready to power through the afternoon?",
                    "Afternoon session ready?",
                    "Beat the slump. Start now?",
                    "Afternoon focus time?",
                ];
                MSGS[idx % MSGS.len()]
            }
            18..=21 => {
                const MSGS: &[&str] = &[
                    "Ready for an evening session?",
                    "Evening work mode?",
                    "Night owl session?",
                    "Wind down with focus?",
                ];
                MSGS[idx % MSGS.len()]
            }
            22..=23 | 0..=5 => {
                const MSGS: &[&str] = &[
                    "Ready for a late-night session?",
                    "Midnight focus? Take it easy.",
                    "Night shift mode?",
                    "Burning midnight oil?",
                ];
                MSGS[idx % MSGS.len()]
            }
            _ => "Press Space to start.",
        },
    }
}

fn get_short_break_message(lang: Language, stats: Option<&UserStats>) -> &'static str {
    let idx = get_rotation_index(10);

    // Stats-aware messages when notable
    if let Some(s) = stats {
        if s.today_sessions >= 4 {
            match lang {
                Language::Japanese => {
                    const MSGS: &[&str] = &[
                        "今日4セッション以上！お疲れ様！",
                        "絶好調！しっかり休んで",
                        "素晴らしいペース！休憩大事",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
                Language::English => {
                    const MSGS: &[&str] = &[
                        "4+ sessions today! Great job!",
                        "You're on fire! Rest well.",
                        "Amazing pace! Breaks matter.",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
            }
        }
    }

    match lang {
        Language::Japanese => {
            const MSGS: &[&str] = &[
                "休憩タイム！軽くストレッチしましょう",
                "小休憩です。目を休めて",
                "いい調子！水分補給も忘れずに",
                "休憩中。立ち上がって体を動かそう",
                "リフレッシュタイム！お疲れ様",
                "深呼吸して、リラックス",
                "よく頑張りました！少し休んで",
                "窓の外を眺めてみては？",
                "肩をほぐして、次に備えよう",
                "コーヒーブレイク？お茶もいいね",
            ];
            MSGS[idx % MSGS.len()]
        }
        Language::English => {
            const MSGS: &[&str] = &[
                "Take a breather! Stretch those muscles.",
                "Quick break! Rest your eyes.",
                "Nice work! Grab some water.",
                "Break time! Stand up and move around.",
                "Refresh time! You've earned it.",
                "Deep breath. You're doing great.",
                "Well done! Take a moment.",
                "Look away from the screen. Relax.",
                "Roll those shoulders. Feel better?",
                "Coffee break? Tea works too!",
            ];
            MSGS[idx % MSGS.len()]
        }
    }
}

fn get_long_break_message(lang: Language, stats: Option<&UserStats>) -> &'static str {
    let idx = get_rotation_index(8);

    // Stats-aware messages for significant achievements
    if let Some(s) = stats {
        let hours = s.today_work_seconds / 3600;
        if hours >= 2 {
            match lang {
                Language::Japanese => {
                    const MSGS: &[&str] = &[
                        "2時間以上達成！大休憩を満喫して",
                        "今日は絶好調！ゆっくり休んで",
                        "素晴らしい集中力！休憩大事！",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
                Language::English => {
                    const MSGS: &[&str] = &[
                        "2+ hours done! Enjoy your break!",
                        "Great progress! Rest well.",
                        "Amazing focus! Take a real break!",
                    ];
                    return MSGS[idx % MSGS.len()];
                }
            }
        }
    }

    match lang {
        Language::Japanese => {
            const MSGS: &[&str] = &[
                "素晴らしい！ゆっくり休んでください",
                "頑張りましたね！しっかり休憩を",
                "1サイクル完了！おやつタイムかも？",
                "長めの休憩です。リラックスして",
                "お疲れ様！散歩してくるのもいいかも",
                "4セッション達成！自分を褒めよう",
                "しっかり休んで、次に備えましょう",
                "大休憩です。好きなことしていいよ",
            ];
            MSGS[idx % MSGS.len()]
        }
        Language::English => {
            const MSGS: &[&str] = &[
                "Great cycle! Take a well-deserved break.",
                "Excellent work! Relax and recharge.",
                "Cycle complete! Maybe grab a snack?",
                "Long break! You've earned some rest.",
                "Amazing! How about a short walk?",
                "4 sessions done! Celebrate a little.",
                "Rest up well. More to come!",
                "Big break time. Do something fun!",
            ];
            MSGS[idx % MSGS.len()]
        }
    }
}
