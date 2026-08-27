import type {ActivityItem,} from "../../types/dashboard";
import DashboardSection from "./DashboardSection";
interface ActivityFeedProps {
  activities: ActivityItem[];
}

function relativeTime( value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) {
    return "Vừa xong";
  }
  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} phút trước`;
  }
  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} giờ trước`;
  }
  return `${Math.floor(diff / 86_400_000)} ngày trước`;
}

export default function ActivityFeed({activities,}: ActivityFeedProps) {
  return (
    <DashboardSection title="Hoạt động gần đây">
      <div className="activity-list">
        {activities.map((activity) => (
          <div className="activity-item" key={activity.id}>
            <div className="activity-icon">
              <img src={activity.icon} alt=""/>
            </div>
            <div className="activity-content">
              <div className="activity-header">
                <strong>{activity.text}</strong>
                <span>{relativeTime(activity.time)}</span>
              </div>

              {activity.sub && ( <p>{activity.sub}</p> )}
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}