import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How Marginaly handles your data.",
};

// A plain-language privacy policy. Public, linked from the footer and required
// by the App Store. Update the contact address if it changes.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-prose py-6">
      <h1 className="font-display text-4xl font-bold text-cream">
        Privacy policy
      </h1>
      <p className="mt-2 font-mono text-xs text-ink-faint">
        Last updated 22 July 2026
      </p>

      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft">
        <p>
          Marginaly is a small, text-first social network for readers. This page
          explains, in plain language, what we collect, why, and what you can do
          about it. If anything here is unclear, write to us at{" "}
          <a href="mailto:hello@marginaly.club" className="link">
            hello@marginaly.club
          </a>
          .
        </p>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">
            What we collect
          </h2>
          <p>
            When you create an account we store your email address, a username,
            and a password (held in encrypted form by our authentication
            provider, never in plain text). As you use Marginaly we store what
            you choose to add: your display name, bio, avatar, the books on your
            shelves, the notes, quotes and reviews you write, your comments, who
            you follow, and which reading rooms you join. We record the days you
            are active so we can show your reading streak.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">
            What we do not collect
          </h2>
          <p>
            We do not run advertising, and we do not sell your data to anyone. We
            do not track you across other websites, and we place no advertising
            or analytics trackers of that kind. Book cover images are loaded from
            the Open Library, a public library catalogue; we never store images
            you upload, because there is no image upload.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">
            Who can see your content
          </h2>
          <p>
            By default your profile and reads are public to other signed-in
            readers. If you make your account private in Settings, only followers
            you approve can see your reads, shelves and reading activity. You can
            block anyone, which hides your content from them and removes any
            follow between you. Reports you file are private to you and to us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">
            Service providers
          </h2>
          <p>
            We use Supabase to store data and manage sign-in, Vercel to host the
            site, and Resend to send account emails such as verification and
            password resets. These providers process your data only to run
            Marginaly on our behalf.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">Your choices</h2>
          <p>
            You can edit your name, bio, avatar and reads at any time, and delete
            any read or comment you have written. You can delete your account
            entirely from Settings; doing so permanently removes your profile,
            reads, comments, shelves and follows. If you would like a copy of
            your data, or have a question we have not answered, email{" "}
            <a href="mailto:hello@marginaly.club" className="link">
              hello@marginaly.club
            </a>{" "}
            and we will help.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">
            Reporting content
          </h2>
          <p>
            Every read and comment carries a report option. Reports reach us
            directly and we review them, removing content and accounts that break
            our rules. There is no tolerance for harassment, hateful content, or
            anything that endangers others.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">Children</h2>
          <p>
            Marginaly is not directed at children under 13, and we do not
            knowingly collect their data. If you believe a child has created an
            account, please let us know and we will remove it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl text-ink">Changes</h2>
          <p>
            If we change this policy in a meaningful way, we will update the date
            above. Continuing to use Marginaly after a change means you accept
            the revised policy.
          </p>
        </section>
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="link">
          Back to Marginaly
        </Link>
      </p>
    </div>
  );
}
