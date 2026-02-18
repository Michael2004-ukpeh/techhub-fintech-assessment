import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Transaction Module (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let walletId: string;

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

    // Create user
    const userEmail = `transactiontest${Date.now()}@example.com`;
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        fullName: 'Transaction Test User',
        email: userEmail,
        password: 'password123',
      });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userEmail,
        password: 'password123',
      });

    authToken = loginRes.body.accessToken;

    // Create wallet
    const walletRes = await request(app.getHttpServer())
      .post('/wallets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    walletId = walletRes.body.id;

    // Fund wallet to create transactions
    await request(app.getHttpServer())
      .post('/wallets/fund')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 5000,
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Transaction - Get Wallet Transactions', () => {
    it('should retrieve all transactions for a wallet', () => {
      return request(app.getHttpServer())
        .get(`/transactions/wallet/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);

          res.body.forEach((tx: any) => {
            expect(tx).toHaveProperty('id');
            expect(tx).toHaveProperty('walletId', walletId);
            expect(tx).toHaveProperty('type');
            expect(tx).toHaveProperty('amount');
            expect(tx).toHaveProperty('status');
            expect(tx).toHaveProperty('reference');
          });
        });
    });

    it('should return empty array for wallet with no transactions', async () => {
      // Create new wallet without funding
      const newWalletRes = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      // This should fail as user can only have one wallet
      // So we create new user
      const newEmail = `notx${Date.now()}@example.com`;
      const newLogin = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'No Tx User',
          email: newEmail,
          password: 'password123',
        });

      const newTokenRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newEmail,
          password: 'password123',
        });

      const newToken = newTokenRes.body.accessToken;

      const emptyWalletRes = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${newToken}`)
        .send({});

      const emptyWalletId = emptyWalletRes.body.id;

      return request(app.getHttpServer())
        .get(`/transactions/wallet/${emptyWalletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBe(0);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/transactions/wallet/${walletId}`)
        .expect(401);
    });

    it('should return transactions in descending order by date', () => {
      return request(app.getHttpServer())
        .get(`/transactions/wallet/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);

          for (let i = 0; i < res.body.length - 1; i++) {
            const date1 = new Date(res.body[i].createdAt).getTime();
            const date2 = new Date(res.body[i + 1].createdAt).getTime();
            expect(date1).toBeGreaterThanOrEqual(date2);
          }
        });
    });
  });

  describe('Transaction - Get Transaction by ID', () => {
    let transactionId: string;

    beforeAll(async () => {
      // Get a transaction
      const txRes = await request(app.getHttpServer())
        .get(`/transactions/wallet/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (txRes.body.length > 0) {
        transactionId = txRes.body[0].id;
      }
    });

    it('should retrieve a specific transaction by ID', () => {
      return request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', transactionId);
          expect(res.body).toHaveProperty('walletId');
          expect(res.body).toHaveProperty('type');
          expect(res.body).toHaveProperty('amount');
          expect(res.body).toHaveProperty('reference');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should fail with non-existent transaction ID', () => {
      return request(app.getHttpServer())
        .get('/transactions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(401);
    });
  });

  describe('Transaction - Types and Status', () => {
    it('should have correct transaction type for credit operations', async () => {
      const fundRes = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          description: 'Test credit',
        })
        .expect(200);

      const txRes = await request(app.getHttpServer())
        .get(`/transactions/reference/${fundRes.body.reference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(txRes.body[0].type).toBe('credit');
      expect(txRes.body[0].status).toBe('completed');
    });

    it('should have correct transaction type for debit operations', async () => {
      const withdrawRes = await request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          description: 'Test debit',
        })
        .expect(200);

      const txRes = await request(app.getHttpServer())
        .get(`/transactions/reference/${withdrawRes.body.reference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(txRes.body[0].type).toBe('debit');
      expect(txRes.body[0].status).toBe('completed');
    });

    it('should have correct transaction types for transfers', async () => {
      // Create another user
      const receiverEmail = `receiver${Date.now()}@example.com`;
      const receiverLogin = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Receiver',
          email: receiverEmail,
          password: 'password123',
        });

      const receiverTokenRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: receiverEmail,
          password: 'password123',
        });

      const receiverToken = receiverTokenRes.body.accessToken;

      const receiverWalletRes = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${receiverToken}`)
        .send({});

      const receiverWalletId = receiverWalletRes.body.id;

      // Perform transfer
      const transferRes = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receiverWalletId,
          amount: 100,
          description: 'Test transfer',
        })
        .expect(201);

      const txRes = await request(app.getHttpServer())
        .get(`/transactions/reference/${transferRes.body.reference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(txRes.body).toBeInstanceOf(Array);
      expect(txRes.body.length).toBe(2);

      const types = txRes.body.map((t: any) => t.type).sort();
      expect(types).toContain('transfer_in');
      expect(types).toContain('transfer_out');
    });
  });

  describe('Transaction - Reference Lookup', () => {
    it('should retrieve all transactions with same reference', async () => {
      // Create another user for transfer
      const email2 = `reftest${Date.now()}@example.com`;
      const signup2 = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          fullName: 'Ref Test User',
          email: email2,
          password: 'password123',
        });

      const login2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: email2,
          password: 'password123',
        });

      const token2 = login2.body.accessToken;

      const wallet2 = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${token2}`)
        .send({});

      const walletId2 = wallet2.body.id;

      // Make transfer
      const transferRes = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receiverWalletId: walletId2,
          amount: 200,
        })
        .expect(201);

      const reference = transferRes.body.reference;

      // Get transactions by reference
      const txRes = await request(app.getHttpServer())
        .get(`/transactions/reference/${reference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Both sender and receiver transactions should have same reference
      expect(txRes.body).toBeInstanceOf(Array);
      expect(txRes.body.length).toBe(2);
      txRes.body.forEach((tx: any) => {
        expect(tx.reference).toBe(reference);
      });
    });
  });
});
