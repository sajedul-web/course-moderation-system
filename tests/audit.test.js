const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');

const suffix = Date.now();

async function registerAndLogin(role, label) {
    const email = `${label}-${suffix}@example.edu`;
    await request(app).post('/api/auth/register').send({
        fullName: label, email, password: 'password123', role,
    });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    return { token: res.body.token, id: res.body.user.id };
}

async function uploadAssessment(lecturerToken, title) {
    const res = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .field('title', title)
        .field('subjectCode', 'ICT304')
        .field('assessmentType', 'Assignment');
    return res.body.id;
}

describe('Admin reassignment and audit log', () => {
    let lecturer, admin, reviewerA, reviewerB;

    beforeAll(async () => {
        lecturer = await registerAndLogin('lecturer', 'audit-lecturer');
        admin = await registerAndLogin('admin', 'audit-admin');
        reviewerA = await registerAndLogin('reviewer', 'audit-reviewerA');
        reviewerB = await registerAndLogin('reviewer', 'audit-reviewerB');
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('audit log access', () => {
        it('blocks a non-admin from viewing the audit log', async () => {
            const res = await request(app)
                .get('/api/audit-logs')
                .set('Authorization', `Bearer ${lecturer.token}`);

            expect(res.status).toBe(403);
        });

        it('lets an admin view the audit log', async () => {
            const res = await request(app)
                .get('/api/audit-logs')
                .set('Authorization', `Bearer ${admin.token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('actions get logged', () => {
        it('logs an UPLOAD entry when an assessment is created', async () => {
            const assessmentId = await uploadAssessment(lecturer.token, 'Audit Upload Test');

            const res = await request(app)
                .get('/api/audit-logs')
                .set('Authorization', `Bearer ${admin.token}`);

            const entry = res.body.find(l => l.action === 'UPLOAD' && l.assessmentId === assessmentId);
            expect(entry).toBeTruthy();
            expect(entry.actor.fullName).toBe('audit-lecturer');
        });

        it('logs an APPROVE entry when a reviewer approves', async () => {
            const assessmentId = await uploadAssessment(lecturer.token, 'Audit Approve Test');
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });
            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Good', decision: 'approve' });

            const res = await request(app)
                .get('/api/audit-logs')
                .set('Authorization', `Bearer ${admin.token}`);

            const entry = res.body.find(l => l.action === 'APPROVE' && l.assessmentId === assessmentId);
            expect(entry).toBeTruthy();
        });
    });

    describe('reassignment after approval', () => {
        let assessmentId;

        beforeEach(async () => {
            assessmentId = await uploadAssessment(lecturer.token, 'Reassign Test');
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });
            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Approved first pass', decision: 'approve' });
        });

        it('blocks the lecturer from reassigning an already-approved assessment', async () => {
            const res = await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerB.id });

            expect(res.status).toBe(400);
        });

        it('lets an admin reassign an already-approved assessment to a different reviewer', async () => {
            const res = await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${admin.token}`)
                .send({ reviewerUserId: reviewerB.id });

            expect(res.status).toBe(200);
            expect(res.body.reviewerId).not.toBeNull();
            expect(res.body.status.statusName).toBe('Under Review'); // sent back into the review queue
        });

        it('logs a REASSIGN entry (not ASSIGN) when admin reassigns', async () => {
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${admin.token}`)
                .send({ reviewerUserId: reviewerB.id });

            const res = await request(app)
                .get('/api/audit-logs')
                .set('Authorization', `Bearer ${admin.token}`);

            const entry = res.body.find(l => l.action === 'REASSIGN' && l.assessmentId === assessmentId);
            expect(entry).toBeTruthy();
            expect(entry.details).toMatch(/Reassigned from/);
        });

        it('lets the new reviewer act on it after reassignment', async () => {
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${admin.token}`)
                .send({ reviewerUserId: reviewerB.id });

            const res = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerB.token}`)
                .send({ assessmentId, comment: 'Second opinion', decision: 'request_changes' });

            expect(res.status).toBe(201);
            expect(res.body.feedback.decision).toBe('Changes Requested');
        });
    });
});
