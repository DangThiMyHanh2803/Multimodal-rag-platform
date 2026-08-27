import type {ReactNode,} from "react";

interface DashboardSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function DashboardSection({title, action, children,}: DashboardSectionProps) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">{title}</div>

        {action && (
          <div>{action}</div>
        )}
      </div>
      {children}
    </section>
  );
}