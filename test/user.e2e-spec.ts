import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('User Module (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Create test user
    const userEmail = `usertest${Date.now()}@example.com`;
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        fullName: 'User Test Person',
        email: userEmail,
        password: 'password123',
      });

    userId = signupRes.body.userId;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userEmail,
        password: 'password123',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User - Get All Users', () => {
    it('should retrieve all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);

          res.body.forEach((user: any) => {
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('fullName');
            expect(user).toHaveProperty('email');
            expect(user).not.toHaveProperty('password');
          });
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('User - Get User by ID', () => {
    it('should retrieve a specific user by ID', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('fullName');
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });

    it('should fail with non-existent user ID', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });

    it('should not expose password field', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).not.toHaveProperty('password');
        });
    });
  });

  describe('User - User Profile Data', () => {
    it('should have correct user profile information', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('fullName');
          expect(res.body).toHaveProperty('email');
          expect(typeof res.body.email).toBe('string');
          expect(typeof res.body.fullName).toBe('string');
          expect(res.body.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
    });
  });

  describe('User - Wallet Integration', () => {
    it('should retrieve user with wallet relationship', async () => {
      // Create wallet for user
      await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('wallet');
        });
    });
  });

  describe('User - Data Privacy', () => {
    it('should not expose other user passwords in user list', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          res.body.forEach((user: any) => {
            expect(user).not.toHaveProperty('password');
          });
        });
    });

    it('should have correct timestamps', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');

          const createdAt = new Date(res.body.createdAt);
          const updatedAt = new Date(res.body.updatedAt);

          expect(createdAt instanceof Date).toBe(true);
          expect(updatedAt instanceof Date).toBe(true);
        });
    });
  });

  describe('User - Authentication Edge Cases', () => {
    it('should work with valid Bearer token', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail with missing Bearer prefix', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', authToken)
        .expect(401);
    });

    it('should fail with empty token', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('should be case-sensitive for Bearer scheme', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `bearer ${authToken}`)
        .expect(401);
    });
  });
});
