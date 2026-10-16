import React from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { NotificationItem } from '../types/application';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onSelectAction?: (notif: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onMarkRead,
  onSelectAction,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Notifications & Alerts</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No notifications at this time.
            </div>
          ) : (
            notifications.map((n) => {
              const icon =
                n.type === 'interview_reminder' ? (
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : n.type === 'startup_opportunity' ? (
                  <Rocket className="w-4 h-4 text-sky-400 shrink-0" />
                ) : n.type === 'verification_warning' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                );

              return (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`p-3.5 rounded-xl border text-xs transition-all space-y-1 cursor-pointer ${
                    !n.isRead
                      ? 'bg-slate-900 border-sky-500/30'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className={`font-semibold ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-400 pl-6 text-[11px] leading-relaxed">{n.message}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
