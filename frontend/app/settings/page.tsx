import AppSettingsForm from "@/components/AppSettingsForm";
import JobStatusesEditor from "@/components/JobStatusesEditor";
import KeywordRulesEditor from "@/components/KeywordRulesEditor";
import RunSettingsForm from "@/components/RunSettingsForm";
import SearchConfigsEditor from "@/components/SearchConfigsEditor";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Settings
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Search Combos">
          <SearchConfigsEditor />
        </Section>

        <Section title="Filters">
          <KeywordRulesEditor />
        </Section>

        <Section title="Run Settings">
          <RunSettingsForm />
        </Section>

        <Section title="Job Statuses">
          <JobStatusesEditor />
        </Section>

        {/* <Section title="Resume Tailoring">
          <AppSettingsForm />
        </Section> */}
      </div>
    </div>
  );
}
