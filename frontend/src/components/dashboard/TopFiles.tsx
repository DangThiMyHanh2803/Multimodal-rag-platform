import type {TopFile,} from "../../types/dashboard";
import DashboardSection from "./DashboardSection";

interface TopFilesProps {
  files: TopFile[];
}

export default function TopFiles({files,}: TopFilesProps) {
  return (
    <DashboardSection title="File được hỏi nhiều nhất">
      <div className="top-file-list">
        {files.map((file, index) => (
          <div className="top-file-item" key={file.name}>
            <div className="top-file-number">{index + 1}</div>
            <img src={file.icon} alt=""/>

            <div className="top-file-info">
              <div>{file.name}</div>
              <span>{file.questions} câu hỏi</span>
            </div>
            <strong>{file.avgScore.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}