import { AppDataSource } from '../data-source';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Transfer } from '../../transfer/entities/transfer.entity';
import {
  TransactionType,
  TransactionStatus,
} from '../../transaction/enums/transaction.enum';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const generateRandomBalance = (min: number = 1000, max: number = 50000) => {
  return (Math.random() * (max - min) + min).toFixed(2);
};

const generateRandomAmount = (min: number = 100, max: number = 5000) => {
  return (Math.random() * (max - min) + min).toFixed(2);
};

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✓ Database connection established');

    const userRepository = AppDataSource.getRepository(User);
    const walletRepository = AppDataSource.getRepository(Wallet);
    const transactionRepository = AppDataSource.getRepository(Transaction);
    const transferRepository = AppDataSource.getRepository(Transfer);

    // Clear existing data (optional - uncomment if needed)
    // await transferRepository.delete({});
    // await transactionRepository.delete({});
    // await walletRepository.delete({});
    // await userRepository.delete({});

    // Create test users
    const users = [];
    const testUsers = [
      {
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'password123',
      },
      {
        fullName: 'Bob Smith',
        email: 'bob@example.com',
        password: 'password123',
      },
      {
        fullName: 'Carol Williams',
        email: 'carol@example.com',
        password: 'password123',
      },
    ];

    console.log('🔐 Creating users...');
    for (const userData of testUsers) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = userRepository.create({
          fullName: userData.fullName,
          email: userData.email,
          password: hashedPassword,
        });
        const savedUser = await userRepository.save(user);
        users.push(savedUser);
        console.log(
          `  ✓ Created user: ${userData.fullName} (${userData.email})`,
        );
      } else {
        users.push(existingUser);
        console.log(`  ✓ User already exists: ${userData.email}`);
      }
    }

    // Create wallets for each user
    console.log('\n💰 Creating wallets...');
    const wallets = [];
    for (const user of users) {
      const existingWallet = await walletRepository.findOne({
        where: { userId: user.id },
      });

      if (!existingWallet) {
        const balance = generateRandomBalance();
        const wallet = walletRepository.create({
          userId: user.id,
          balance: parseFloat(balance),
        });
        const savedWallet = await walletRepository.save(wallet);
        wallets.push(savedWallet);
        console.log(`  ✓ Created wallet for ${user.fullName}: $${balance}`);
      } else {
        wallets.push(existingWallet);
        console.log(`  ✓ Wallet already exists for ${user.fullName}`);
      }
    }

    // Generate random transaction history
    console.log('\n📝 Creating transaction history...');
    const transactionTypes = [TransactionType.CREDIT, TransactionType.DEBIT];

    for (const wallet of wallets) {
      const transactionCount = Math.floor(Math.random() * 5) + 2; // 2-6 transactions

      for (let i = 0; i < transactionCount; i++) {
        const type =
          transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const amount = generateRandomAmount();
        const reference = uuidv4();

        const transaction = transactionRepository.create({
          walletId: wallet.id,
          type,
          amount,
          reference,
          description:
            type === TransactionType.CREDIT
              ? `Deposit #${i + 1}`
              : `Withdrawal #${i + 1}`,
          status: TransactionStatus.COMPLETED,
        });

        await transactionRepository.save(transaction);
      }

      console.log(
        `  ✓ Created ${transactionCount} transactions for wallet ${wallet.id}`,
      );
    }

    // Generate transfer between users
    console.log('\n🔄 Creating transfers...');
    if (wallets.length >= 2) {
      for (let i = 0; i < 3; i++) {
        const senderWallet =
          wallets[Math.floor(Math.random() * wallets.length)];
        let receiverWallet =
          wallets[Math.floor(Math.random() * wallets.length)];

        // Ensure sender and receiver are different
        while (receiverWallet.id === senderWallet.id) {
          receiverWallet = wallets[Math.floor(Math.random() * wallets.length)];
        }

        const amount = generateRandomAmount(100, 2000);
        const reference = uuidv4();

        // Create transfer record
        const transfer = transferRepository.create({
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
          amount,
          reference,
          status: TransactionStatus.COMPLETED,
        });
        await transferRepository.save(transfer);

        // Create paired transaction records
        const senderTx = transactionRepository.create({
          walletId: senderWallet.id,
          type: TransactionType.TRANSFER_OUT,
          amount,
          reference,
          description: `Transfer to wallet ${receiverWallet.id}`,
          status: TransactionStatus.COMPLETED,
        });

        const receiverTx = transactionRepository.create({
          walletId: receiverWallet.id,
          type: TransactionType.TRANSFER_IN,
          amount,
          reference,
          description: `Transfer from wallet ${senderWallet.id}`,
          status: TransactionStatus.COMPLETED,
        });

        await transactionRepository.save([senderTx, receiverTx]);
        console.log(`  ✓ Transfer #${i + 1}: $${amount} from wallet to wallet`);
      }
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Test Credentials:');
    testUsers.forEach((user) => {
      console.log(`  Email: ${user.email}, Password: ${user.password}`);
    });
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
