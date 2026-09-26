require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Reviewer, ApprovalStatus, Assessment, Feedback, AuditLog } = require('./models');

async function seed() {
    // WARNING: { force: true } drops and recreates every table. Dev/demo use only.
    await sequelize.sync({ force: true });

    const statuses = await ApprovalStatus.bulkCreate([
        { statusName: 'Pending' },
        { statusName: 'Under Review' },
        { statusName: 'Approved' },
        { statusName: 'Changes Requested' },
    ]);

    const findStatus = (name) => statuses.find((s) => s.statusName === name);

    const passwordHash = await bcrypt.hash('password123', 10);

const sulav = await User.create({ fullName: 'Sulav', email: 'sulav@example.edu', passwordHash, role: 'reviewer' });
const sulavReviewer = await Reviewer.create({ userId: sulav.id, department: 'ICT' });

const ram = await User.create({ fullName: 'Ram', email: 'ram@example.edu', passwordHash, role: 'reviewer' });
const ramReviewer = await Reviewer.create({ userId: ram.id, department: 'ICT' });

const raj = await User.create({ fullName: 'Raj', email: 'raj@example.edu', passwordHash, role: 'reviewer' });
const rajReviewer = await Reviewer.create({ userId: raj.id, department: 'ICT' });

const john = await User.create({ fullName: 'John Doe', email: 'john.doe@example.edu', passwordHash, role: 'lecturer' });

// Admin/coordinator account — the only role that can assign a reviewer to an assessment.
const admin = await User.create({ fullName: 'Coordinator Admin', email: 'admin@example.edu', passwordHash, role: 'admin' });

const a1 = await Assessment.create({
    title: 'Assignment 1',
    subjectCode: 'ICT304',
    assessmentType: 'Assignment',
    uploadedBy: john.id,
    reviewerId: sulavReviewer.id,
    statusId: findStatus('Under Review').id,
});

const a2 = await Assessment.create({
    title: 'Quiz 2',
    subjectCode: 'ICT301',
    assessmentType: 'Quiz',
    uploadedBy: john.id,
    reviewerId: ramReviewer.id,
    statusId: findStatus('Approved').id,
});

await Assessment.create({
    title: 'Final Exam',
    subjectCode: 'ICT303',
    assessmentType: 'Exam',
    uploadedBy: john.id,
    reviewerId: rajReviewer.id,
    statusId: findStatus('Under Review').id,
});

// Not yet assigned to any reviewer — the admin needs to assign one before it can be reviewed.
await Assessment.create({
    title: 'Assignment 3',
    subjectCode: 'ICT304',
    assessmentType: 'Assignment',
    uploadedBy: john.id,
    reviewerId: null,
    statusId: findStatus('Pending').id,
});

await Feedback.create({
    assessmentId: a2.id,
    reviewerId: ramReviewer.id,
    comment: 'Well-structured, aligned with learning outcomes.',
    decision: 'Approved',
});

// A few audit log entries matching the demo data above, so the admin's
// Audit Log page has something realistic to show right after seeding.
await AuditLog.bulkCreate([
    { userId: john.id, action: 'UPLOAD', assessmentId: a1.id, details: 'Uploaded "Assignment 1" (ICT304)' },
    { userId: john.id, action: 'ASSIGN', assessmentId: a1.id, details: 'Assigned to Sulav' },
    { userId: john.id, action: 'UPLOAD', assessmentId: a2.id, details: 'Uploaded "Quiz 2" (ICT301)' },
    { userId: john.id, action: 'ASSIGN', assessmentId: a2.id, details: 'Assigned to Ram' },
    { userId: ram.id, action: 'APPROVE', assessmentId: a2.id, details: 'Approved "Quiz 2"' },
]);

console.log('Seed complete.\n');
console.log('Demo login (password: password123):');
console.log('  sulav@example.edu     (reviewer)');
console.log('  ram@example.edu       (reviewer)');
console.log('  raj@example.edu       (reviewer)');
console.log('  john.doe@example.edu  (lecturer)');
console.log('  admin@example.edu     (admin — can assign reviewers)');

process.exit(0);
}

seed().catch((err) => {
console.error('Seeding failed:', err);
process.exit(1);
});