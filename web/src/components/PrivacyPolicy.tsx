export function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-left">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>

      <p className="text-sm text-sandoro-secondary mb-4">Last updated: January 2025</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Overview</h2>
        <p className="text-sandoro-secondary">
          sandoro is a privacy-focused Pomodoro timer application. We respect your privacy and are committed to protecting your personal data.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Data Collection</h2>
        <p className="text-sandoro-secondary mb-2">
          <strong>We do not collect any personal data.</strong>
        </p>
        <ul className="list-disc list-inside text-sandoro-secondary space-y-1">
          <li>All your timer sessions, statistics, and settings are stored locally on your device</li>
          <li>Web version uses browser localStorage</li>
          <li>CLI version uses local SQLite database (~/.sandoro/)</li>
          <li>No data is sent to external servers</li>
          <li>No analytics or tracking</li>
          <li>No cookies (except for essential functionality)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Browser Permissions</h2>
        <p className="text-sandoro-secondary">
          The web application may request the following optional permissions:
        </p>
        <ul className="list-disc list-inside text-sandoro-secondary space-y-1 mt-2">
          <li><strong>Notifications:</strong> To alert you when a timer session completes (optional, can be disabled in settings)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Data Storage</h2>
        <p className="text-sandoro-secondary">
          Your data remains on your device. You can clear all data at any time:
        </p>
        <ul className="list-disc list-inside text-sandoro-secondary space-y-1 mt-2">
          <li><strong>Web:</strong> Clear browser localStorage for this site</li>
          <li><strong>CLI:</strong> Delete the ~/.sandoro/ directory</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Third-Party Services</h2>
        <p className="text-sandoro-secondary">
          sandoro does not integrate with any third-party services, analytics platforms, or advertising networks.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Open Source</h2>
        <p className="text-sandoro-secondary">
          sandoro is open source. You can review the source code at{' '}
          <a
            href="https://github.com/masukai/sandoro"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sandoro-primary hover:underline"
          >
            github.com/masukai/sandoro
          </a>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Contact</h2>
        <p className="text-sandoro-secondary">
          If you have any questions about this Privacy Policy, please open an issue at{' '}
          <a
            href="https://github.com/masukai/sandoro/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sandoro-primary hover:underline"
          >
            github.com/masukai/sandoro/issues
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Changes to This Policy</h2>
        <p className="text-sandoro-secondary">
          We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
        </p>
      </section>
    </div>
  );
}
