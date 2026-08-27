import type {StorageStats,} from "../../types/dashboard";
import DashboardSection from "./DashboardSection";

interface StorageCardProps {
  storage: StorageStats;
}

export default function StorageCard({storage,}: StorageCardProps) {
  const percent = (storage.used / storage.total) * 100;

  return (
    <DashboardSection title="Dung lượng">
      <div className="storage">
        <div className="storage-circle" style={{background: `conic-gradient(var(--accent)${percent}%, var(--border)${percent}%)`,}}>
          <div>{Math.round(percent)}%</div>
        </div>

        <div className="storage-info">
          <strong>{storage.used} MB </strong>
          <span> / {storage.total} MB</span>
        </div>
      </div>
      <div className="storage-list">
        <div>PDF / DOCX
          <span>{storage.pdfDocx} MB </span>
        </div>
        <div>Audio
          <span>{storage.audio} MB </span>
        </div>
        <div>Ảnh
          <span>{storage.image} MB </span>
        </div>
        <div>
          Khác
          <span>{storage.other} MB </span>
        </div>
      </div>
    </DashboardSection>
  );
}