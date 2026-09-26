const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');

// A unique-ish suffix so re-running tests never collides with leftover data
const suffix = Date.now();

describe('Auth', () => {
    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/auth/register', () => {
        it('creates a new lecturer account', async () => {
            const res = await request(app).post('/api/auth/register').send({
                fullName: 'Auth Test Lecturer',
                email: `auth-lecturer-${suffix}@example.edu`,
                password: 'password123',
                role: 'lecturer',
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.role).toBe('lecturer');
        });

        it('creates a new reviewer account (with a linked Reviewer record)', async () => {
            const res = await request(app).post('/api/auth/register').send({
                fullName: 'Auth Test Reviewer',
                email: `auth-reviewer-${suffix}@example.edu`,
                password: 'password123',
                role: 'reviewer',
            });

            expect(res.status).toBe(201);
            expect(res.body.role).toBe('reviewer');
        });

        it('rejects a duplicate email', async () => {
            const email = `auth-dup-${suffix}@example.edu`;
            await request(app).post('/api/auth/register').send({
                fullName: 'First', email, password: 'password123', role: 'lecturer',
            });

            const res = await request(app).post('/api/auth/register').send({
                fullName: 'Second', email, password: 'password123', role: 'lecturer',
            });

            expect(res.status).toBe(409);
        });

        it('rejects a missing required field', async () => {
            const res = await request(app).post('/api/auth/register').send({
                fullName: 'Missing Email',
                password: 'password123',
            });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        const email = `auth-login-${suffix}@example.edu`;

        beforeAll(async () => {
            await request(app).post('/api/auth/register').send({
                fullName: 'Login Test User', email, password: 'correct-password', role: 'lecturer',
            });
        });

        it('logs in with correct credentials and returns a token', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email, password: 'correct-password',
            });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(email);
        });

        it('rejects an incorrect password', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email, password: 'wrong-password',
            });

            expect(res.status).toBe(401);
        });

        it('rejects an email that does not exist', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: `no-such-user-${suffix}@example.edu`, password: 'whatever',
            });

            expect(res.status).toBe(401);
        });
    });
});
