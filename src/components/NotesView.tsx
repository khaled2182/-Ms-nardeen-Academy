import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  ExternalLink,
  FileText,
  ImagePlus,
  Megaphone,
  MessageSquarePlus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { compressTransparentImageFile } from '../lib/gamification';
import { t } from '../lib/i18n';
import { AcademyNote, Language, StudentProfile, VALIDATION_LIMITS } from '../types';
import { EmptyState } from './SharedUI';

interface NotesViewProps {
  lang: Language;
  notes: AcademyNote[];
  readNoteIds: Set<string>;
  currentStudent?: StudentProfile | null;
  currentUserId?: string;
  isTeacherPreview?: boolean;
  onMarkRead: (noteId: string) => Promise<void>;
  onCreateStudentNote?: (data: {
    title: string;
    content: string;
    category: 'student_note' | 'student_issue';
    attachmentUrl: string;
    attachmentType: 'none' | 'image' | 'link';
  }) => Promise<void>;
  onDeleteOwnNote?: (noteId: string) => Promise<void>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  lang,
  notes,
  readNoteIds,
  currentStudent,
  currentUserId,
  isTeacherPreview = false,
  onMarkRead,
  onCreateStudentNote,
  onDeleteOwnNote,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'community'>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [category, setCategory] = useState<'student_note' | 'student_issue'>('student_note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachmentType, setAttachmentType] = useState<'none' | 'image' | 'link'>('none');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const visibleNotes = notes.filter((n) => {
    if (filter === 'unread') return !readNoteIds.has(n.id);
    if (filter === 'community') {
      return n.category === 'student_note' || n.category === 'student_issue';
    }
    return true;
  });

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    try {
      const compressed = await compressTransparentImageFile(file);
      setAttachmentType('image');
      setAttachmentUrl(compressed);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر قراءة الصورة'
          : 'Failed to load image'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateStudentNote || !title.trim() || !content.trim()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreateStudentNote({
        title: title.trim(),
        content: content.trim(),
        category,
        attachmentUrl: attachmentType === 'none' ? '' : attachmentUrl.trim(),
        attachmentType: attachmentType !== 'none' && attachmentUrl.trim() ? attachmentType : 'none',
      });
      setTitle('');
      setContent('');
      setAttachmentType('none');
      setAttachmentUrl('');
      setShowComposer(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر إرسال الملاحظة'
          : 'Failed to publish note'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryMeta = (note: AcademyNote) => {
    if (note.category === 'announcement') {
      return {
        icon: <Megaphone className="w-4 h-4 text-violet-500 shrink-0" />,
        label: t(lang, 'generalAnnouncement'),
        badgeClass: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60',
      };
    }
    if (note.category === 'student_issue') {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
        label: lang === 'ar' ? 'مشكلة / استفسار طالب' : 'Student Issue',
        badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60',
      };
    }
    if (note.category === 'student_note') {
      return {
        icon: <Users className="w-4 h-4 text-emerald-500 shrink-0" />,
        label: lang === 'ar' ? 'ملاحظة طالب للجميع' : 'Student Note',
        badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60',
      };
    }
    return {
      icon: <FileText className="w-4 h-4 text-sky-500 shrink-0" />,
      label: t(lang, 'personalNote'),
      badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60',
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'notesTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar'
              ? 'إعلانات المعلمة وملاحظات ومشاكل الطلاب المشتركة أمام الجميع.'
              : 'Ms Nardeen announcements plus shared student notes and issues visible to everyone.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto max-w-full">
          <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center truncate ${
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
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                filter === 'unread'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t(lang, 'unreadLabel')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('community')}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                filter === 'community'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {lang === 'ar' ? 'مشاركات الطلاب' : 'Student Posts'}
            </button>
          </div>

          {!isTeacherPreview && currentStudent && onCreateStudentNote && (
            <button
              type="button"
              onClick={() => setShowComposer(!showComposer)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
            >
              <MessageSquarePlus className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'أضف ملاحظة أو مشكلة' : 'Post Note / Issue'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Public Note / Issue Composer */}
      {showComposer && !isTeacherPreview && currentStudent && onCreateStudentNote && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/80 p-5 sm:p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'مشاركة ملاحظة أو مشكلة مع الجميع' : 'Share a Note or Issue with Everyone'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'ستظهر هذه المشاركة لجميع الطلاب وللمعلمة Ms Nardeen.'
                  : 'This post will be visible to all students and Ms Nardeen.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500"
              aria-label={t(lang, 'cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory('student_note')}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                category === 'student_note'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'ملاحظة / مشاركة' : 'Note / Idea'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory('student_issue')}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                category === 'student_issue'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'مشكلة / استفسار' : 'Issue / Question'}</span>
            </button>
          </div>

          <input
            type="text"
            required
            maxLength={VALIDATION_LIMITS.TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              category === 'student_issue'
                ? lang === 'ar'
                  ? 'عنوان المشكلة أو السؤال...'
                  : 'Short title for your issue or question...'
                : lang === 'ar'
                ? 'عنوان الملاحظة...'
                : 'Short title for your note...'
            }
            className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />

          <textarea
            required
            rows={3}
            maxLength={VALIDATION_LIMITS.NOTE_CONTENT_MAX}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              category === 'student_issue'
                ? lang === 'ar'
                  ? 'اشرح المشكلة أو النقطة التي تحتاج مساعدة فيها...'
                  : 'Describe the issue or question clearly...'
                : lang === 'ar'
                ? 'اكتب ملاحظتك هنا لتظهر لجميع زملائك والمعلمة...'
                : 'Write your note here to share with your classmates and teacher...'
            }
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />

          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{lang === 'ar' ? 'إرفاق صورة (اختياري)' : 'Attach Image (Optional)'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </label>

            {attachmentType === 'image' && attachmentUrl && (
              <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-3 py-1.5 rounded-xl">
                <img
                  src={attachmentUrl}
                  alt="Attachment preview"
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                  {lang === 'ar' ? 'تم إرفاق الصورة' : 'Image attached'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentType('none');
                    setAttachmentUrl('');
                  }}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? t(lang, 'loadingText')
                  : lang === 'ar'
                  ? 'نشر للجميع'
                  : 'Publish to All'}
              </span>
            </button>
          </div>
        </form>
      )}

      {visibleNotes.length === 0 ? (
        <EmptyState icon={<Bell className="w-7 h-7" />} title={t(lang, 'noNotesYet')} />
      ) : (
        <div className="space-y-4">
          {visibleNotes.map((note) => {
            const isUnread = !readNoteIds.has(note.id);
            const meta = getCategoryMeta(note);
            const isOwnStudentPost =
              Boolean(currentUserId) &&
              note.createdBy === currentUserId &&
              note.authorRole === 'student';

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
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${meta.badgeClass}`}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </span>
                    {note.authorName && (
                      <span className="text-slate-700 dark:text-slate-200 font-bold">
                        · {note.authorName}
                      </span>
                    )}
                    {isUnread && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">
                          {t(lang, 'unreadLabel')}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {!isTeacherPreview && isUnread && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(note.id)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>{t(lang, 'markAsRead')}</span>
                      </button>
                    )}

                    {!isTeacherPreview && isOwnStudentPost && onDeleteOwnNote && (
                      <button
                        type="button"
                        onClick={() => onDeleteOwnNote(note.id)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                        aria-label={t(lang, 'deleteLabel')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'deleteLabel')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {lang === 'ar' ? note.titleAr : note.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed break-words">
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
