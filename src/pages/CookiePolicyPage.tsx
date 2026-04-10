import { LegalLayout } from "@/components/layouts/LegalLayout";

export default function CookiePolicyPage() {
  return (
    <LegalLayout>
      <article className="prose prose-gray max-w-none">
        <h1 className="text-[28px] font-bold text-primary mb-1">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

        <h2>What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website or use a web application.
          They are widely used to make applications work correctly and to provide information to the operators of the application.
        </p>

        <h2>How the TF USA Partner Portal uses cookies</h2>
        <p>
          The TF USA Partner Portal uses essential cookies and Google Analytics 4 (GA4) for anonymised usage tracking.
          We do not use advertising cookies or third-party tracking pixels.
        </p>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-access-token</code></td>
                <td>Authenticates your session with the portal</td>
                <td>Essential</td>
                <td>Session</td>
              </tr>
              <tr>
                <td><code>sb-refresh-token</code></td>
                <td>Keeps you signed in between sessions</td>
                <td>Essential</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>_ga</code>, <code>_ga_R89CK2XKQZ</code></td>
                <td>Google Analytics — tracks anonymised usage</td>
                <td>Analytics</td>
                <td>2 years</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          These cookies are set by the secure authentication platform that powers the TF USA Partner Portal.
          Without these cookies the portal cannot function — you would be unable to sign in or access any protected content.
        </p>

        <h2>Local storage</h2>
        <p>
          In addition to cookies, the portal uses your browser's local storage to remember your product basket between sessions.
          This data never leaves your device and is not shared with any third party.
        </p>

        <h2>Third-party cookies</h2>
        <p>
          The TF USA Partner Portal uses Google Analytics 4 (GA4) to collect anonymised usage data such as pages visited,
          features used and session duration. No personally identifiable information is sent to Google Analytics.
          You can opt out of Google Analytics tracking using the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
            Google Analytics Opt-out Browser Add-on
          </a>.
          No advertising networks, social media pixels or other third-party tracking technology is used.
        </p>

        <h2>Your choices</h2>
        <p>
          Because all cookies used by this portal are essential for it to function, they cannot be disabled without preventing
          your access to the portal. If you do not wish to accept these cookies, please do not use the TF USA Partner Portal.
        </p>
        <p>
          You can clear cookies at any time through your browser settings. Note that clearing cookies will sign you out of the portal.
        </p>

        <h2>Changes to this policy</h2>
        <p>We may update this cookie policy from time to time. Any changes will be posted on this page.</p>

        <h2>Contact</h2>
        <p>
          If you have any questions about how we use cookies, please contact us at{" "}
          <a href="mailto:partners@total-filtration.com">partners@total-filtration.com</a>.
        </p>
        <p>
          Total Filtration USA LLC<br />
          14422 Shoreside Way, Suite 110 #132<br />
          Winter Garden, Florida 34787
        </p>
      </article>
    </LegalLayout>
  );
}
