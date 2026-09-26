const request = require('supertest');
const app = require('../app');
const { sequelize, Feedback } = require('../models');

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

describe('Reviews', () => {
    let lecturer, reviewerA, reviewerB;

    beforeAll(async () => {
        lecturer = await registerAndLogin('lecturer', 'review-lecturer');
        reviewerA = await registerAndLogin('reviewer', 'review-reviewerA');
        reviewerB = await registerAndLogin('reviewer', 'review-reviewerB');
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('blocks reviewing an assessment that has not been assigned to anyone yet', async () => {
        const assessmentId = await uploadAssessment(lecturer.token, 'Unassigned Test');

        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${reviewerA.token}`)
            .send({ assessmentId, comment: 'test', decision: 'approve' });

        expect(res.status).toBe(403);
    });

    it('does not accept a score even if one is sent — grading has been removed', async () => {
        const assessmentId = await uploadAssessment(lecturer.token, 'No Grading Test');
        await request(app)
            .patch(`/api/assessments/${assessmentId}/assign`)
            .set('Authorization', `Bearer ${lecturer.token}`)
            .send({ reviewerUserId: reviewerA.id });

        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${reviewerA.token}`)
            .send({ assessmentId, comment: 'Looks fine', score: 99, decision: 'approve' });

        expect(res.status).toBe(201);
        // Even though a score was sent in the request, the API never stores it.
        expect(res.body.feedback.score).toBeFalsy();
    });

    describe('once assigned to reviewerA', () => {
        let assessmentId;

        beforeEach(async () => {
            assessmentId = await uploadAssessment(lecturer.token, 'Draft Flow Test');
            await request(app)
                .patch(`/api/assessments/${assessmentId}/assign`)
                .set('Authorization', `Bearer ${lecturer.token}`)
                .send({ reviewerUserId: reviewerA.id });
        });

        it('blocks reviewerB (not the assigned reviewer) from reviewing it', async () => {
            const res = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerB.token}`)
                .send({ assessmentId, comment: 'hijack attempt', decision: 'approve' });

            expect(res.status).toBe(403);
        });

        it('lets reviewerA save a draft comment without changing the assessment status', async () => {
            const draftRes = await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Still checking' });

            expect(draftRes.status).toBe(200);
            expect(draftRes.body.isDraft).toBe(true);
            expect(draftRes.body.decision).toBeNull();

            const assessmentRes = await request(app)
                .get(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${reviewerA.token}`);

            expect(assessmentRes.body.status.statusName).toBe('Under Review'); // unchanged by the draft
        });

        it('returns the saved draft on GET so the page can pre-fill it', async () => {
            await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Draft comment' });

            const res = await request(app)
                .get(`/api/reviews/${assessmentId}/draft`)
                .set('Authorization', `Bearer ${reviewerA.token}`);

            expect(res.status).toBe(200);
            expect(res.body.comment).toBe('Draft comment');
        });

        it('updates the same draft on repeated saves instead of creating duplicates', async () => {
            await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'First save' });

            await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Second save' });

            const drafts = await Feedback.findAll({ where: { assessmentId, isDraft: true } });
            expect(drafts.length).toBe(1);
            expect(drafts[0].comment).toBe('Second save');
        });

        it('absorbs the draft into a single final row when submitted, rather than duplicating it', async () => {
            await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Working on it' });

            const finalRes = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Final comments', decision: 'approve' });

            expect(finalRes.status).toBe(201);
            expect(finalRes.body.feedback.isDraft).toBe(false);
            expect(finalRes.body.feedback.decision).toBe('Approved');
            expect(finalRes.body.feedback.comment).toBe('Final comments');

            const allFeedback = await Feedback.findAll({ where: { assessmentId } });
            expect(allFeedback.length).toBe(1); // draft was absorbed, not duplicated

            const assessmentRes = await request(app)
                .get(`/api/assessments/${assessmentId}`)
                .set('Authorization', `Bearer ${lecturer.token}`);
            expect(assessmentRes.body.status.statusName).toBe('Approved');
        });

        it('sets status to "Changes Requested" when that decision is submitted', async () => {
            const res = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Needs work', decision: 'request_changes' });

            expect(res.status).toBe(201);
            expect(res.body.feedback.decision).toBe('Changes Requested');
        });

        it('excludes drafts from the finalized feedback history', async () => {
            await request(app)
                .post('/api/reviews/draft')
                .set('Authorization', `Bearer ${reviewerA.token}`)
                .send({ assessmentId, comment: 'Just a draft' });

            const res = await request(app)
                .get(`/api/reviews/${assessmentId}/history`)
                .set('Authorization', `Bearer ${reviewerA.token}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(0); // only the draft exists so far, nothing finalized
        });
    });
});
