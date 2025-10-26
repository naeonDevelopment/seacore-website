import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, X, Menu, MoreVertical, Trash2, Edit2, Check } from 'lucide-react';
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
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleStartEdit = (session: Session) => {
    setEditingSessionId(session.id);
    setEditName(session.name);
    setMenuOpenId(null);
  };

  const handleSaveEdit = (sessionId: string) => {
    if (editName.trim()) {
      onRenameSession(sessionId, editName.trim());
    }
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string) => {
    onDeleteSession(sessionId);
    setMenuOpenId(null);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 enterprise-heading flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>Sessions</span>
        </h2>
        {isMobile && onClose && (
          <button
            onClick={onClose}
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
          const isMenuOpen = menuOpenId === session.id;

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
                    <div className="flex-1 min-w-0">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(isMenuOpen ? null : session.id);
                      }}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                        isMenuOpen
                          ? 'bg-slate-200 dark:bg-slate-700'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Context Menu */}
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50"
                    >
                      <button
                        onClick={() => handleStartEdit(session)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={sessions.length === 1}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );

  // Desktop: Floating sidebar centered vertically with auto height
  if (!isMobile) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed left-6 top-1/2 -translate-y-1/2 w-80 max-h-[75vh] z-[100]"
      >
        {sidebarContent}
      </motion.div>
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
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-0 top-0 bottom-0 w-80 z-[100] lg:hidden"
          >
            {sidebarContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SessionSidebar;

