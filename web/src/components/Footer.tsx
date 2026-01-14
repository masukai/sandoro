interface FooterProps {
  onPrivacyClick: () => void;
}

export function Footer({ onPrivacyClick }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-3 px-4 text-center text-xs text-sandoro-secondary border-t border-sandoro-secondary/20">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>&copy; {currentYear} K. Masuda</span>
        <span className="hidden sm:inline">|</span>
        <button
          onClick={onPrivacyClick}
          className="hover:text-sandoro-primary hover:underline transition-colors"
        >
          Privacy Policy
        </button>
        <span className="hidden sm:inline">|</span>
        <a
          href="https://github.com/masukai/sandoro/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sandoro-primary hover:underline transition-colors"
        >
          Contact / Feedback
        </a>
        <span className="hidden sm:inline">|</span>
        <a
          href="https://github.com/masukai/sandoro"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sandoro-primary hover:underline transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
