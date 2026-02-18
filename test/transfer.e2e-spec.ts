import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Transfer Module (e2e)', () => {
  let app: INestApplication;
  let senderToken: string;
  let receiverToken: string;
  let senderWalletId: string;
  let receiverWalletId: string;

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

    // Create sender user
    const senderEmail = `sender${Date.now()}@example.com`;
    const senderSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        fullName: 'Sender User',
        email: senderEmail,
        password: 'password123',
      });

    const senderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: senderEmail,
        password: 'password123',
      });

    senderToken = senderLogin.body.accessToken;

    // Create sender wallet and fund it
    const senderWallet = await request(app.getHttpServer())
      .post('/wallets')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({});

    senderWalletId = senderWallet.body.id;

    await request(app.getHttpServer())
      .post('/wallets/fund')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        amount: 10000,
      });

    // Create receiver user
    const receiverEmail = `receiver${Date.now()}@example.com`;
    const receiverSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        fullName: 'Receiver User',
        email: receiverEmail,
        password: 'password123',
      });

    const receiverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: receiverEmail,
        password: 'password123',
      });

    receiverToken = receiverLogin.body.accessToken;

    // Create receiver wallet
    const receiverWallet = await request(app.getHttpServer())
      .post('/wallets')
      .set('Authorization', `Bearer ${receiverToken}`)
      .send({});

    receiverWalletId = receiverWallet.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Transfer - Initiate Transfer', () => {
    it('should successfully transfer funds between wallets', () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 1000,
          description: 'Payment for services',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('senderWalletId', senderWalletId);
          expect(res.body).toHaveProperty('receiverWalletId', receiverWalletId);
          expect(res.body).toHaveProperty('amount', '1000.00');
          expect(res.body).toHaveProperty('status', 'completed');
          expect(res.body).toHaveProperty('reference');
        });
    });

    it('should update balances after transfer', async () => {
      // Get initial balance
      const initialSender = await request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const initialBalance = parseFloat(initialSender.body.balance);

      // Make transfer
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 500,
        })
        .expect(201);

      // Get updated balance
      const updatedSender = await request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const updatedBalance = parseFloat(updatedSender.body.balance);

      expect(updatedBalance).toBe(initialBalance - 500);
    });

    it('should create paired transaction records (double-entry)', async () => {
      const transferRes = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 250,
        })
        .expect(201);

      const reference = transferRes.body.reference;

      // Verify both debit and credit transactions exist
      const transactions = await request(app.getHttpServer())
        .get(`/transactions/reference/${reference}`)
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(transactions.body).toBeInstanceOf(Array);
      expect(transactions.body.length).toBe(2);

      const types = transactions.body.map((t: any) => t.type).sort();
      expect(types).toContain('transfer_in');
      expect(types).toContain('transfer_out');
    });

    it('should fail when sender and receiver are the same', async () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: senderWalletId,
          amount: 1000,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('cannot be the same');
        });
    });

    it('should fail with insufficient balance', async () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 50000,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Insufficient balance');
        });
    });

    it('should fail with zero amount', () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('greater than 0');
        });
    });

    it('should fail with negative amount', () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: -1000,
        })
        .expect(400);
    });

    it('should fail with invalid receiver wallet ID', () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: 'invalid-wallet-id',
          amount: 1000,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Wallet not found');
        });
    });

    it('should fail without authentication token', () => {
      return request(app.getHttpServer())
        .post('/transfers')
        .send({
          receiverWalletId: receiverWalletId,
          amount: 1000,
        })
        .expect(401);
    });
  });

  describe('Transfer - Get User Transfers', () => {
    it('should return all transfers for authenticated user', async () => {
      // Make a transfer first
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 100,
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);

          // Verify structure
          res.body.forEach((transfer: any) => {
            expect(transfer).toHaveProperty('id');
            expect(transfer).toHaveProperty('senderWalletId');
            expect(transfer).toHaveProperty('receiverWalletId');
            expect(transfer).toHaveProperty('amount');
          });
        });
    });

    it('should include both sent and received transfers', async () => {
      // Receiver makes a transfer back
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${receiverToken}`)
        .send({
          receiverWalletId: senderWalletId,
          amount: 50,
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should fail without authentication token', () => {
      return request(app.getHttpServer()).get('/transfers').expect(401);
    });
  });

  describe('Transfer - Concurrent Transfers (Integrity)', () => {
    it('should handle concurrent transfers correctly with locking', async () => {
      // Create a test user with funded wallet
      const testEmail = `concurrence${Date.now()}@example.com`;
      const testSignup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Concurrent Test User',
          email: testEmail,
          password: 'password123',
        });

      const testLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        });

      const testToken = testLogin.body.accessToken;

      // Create wallet with balance
      const testWallet = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      const testWalletId = testWallet.body.id;

      await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 2000,
        });

      // Attempt concurrent transfers
      const transfer1 = request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 1000,
        });

      const transfer2 = request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          receiverWalletId: receiverWalletId,
          amount: 1000,
        });

      // Both should succeed (total 2000)
      const results = await Promise.all([transfer1, transfer2]);

      expect(results[0].status).toBe(201);
      expect(results[1].status).toBe(201);

      // Verify final balance
      const finalBalance = await request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(parseFloat(finalBalance.body.balance)).toBe(0);
    });
  });
});
