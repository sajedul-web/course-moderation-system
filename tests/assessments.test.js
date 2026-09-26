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

describe('Assessments', () => {
    let lecturer, otherLecturer, reviewerA, reviewerB;

    beforeAll(async () => {
        lecturer = await registerAndLogin('lecturer', 'assess-lecturer');
        otherLecturer = await registerAndLogin('lecturer', 'assess-other-lecturer');
        reviewerA = await registerAndLogin('reviewer', 'assess-reviewerA');
        reviewerB = await registerAndLogin('reviewer', 'assess-reviewerB');
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('rejects an upload with no auth token', async () => {
        const res = await request(app).post('/api/assessments').field('title', 'No Auth');
        expect(res.status).toBe(401);
    });

    it('rejects a reviewer trying to upload', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .set('Authorization', `Bearer ${reviewerA.token}`)
            .field('title', 'Should Fail')
            .field('subjectCode', 'ICT100')
            .field('assessmentType', 'Assignment');

        expect(res.status).toBe(403);
    });

    it('lets a lecturer upload an assessment with a semester', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .set('Authorization', `Bearer ${lecturer.token}`)
            .field('title', 'Test Assignment 1')
            .field('subjectCode', 'ict304')
            .field('assessmentType', 'Assignment')
            .field('semester', 'Semester 1 2026');

        expect(res.status).toBe(201);
        expect(res.body.subjectCode).toBe('ICT304'); // uppercased server-side
        expect(res.body.semester).toBe('Semester 1 2026');
        expect(res.body.reviewerId).toBeNull(); // unassigned at upload time
    });

    it('rejects an upload missing required fields', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .set('Authorization', `Bearer ${lecturer.token}`)
            .field('title', 'Missing Fields');

        expect(res.status).toBe(400);
    });

    describe('list and get', () => {
        let assessmentId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/assessments')
                .set('Authorization', `Bearer ${lecturer.token}`)
                .field('title', 'List/Get Test')
                .field('subjectCode', 'ICT200')
                .field('assessmentType', 'Quiz');
            assessmentId = res.body.id;
        });

        it('lists assessments including the one just created', async () => {
            const res = await request(app)
                .get('/api/assessments')
                .set('Authorization', `Bearer ${lecturer.token}`);

            expect(res.status).toBe(200);
            expect(res.body.some(a => a.id === assessmentId)).toBe(true);
        });

        it('gets a single assessment by id', async () => {
            const res = await request(app)
                .get(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${lecturer.token}`);

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('List/Get Test');
        });

        it('returns 404 for a non-existent assessment', async () => {
            const res = await request(app)
                .get('/api/assessments/999999')
                .set('Authorization', `Bearer ${lecturer.token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('assigning a reviewer', () => {
        let assessmentId;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/assessments')
                .set('Authorization', `Bearer ${lecturer.token}`)
                .field('title', 'Assign Test')
                .field('subjectCode', 'ICT210')
                .field('assessmentType', 'Exam');
            assessmentId = res.body.id;
        });

        it('lets the owning lecturer assign a reviewer', async () => {
            const res = await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });

            expect(res.status).toBe(200);
            expect(res.body.status.statusName).toBe('Under Review');
        });

        it('blocks a different lecturer from assigning a reviewer to someone else\'s upload', async () => {
            const res = await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${otherLecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });

            expect(res.status).toBe(403);
        });

        it('blocks a reviewer from assigning a reviewer', async () => {
            const res = await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ reviewerUserId: reviewerB.id });

            expect(res.status).toBe(403);
        });
    });

    describe('edit / resubmit', () => {
        let assessmentId;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/assessments')
                .set('Authorization', `Bearer ${lecturer.token}`)
                .field('title', 'Edit Test')
                .field('subjectCode', 'ICT220')
                .field('assessmentType', 'Assignment');
            assessmentId = res.body.id;
        });

        it('lets the owner edit their assessment and resets status to Pending', async () => {
            const res = await request(app)
                .put(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .field('title', 'Edited Title');

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Edited Title');
            expect(res.body.status.statusName).toBe('Pending');
        });

        it('blocks a different lecturer from editing someone else\'s assessment', async () => {
            const res = await request(app)
                .put(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${otherLecturer.token}`)
                .field('title', 'Hijacked');

            expect(res.status).toBe(403);
        });

        it('blocks editing once the assessment is Approved', async () => {
            // Assign, then have the reviewer approve it
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });

            await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Good', decision: 'approve' });

            const res = await request(app)
                .put(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .field('title', 'Too Late');

            expect(res.status).toBe(400);
        });
    });
});
