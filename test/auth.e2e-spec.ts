import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth - Signup', () => {
    it('should successfully signup a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email', 'john@example.com');
          expect(res.body).toHaveProperty('fullName', 'John Doe');
        });
    });

    it('should fail when email already exists', async () => {
      // First signup
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
        })
        .expect(201);

      // Attempt duplicate signup
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          password: 'password456',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Invalid User',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Short Pass',
          email: 'shortpass@example.com',
          password: '123',
        })
        .expect(400);
    });

    it('should fail with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          // Missing fullName and password
        })
        .expect(400);
    });
  });

  describe('Auth - Login', () => {
    let testUserEmail = 'testlogin@example.com';
    let testUserPassword = 'password123';

    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer()).post('/auth/signup').send({
        fullName: 'Login Test User',
        email: testUserEmail,
        password: testUserPassword,
      });
    });

    it('should successfully login and return JWT token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testUserEmail);
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUserPassword,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should fail without required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          // Missing password
        })
        .expect(400);
    });
  });

  describe('JWT Guard - Authorization', () => {
    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/wallets').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed auth header', () => {
      return request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', 'InvalidToken')
        .expect(401);
    });
  });
});
