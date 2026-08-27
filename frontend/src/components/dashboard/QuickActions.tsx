interface QuickActionsProps {
  onNavigateChat?: () => void;
}

export default function QuickActions({onNavigateChat}: QuickActionsProps) {
  return (
    <div className="quick-actions">
      <button type="button">
        <img src="/icon/up.png" alt=""/> 
        Upload tài liệu
      </button>
      <button type="button" onClick={onNavigateChat}>
        <img src="/icon/chat.png" alt=""/>
        Chat mới
      </button>
      <button type="button">
        <img src="/icon/fordel.png" alt=""/>
        Tạo workspace
      </button>

      <button type="button">
        <img src="/icon/export.png" alt=""/>
        Xuất báo cáo PDF
      </button>
    </div>
  );
}