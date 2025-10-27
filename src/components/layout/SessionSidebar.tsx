import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, X, Menu, Trash2, Check, List } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Session } from '@/hooks/useSessions';

interface SessionSidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onCreateSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  isMobile = false,
  isOpen = true,
  onClose,
  onToggle,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditName(session.name);
  };

  const handleSaveEdit = (sessionId: string) => {
    if (editName.trim()) {
      onRenameSession(sessionId, editName.trim());
    }
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 enterprise-heading flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>Sessions</span>
        </h2>
        {/* Close button for both mobile and desktop */}
        {((isMobile && onClose) || (!isMobile && onToggle)) && (
          <button
            onClick={isMobile ? onClose : onToggle}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        )}
      </div>

      {/* New Session Button */}
      <div className="p-3">
        <button
          onClick={onCreateSession}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 hover:from-maritime-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isEditing = editingSessionId === session.id;

          return (
            <div key={session.id} className="relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'group relative rounded-lg transition-all cursor-pointer',
                  isActive
                    ? 'bg-maritime-50 dark:bg-maritime-950/50 border-2 border-maritime-500'
                    : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-maritime-300 dark:hover:border-maritime-700'
                )}
                onClick={() => !isEditing && onSwitchSession(session.id)}
              >
                <div className="w-full px-3 py-2.5 flex items-center gap-2">
                  <MessageSquare
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isActive ? 'text-maritime-600 dark:text-maritime-400' : 'text-slate-400'
                    )}
                  />
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-maritime-500 rounded focus:outline-none focus:ring-2 focus:ring-maritime-500"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="flex-1 min-w-0 cursor-text"
                      onClick={(e) => handleStartEdit(session, e)}
                    >
                      <p
                        className={cn(
                          'text-sm font-semibold truncate',
                          isActive
                            ? 'text-maritime-700 dark:text-maritime-300'
                            : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {session.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {session.messages.length} messages
                      </p>
                    </div>
                  )}

                  {isEditing ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(session.id);
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-maritime-100 dark:hover:bg-maritime-900 flex items-center justify-center transition-colors"
                    >
                      <Check className="w-4 h-4 text-maritime-600" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      disabled={sessions.length === 1}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                        sessions.length === 1
                          ? 'opacity-30 cursor-not-allowed'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30'
                      )}
                      title={sessions.length === 1 ? 'Cannot delete last session' : 'Delete session'}
                    >
                      <Trash2 className={cn(
                        'w-4 h-4',
                        sessions.length === 1 
                          ? 'text-slate-400'
                          : 'text-red-600 dark:text-red-400'
                      )} />
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
          <span className="text-maritime-600 dark:text-maritime-400 font-semibold">
            fleetcore AI
          </span>
        </div>
      </div>
    </div>
  );

  // Desktop: Floating sidebar positioned at top with toggle button (hidden on smaller screens)
  if (!isMobile) {
    return (
      <>
        {/* Toggle Button - Only visible when sidebar is closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={onToggle}
              className={cn(
                "fixed left-0 top-32 z-[101] hidden lg:flex items-center justify-center",
                "w-10 h-14 rounded-r-xl",
                "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
                "border border-l-0 border-slate-200/50 dark:border-slate-700/50",
                "shadow-xl hover:shadow-2xl",
                "transition-all duration-300",
                "hover:w-12",
                "group"
              )}
              aria-label="Open sessions"
            >
              <List className="w-5 h-5 text-slate-600 dark:text-slate-400 transition-colors group-hover:text-maritime-600 dark:group-hover:text-maritime-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sidebar - Conditionally visible */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-2 xl:left-6 top-32 w-56 xl:w-64 max-h-[500px] z-[100] hidden lg:block"
            >
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Mobile: Drawer
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[99] lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-0 top-0 bottom-0 w-72 z-[100] lg:hidden"
          >
            {sidebarContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SessionSidebar;

