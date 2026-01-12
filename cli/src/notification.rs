//! Notification and sound handling
//!
//! Provides desktop notifications and terminal bell for session completion

use crate::timer::TimerState;

/// Send a desktop notification
#[cfg(feature = "notifications")]
pub fn send_notification(state: TimerState) {
    use notify_rust::Notification;

    let (summary, body) = match state {
        TimerState::Work => ("Work Session Complete!", "Time for a break."),
        TimerState::ShortBreak => ("Break Over!", "Ready to get back to work?"),
        TimerState::LongBreak => (
            "Long Break Over!",
            "Feeling refreshed? Time to start a new cycle!",
        ),
    };

    if let Err(e) = Notification::new()
        .summary(summary)
        .body(body)
        .appname("sandoro")
        .timeout(5000)
        .show()
    {
        eprintln!("Failed to send notification: {}", e);
    }
}

/// Fallback when notifications feature is disabled
#[cfg(not(feature = "notifications"))]
pub fn send_notification(_state: TimerState) {
    // No-op when notifications are disabled
}

/// Play a terminal bell sound
pub fn play_bell() {
    // Print ASCII bell character
    print!("\x07");
}

/// Play notification sound based on state
/// Uses terminal bell since Web Audio equivalent isn't available in terminal
pub fn play_sound(state: TimerState, _volume: f32) {
    // Different patterns for different states (simulated with multiple bells)
    match state {
        TimerState::Work => {
            // Three beeps for work completion
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(200));
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(200));
            print!("\x07");
        }
        TimerState::ShortBreak => {
            // Two beeps for short break
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(150));
            print!("\x07");
        }
        TimerState::LongBreak => {
            // Four beeps for long break (triumphant)
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(300));
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(150));
            print!("\x07");
            std::thread::sleep(std::time::Duration::from_millis(300));
            print!("\x07");
        }
    }
}

/// Notify session completion with both sound and desktop notification
pub fn notify_session_complete(state: TimerState, sound_enabled: bool, desktop_enabled: bool) {
    if sound_enabled {
        play_sound(state, 0.5);
    }
    if desktop_enabled {
        send_notification(state);
    }
}
