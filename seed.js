require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Reviewer, ApprovalStatus, Assessment, Feedback } = require('./models');

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

const a1 = await Assessment.create({
    title: 'Assignment 1',
    subjectCode: 'ICT304',
    assessmentType: 'Assignment',
    uploadedBy: john.id,
    reviewerId: sulavReviewer.id,
    statusId: findStatus('Pending').id,
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

await Feedback.create({
    assessmentId: a2.id,
    reviewerId: ramReviewer.id,
    comment: 'Well-structured, aligned with learning outcomes.',
    decision: 'Approved',
});

console.log('Seed complete.\n');
console.log('Demo login (password: password123):');
console.log('  sulav@example.edu     (reviewer)');
console.log('  ram@example.edu       (reviewer)');
console.log('  raj@example.edu       (reviewer)');
console.log('  john.doe@example.edu  (lecturer)');

process.exit(0);
}

seed().catch((err) => {
console.error('Seeding failed:', err);
process.exit(1);
});