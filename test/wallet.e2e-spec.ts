import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Wallet Module (e2e)', () => {
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

    // Create test user and get token
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        fullName: 'Wallet Test User',
        email: `wallettest${Date.now()}@example.com`,
        password: 'password123',
      });

    userId = signupRes.body.userId;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `wallettest${Date.now()}@example.com`,
        password: 'password123',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Wallet - Create', () => {
    it('should successfully create a wallet for authenticated user', () => {
      return request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('userId', userId);
          expect(res.body).toHaveProperty('balance', 0);
        });
    });

    it('should fail when creating duplicate wallet for user', async () => {
      // Create first wallet
      await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      // Attempt to create second wallet
      return request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already has a wallet');
        });
    });

    it('should fail without authentication token', () => {
      return request(app.getHttpServer()).post('/wallets').send({}).expect(401);
    });
  });

  describe('Wallet - Get Balance', () => {
    let walletId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      walletId = res.body.id;
    });

    it('should successfully retrieve wallet balance', () => {
      return request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('walletId');
          expect(res.body).toHaveProperty('balance', 0);
          expect(res.body).toHaveProperty('totalCredits');
          expect(res.body).toHaveProperty('totalDebits');
          expect(res.body).toHaveProperty('transactionCount');
        });
    });

    it('should fail without authentication token', () => {
      return request(app.getHttpServer()).get('/wallets').expect(401);
    });
  });

  describe('Wallet - Fund', () => {
    let walletId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      walletId = res.body.id;
    });

    it('should successfully fund wallet with valid amount', () => {
      return request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          description: 'Initial funding',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('newBalance', '5000.00');
          expect(res.body).toHaveProperty('reference');
        });
    });

    it('should fail with zero amount', () => {
      return request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('greater than 0');
        });
    });

    it('should fail with negative amount', () => {
      return request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
        })
        .expect(400);
    });

    it('should create transaction record when funding', async () => {
      const fundRes = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          description: 'Test funding',
        })
        .expect(200);

      const reference = fundRes.body.reference;

      return request(app.getHttpServer())
        .get(`/transactions/reference/${reference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should fail without authentication token', () => {
      return request(app.getHttpServer())
        .post('/wallets/fund')
        .send({
          amount: 5000,
        })
        .expect(401);
    });
  });

  describe('Wallet - Withdraw', () => {
    let authToken2: string;

    beforeAll(async () => {
      // Create new user with funded wallet
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Withdraw Test User',
          email: `withdrawtest${Date.now()}@example.com`,
          password: 'password123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `withdrawtest${Date.now()}@example.com`,
          password: 'password123',
        });

      authToken2 = loginRes.body.accessToken;

      // Create and fund wallet
      await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({});

      await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: 5000,
        });
    });

    it('should successfully withdraw with sufficient balance', () => {
      return request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: 1000,
          description: 'Test withdrawal',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('newBalance', '4000.00');
          expect(res.body).toHaveProperty('reference');
        });
    });

    it('should fail with insufficient balance', () => {
      return request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: 10000,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Insufficient balance');
        });
    });

    it('should fail with zero amount', () => {
      return request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('greater than 0');
        });
    });

    it('should fail with negative amount', () => {
      return request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: -500,
        })
        .expect(400);
    });

    it('should create debit transaction when withdrawing', async () => {
      const withdrawRes = await request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          amount: 500,
          description: 'Test withdrawal',
        })
        .expect(200);

      const reference = withdrawRes.body.reference;

      return request(app.getHttpServer())
        .get(`/transactions/reference/${reference}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].type).toBe('debit');
        });
    });
  });

  describe('Wallet - Delete', () => {
    it('should successfully delete wallet with zero balance', async () => {
      // Create new user
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Delete Test User',
          email: `deletetest${Date.now()}@example.com`,
          password: 'password123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `deletetest${Date.now()}@example.com`,
          password: 'password123',
        });

      const token = loginRes.body.accessToken;

      // Create wallet (zero balance)
      await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      return request(app.getHttpServer())
        .delete('/wallets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('deleted successfully');
        });
    });

    it('should fail to delete wallet with non-zero balance', async () => {
      // Create new user
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Delete Balance Test User',
          email: `deletebaltest${Date.now()}@example.com`,
          password: 'password123',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `deletebaltest${Date.now()}@example.com`,
          password: 'password123',
        });

      const token = loginRes.body.accessToken;

      // Create and fund wallet
      await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1000,
        });

      return request(app.getHttpServer())
        .delete('/wallets')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Cannot delete wallet');
        });
    });
  });
});
