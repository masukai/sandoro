//! Progress bar icon
//! Simple horizontal progress bar with percentage display
//! Matches web version with refill animation during break

/// Render progress bar
/// `percent` is 0.0-100.0 where 100 = end of timer
pub fn render_progress(percent: f32) -> Vec<String> {
    render_progress_with_direction(percent, 0, false)
}

/// Render progress bar with direction control
pub fn render_progress_with_direction(
    percent: f32,
    animation_frame: u8,
    is_break: bool,
) -> Vec<String> {
    render_progress_with_options(percent, animation_frame, is_break, false)
}

/// Render progress bar with all options including flowtime support
pub fn render_progress_with_options(
    percent: f32,
    animation_frame: u8,
    is_break: bool,
    is_flowtime_work: bool,
) -> Vec<String> {
    // Flowtime work mode: show wave animation (no progress)
    if is_flowtime_work {
        let wave_patterns = [
            "▓█▓▒░░░░░░░░░░░░░░░░",
            "░▓█▓▒░░░░░░░░░░░░░░░",
            "░░▓█▓▒░░░░░░░░░░░░░░",
            "░░░▓█▓▒░░░░░░░░░░░░░",
            "░░░░▓█▓▒░░░░░░░░░░░░",
            "░░░░░▓█▓▒░░░░░░░░░░░",
            "░░░░░░▓█▓▒░░░░░░░░░░",
            "░░░░░░░▓█▓▒░░░░░░░░░",
        ];
        let pattern = wave_patterns[(animation_frame as usize) % 8];
        let bar = format!("[{}]", pattern);
        return vec![bar, "∞ FLOW".to_string()];
    }
    let width = 20;

    // During break, progress shows refill (0→100 means empty→full)
    let effective_progress = if is_break { 100.0 - percent } else { percent };

    let filled = ((effective_progress / 100.0) * width as f32).round() as usize;
    let empty = width - filled;

    let bar = format!("[{}{}]", "█".repeat(filled), "░".repeat(empty));

    // Refill animation during break (blinking arrow)
    let is_refilling = is_break && percent > 0.0 && percent < 100.0;
    let anim_frame = animation_frame % 2;

    if is_refilling {
        let arrow = if anim_frame == 0 {
            "◀━━"
        } else {
            "◄──"
        };
        vec![
            format!("{} ← REFILL", bar),
            format!("{:>3}% {}", effective_progress.round() as i32, arrow),
        ]
    } else {
        vec![bar, format!("{:>3}%", effective_progress.round() as i32)]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_progress_full() {
        let lines = render_progress(100.0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 2);
    }

    #[test]
    fn test_progress_empty() {
        let lines = render_progress(0.0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 2);
    }

    #[test]
    fn test_progress_break_mode() {
        let lines = render_progress_with_direction(50.0, 0, true);
        assert!(!lines.is_empty());
        // Check refill indicator is present
        assert!(lines[0].contains("REFILL"));
    }

    #[test]
    fn test_progress_work_mode() {
        let lines = render_progress_with_direction(50.0, 0, false);
        assert!(!lines.is_empty());
        // No refill indicator in work mode
        assert!(!lines[0].contains("REFILL"));
    }

    #[test]
    fn test_progress_break_animation() {
        let frame0 = render_progress_with_direction(50.0, 0, true);
        let frame1 = render_progress_with_direction(50.0, 1, true);
        // Different frames should have different arrow styles
        assert_ne!(frame0[1], frame1[1]);
    }

    #[test]
    fn test_progress_bar_contains_brackets() {
        let lines = render_progress(50.0);
        assert!(lines[0].contains("["));
        assert!(lines[0].contains("]"));
    }

    #[test]
    fn test_progress_bar_shows_filled() {
        let lines = render_progress(50.0);
        // At 50%, should have both filled and empty
        assert!(lines[0].contains("█"));
        assert!(lines[0].contains("░"));
    }

    #[test]
    fn test_progress_full_bar_no_empty() {
        let lines = render_progress(100.0);
        // At 100%, should have no empty blocks
        assert!(!lines[0].contains("░"));
    }

    #[test]
    fn test_progress_empty_bar_no_filled() {
        let lines = render_progress(0.0);
        // At 0%, should have no filled blocks
        assert!(!lines[0].contains("█"));
    }

    #[test]
    fn test_progress_shows_percentage() {
        let lines = render_progress(50.0);
        // Should show percentage
        assert!(lines[1].contains("50%"));
    }

    #[test]
    fn test_progress_no_refill_at_start() {
        let lines = render_progress_with_direction(0.0, 0, true);
        // At 0%, no refilling
        assert!(!lines[0].contains("REFILL"));
    }

    #[test]
    fn test_progress_no_refill_at_end() {
        let lines = render_progress_with_direction(100.0, 0, true);
        // At 100%, no refilling
        assert!(!lines[0].contains("REFILL"));
    }
}
