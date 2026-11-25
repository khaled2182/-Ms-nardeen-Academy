import React, { useState } from 'react';
import { Bell, Check, ExternalLink, FileText, Megaphone } from 'lucide-react';
import { t } from '../lib/i18n';
import { AcademyNote, Language } from '../types';
import { EmptyState } from './SharedUI';

interface NotesViewProps {
  lang: Language;
  notes: AcademyNote[];
  readNoteIds: Set<string>;
  isTeacherPreview?: boolean;
  onMarkRead: (noteId: string) => Promise<void>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  lang,
  notes,
  readNoteIds,
  isTeacherPreview = false,
  onMarkRead,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const visibleNotes = notes.filter((n) => (filter === 'unread' ? !readNoteIds.has(n.id) : true));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'notesTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar'
              ? 'ملاحظات Ms Nardeen الموجهة لك والإعلانات العامة للأكاديمية.'
              : 'Personal notes from Ms Nardeen and academy-wide announcements.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t(lang, 'filterAll')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t(lang, 'unreadLabel')}
          </button>
        </div>
      </div>

      {visibleNotes.length === 0 ? (
        <EmptyState icon={<Bell className="w-7 h-7" />} title={t(lang, 'noNotesYet')} />
      ) : (
        <div className="space-y-4">
          {visibleNotes.map((note) => {
            const isUnread = !readNoteIds.has(note.id);
            return (
              <article
                key={note.id}
                className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 sm:p-6 transition-colors ${
                  isUnread
                    ? 'border-sky-300 dark:border-sky-700'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {note.category === 'announcement' ? (
                      <Megaphone className="w-4 h-4 text-violet-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-sky-500" />
                    )}
                    <span>
                      {note.category === 'announcement'
                        ? t(lang, 'generalAnnouncement')
                        : t(lang, 'personalNote')}
                    </span>
                    {isUnread && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">
                          {t(lang, 'unreadLabel')}
                        </span>
                      </>
                    )}
                  </div>

                  {!isTeacherPreview && isUnread && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(note.id)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t(lang, 'markAsRead')}</span>
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {lang === 'ar' ? note.titleAr : note.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {lang === 'ar' ? note.contentAr : note.content}
                </p>

                {note.attachmentUrl && note.attachmentType !== 'none' && (
                  <div className="mt-4">
                    {note.attachmentType === 'image' ? (
                      <img
                        src={note.attachmentUrl}
                        alt={note.title}
                        referrerPolicy="no-referrer"
                        className="max-h-72 rounded-2xl border border-slate-200 dark:border-slate-800 object-contain"
                      />
                    ) : (
                      <a
                        href={note.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold text-sky-700 dark:text-sky-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{t(lang, 'openAttachment')}</span>
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
