//! sandoro - Terminal-first Pomodoro timer with ASCII art animations
//!
//! A pomodoro timer featuring hourglass animations and customizable themes.

use anyhow::Result;
use clap::{Parser, Subcommand};

mod app;
mod config;
mod db;
mod icons;
mod theme;
mod timer;
mod ui;

#[derive(Parser)]
#[command(name = "sandoro")]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start a pomodoro session
    Start {
        /// Work duration in minutes (default: 25)
        #[arg(short, long, default_value = "25")]
        work: u32,

        /// Short break duration in minutes (default: 5)
        #[arg(short, long, default_value = "5")]
        short_break: u32,

        /// Long break duration in minutes (default: 15)
        #[arg(short, long, default_value = "15")]
        long_break: u32,
    },
    /// Show statistics
    Stats {
        /// Show daily stats
        #[arg(short, long)]
        day: bool,

        /// Show weekly stats
        #[arg(short, long)]
        week: bool,

        /// Show monthly stats
        #[arg(short, long)]
        month: bool,
    },
    /// Configure settings
    Config {
        /// Set icon type (hourglass, tomato, coffee)
        #[arg(long)]
        icon: Option<String>,

        /// Set theme (default, nord, dracula)
        #[arg(long)]
        theme: Option<String>,
    },
    /// Activate Pro license
    License {
        /// License key (SAND-XXXX-XXXX-XXXX-XXXX)
        key: String,
    },
    /// Sync data with cloud (Pro only)
    Sync,
    /// Login to sandoro account
    Login,
}

fn format_duration(seconds: i32) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

fn show_stats(_day: bool, week: bool, month: bool) -> Result<()> {
    let db = db::Database::open()?;

    println!();
    println!("  📊 sandoro Statistics");
    println!("  ─────────────────────");
    println!();

    if month {
        // Monthly stats (last 30 days)
        let stats = db.get_month_stats()?;
        println!("  📅 Last 30 Days");
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
        println!();

        // Daily breakdown
        let daily = db.get_daily_stats(30)?;
        if !daily.is_empty() {
            println!("  Daily breakdown:");
            for s in daily.iter().take(10) {
                println!(
                    "     {} │ {} │ {} sessions",
                    s.date,
                    format_duration(s.total_work_seconds),
                    s.sessions_completed
                );
            }
            if daily.len() > 10 {
                println!("     ... and {} more days", daily.len() - 10);
            }
        }
    } else if week {
        // Weekly stats (last 7 days)
        let stats = db.get_week_stats()?;
        println!("  📅 Last 7 Days");
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
        println!();

        // Daily breakdown
        let daily = db.get_daily_stats(7)?;
        if !daily.is_empty() {
            println!("  Daily breakdown:");
            for s in &daily {
                println!(
                    "     {} │ {} │ {} sessions",
                    s.date,
                    format_duration(s.total_work_seconds),
                    s.sessions_completed
                );
            }
        }
    } else {
        // Default: Today's stats (day flag or no flag)
        let stats = db.get_today_stats()?;
        println!("  📅 Today ({})", stats.date);
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
    }

    println!();
    Ok(())
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Start {
            work: _,
            short_break: _,
            long_break: _,
        }) => {
            // Config is loaded from file; CLI args are deprecated
            app::run()?;
        }
        Some(Commands::Stats { day, week, month }) => {
            show_stats(day, week, month)?;
        }
        Some(Commands::Config { icon, theme }) => {
            if let Some(icon) = icon {
                println!("Setting icon to: {}", icon);
            }
            if let Some(theme) = theme {
                println!("Setting theme to: {}", theme);
            }
            // TODO: Implement config update
        }
        Some(Commands::License { key }) => {
            println!("Activating license: {}", key);
            // TODO: Implement license activation
        }
        Some(Commands::Sync) => {
            println!("Syncing with cloud...");
            // TODO: Implement cloud sync
        }
        Some(Commands::Login) => {
            println!("Opening browser for authentication...");
            // TODO: Implement OAuth login
        }
        None => {
            // Default: start timer with settings from config file
            app::run()?;
        }
    }

    Ok(())
}
