# Security Specification — Ms nardeen Academy

## 1. Data Invariants
1. **Strict RBAC Separation**: Only verified teacher accounts (`khalid134099@gmail.com` with `email_verified == true` or UIDs registered in `/teachers/{uid}`) may create/modify/delete lessons, tasks, rewards, announcements, or manually adjust student points/badges/levels.
2. **PII Isolation**: User emails and private notification preferences live exclusively in `/user_private/{uid}`, readable/writable only by the owning user or bootstrapped admin. `/students/{uid}` contains zero PII.
3. **Zero Client-Side Point Tampering**: A student can NEVER arbitrarily change `totalPoints`, `lifetimePoints`, `weeklyEarned`, `monthlyEarned`, `badges`, or `level` on `/students/{uid}`. Point increments from lessons or quizzes are strictly validated against the referenced lesson/task document and gated on creating a unique completion/submission document atomically in the same batch.
4. **Pending-Only Reward Redemption**: Students can only create `/redemptions/{id}` with `status: 'pending'` and `costPoints` matching the reward document while `student.totalPoints >= reward.costPoints`. Points are deducted exclusively when a teacher approves the redemption.
5. **Terminal State Locking**: Once a `redemption` reaches `'approved'` or `'rejected'`, or a `task_submission` reaches `'approved'` or `'completed'`, non-teacher users cannot alter it.
6. **Temporal & Identity Integrity**: All `createdAt`, `updatedAt`, `completedAt`, `submittedAt`, `requestedAt`, `readAt` fields are strictly bound to `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Promotion to Teacher**: Student attempts `setDoc(doc(db, 'teachers', uid), { uid, displayName: 'Fake Teacher', addedBy: uid, createdAt: serverTimestamp() })`.
2. **Shadow Field Injection on Signup**: Student creates `/students/{uid}` with extra field `{ isAdmin: true }`.
3. **Initial Points Spoofing**: Student creates `/students/{uid}` with `totalPoints: 9999`.
4. **Direct Balance Manipulation**: Student updates `/students/{uid}` changing `totalPoints` without a corresponding atomic lesson/quiz completion.
5. **Duplicate Lesson Claim**: Student submits a second completion for an already-completed lesson or alters `pointsAwarded` to `9999` instead of `lesson.points`.
6. **Auto-Approve Own Redemption**: Student creates `/redemptions/{id}` with `status: 'approved'` or `costPoints: 0`.
7. **Other Student's PII Read**: Student A attempts `getDoc(doc(db, 'user_private', studentBUid))`.
8. **Private Note Scraping**: Student A lists `/notes` without filtering or tries `getDoc` on a private note addressed to Student B.
9. **Spoofed Authorship**: Student A creates `/task_submissions/{id}` with `studentId: studentBUid`.
10. **Unverified Email Admin Spoof**: Token with `email: 'khalid134099@gmail.com'` and `email_verified: false` tries to create `/lessons/{id}`.
11. **Oversized ID Poisoning**: User attempts write to `/lessons/${'a'.repeat(300)}`.
12. **Client Timestamp Forgery**: Student writes `/point_transactions/{id}` with backdated `createdAt: new Date('2020-01-01')`.
